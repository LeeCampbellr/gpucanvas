import { rectInNode } from './elements';
import type { Camera } from './camera';
import type { Rect } from './rect';

/** Elements Tab can stop at, before the disabled and hidden ones are filtered out. */
const TABBABLE = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'iframe',
  'summary',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',');

/** Screen pixels kept between a field Tab moved to and the edge of the view. */
const REVEAL_MARGIN = 24;

const tabbables = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (element) =>
      (element.tabIndex >= 0 || (element.isContentEditable && !element.hasAttribute('tabindex'))) &&
      !(element as HTMLButtonElement).disabled &&
      element.checkVisibility({ visibilityProperty: true }),
  );

const isAfter = (a: Node, b: Node) =>
  !!(b.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING);

export interface TabOrderOptions<N extends { element: HTMLElement; rect: Rect }> {
  surface: HTMLElement;
  /** Nodes in the order Tab visits them. */
  nodes: Map<HTMLElement, N>;
  nodeOf: (element: Element) => N | null;
  camera: () => Camera;
  setCamera: (camera: Camera) => void;
  /** Makes a node's contents focusable: the GPU backend shows its parked page. */
  show?: (node: N) => void;
}

/**
 * Tab and Shift+Tab across nodes. The browser can't do it: it follows DOM order, which is not the
 * order nodes were added, it skips fields on parked pages, and it scrolls the surface to reach
 * a field instead of moving the camera. So when focus is in a node, Tab goes to the next field in
 * that node, then to the first field of the next node in the order nodes were added, and the
 * camera pans just enough to show it. Past the last field Tab leaves the canvas, and Tab from
 * outside comes in at the first field (Shift+Tab at the last).
 */
export function bindTabOrder<N extends { element: HTMLElement; rect: Rect }>(
  o: TabOrderOptions<N>,
): () => void {
  const { surface } = o;
  // Tab stops at the two ends of the canvas: coming in, they hand focus to the first or last
  // field; going out, focus jumps to one and the browser's own Tab carries on from there.
  const ends = [document.createElement('span'), document.createElement('span')] as const;
  for (const end of ends) {
    end.tabIndex = 0;
    Object.assign(end.style, { position: 'absolute', outline: 'none' });
  }
  const [start, finish] = ends;
  surface.prepend(start);
  // After the layers a backend adds to the surface once the base is built.
  queueMicrotask(() => surface.append(finish));
  let leaving = false;

  /** The field Tab lands on from node index `from`, walking `step` through the nodes. */
  const fieldBeyond = (from: number, step: 1 | -1) => {
    const order = [...o.nodes.values()];
    for (let index = from + step; index >= 0 && index < order.length; index += step) {
      const node = order[index];
      o.show?.(node);
      const fields = tabbables(node.element);
      if (fields.length) return { node, field: step > 0 ? fields[0] : fields.at(-1)! };
    }
    return null;
  };

  const focusField = (node: N, field: HTMLElement) => {
    field.focus({ preventScroll: true });
    const camera = o.camera();
    const rect = rectInNode(node.element, node.rect, field);
    const margin = REVEAL_MARGIN / camera.zoom;
    const width = surface.clientWidth / camera.zoom;
    const height = surface.clientHeight / camera.zoom;
    const shift = (at: number, size: number, viewAt: number, viewSize: number) => {
      if (size + 2 * margin > viewSize || at - margin < viewAt) return at - margin - viewAt;
      if (at + size + margin > viewAt + viewSize) return at + size + margin - viewAt - viewSize;
      return 0;
    };
    const dx = shift(rect.x, rect.width, camera.x, width);
    const dy = shift(rect.y, rect.height, camera.y, height);
    if (dx || dy) o.setCamera({ ...camera, x: camera.x + dx, y: camera.y + dy });
  };

  const leave = (end: HTMLElement) => {
    // The browser's Tab moves on from the focused element after this handler: from an end, that
    // is out of the canvas.
    if (end === finish) surface.append(finish);
    leaving = true;
    end.focus({ preventScroll: true });
    leaving = false;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (
      event.key !== 'Tab' ||
      event.defaultPrevented ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey
    )
      return;
    const active = document.activeElement;
    const node = active && o.nodeOf(active);
    if (!node) return;
    const step = event.shiftKey ? -1 : 1;
    const fields = tabbables(node.element);
    const field =
      step > 0
        ? fields.find((candidate) => isAfter(candidate, active))
        : fields.reverse().find((candidate) => isAfter(active, candidate));
    if (field) {
      event.preventDefault();
      return focusField(node, field);
    }
    const next = fieldBeyond([...o.nodes.values()].indexOf(node), step);
    if (next) {
      event.preventDefault();
      return focusField(next.node, next.field);
    }
    leave(step > 0 ? finish : start);
  };

  const onEndFocus = (event: FocusEvent) => {
    if (leaving) return;
    const coming = event.relatedTarget;
    if (coming instanceof Node && surface.contains(coming)) return;
    const next = event.target === start ? fieldBeyond(-1, 1) : fieldBeyond(o.nodes.size, -1);
    if (next) focusField(next.node, next.field);
  };

  // Focus and scrollIntoView scroll every ancestor that can: the surface and the layers between
  // it and the nodes must stay where they are, or the canvas shifts out from under the camera.
  const onScroll = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element) || o.nodeOf(target)) return;
    target.scrollTop = 0;
    target.scrollLeft = 0;
  };

  surface.addEventListener('keydown', onKeyDown);
  surface.addEventListener('scroll', onScroll, true);
  for (const end of ends) end.addEventListener('focus', onEndFocus);
  return () => {
    surface.removeEventListener('keydown', onKeyDown);
    surface.removeEventListener('scroll', onScroll, true);
    for (const end of ends) end.remove();
  };
}
