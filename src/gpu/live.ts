import type { Camera } from '../core/camera';
import { screenToWorld } from '../core/camera';
import { elementInNode } from '../core/elements';
import { nodeOf, smallOnScreen, type GpuNode } from './node';
import { pointIn } from '../core/input';
import type { Page } from './page';
import { intersects, type Point, type Rect } from '../core/rect';

/** Events that use a node, and how long after one its transitions are followed frame by frame. */
const USE_EVENTS = ['click', 'input', 'change', 'keydown'] as const;
const USED_MS = 1000;
/** A node that stops being live stays rasterizable this long, so hover-out transitions finish. */
const LINGER_MS = 300;

/**
 * Chrome 157 ships `getElementImageDefaultSize` together with hit testing at the canvas
 * transform set by `updateElementGeometry`; Chrome 156 has neither.
 */
const CANVAS_TRANSFORM_HIT_TESTS =
  typeof HTMLCanvasElement !== 'undefined' &&
  'getElementImageDefaultSize' in HTMLCanvasElement.prototype;

/** Where effects see the pointer when there is none. */
export const FAR_AWAY: Point = { x: -1e7, y: -1e7 };

export interface LiveOptions {
  canvas: HTMLCanvasElement;
  surface: HTMLElement;
  nodes: Map<HTMLElement, GpuNode>;
  camera: () => Camera;
  view: () => Rect;
  nodeAt: (point: Point) => GpuNode | null;
  frameNumber: () => number;
  /** Canvas pixels per CSS pixel. */
  canvasDpr: () => number;
  schedule: () => void;
  /** Whether anything keeps a page drawable: held nodes, waiting snapshots. */
  isPinned: (page: Page) => boolean;
  /** Runs on every press. */
  onPress: () => void;
}

/**
 * The nodes that must stay real DOM, drawable and redrawn on every paint: the one under the
 * pointer (the only node that receives pointer events), the focused one, and ones finishing a
 * transition after being used.
 *
 * Hit testing: only drawables registered with `updateElementGeometry` are hit tested. Only the
 * page under the pointer is registered, and its canvas transform (Chrome 157) or CSS transform
 * (Chrome 156) puts the node under the pointer exactly where the GPU drew it.
 */
export class Live {
  /** The node under the pointer. */
  current: GpuNode | null = null;
  /** The pointer over the surface, in surface pixels. */
  pointer: Point | null = null;
  /** Where the last press landed, in world units, and when: effects such as shockwaves use it. */
  press: Point = FAR_AWAY;
  pressedAt = -Infinity;
  private positioned = false;
  /** The node whose page is lined up under its drawing: the live one, else the focused one. */
  private anchored: GpuNode | null = null;
  private lingering: GpuNode | null = null;
  private lingerTimer = 0;
  private focused: GpuNode | null = null;
  /** Readable nodes in view with CSS transitions running, and when the last one ends. */
  private readonly transitioning = new Map<GpuNode, number>();
  private readonly usedAt = new WeakMap<GpuNode, number>();
  /**
   * Touch and pen press without hovering first, so the node under them is not hit-testable yet and
   * the tap lands on the canvas or its page. The press makes the node live, and a click that did
   * not reach inside it is handed to the element under the finger.
   */
  private tapped = false;
  private destroyed = false;

  constructor(private readonly o: LiveOptions) {
    const { canvas, surface } = o;
    surface.addEventListener('pointermove', this.onPointerMove);
    surface.addEventListener('pointerleave', this.onPointerLeave);
    surface.addEventListener('pointerdown', this.onPointerDown, true);
    // Bubble phase: an editor that takes the press stops the click before it gets here.
    surface.addEventListener('click', this.onClick);
    canvas.addEventListener('focusin', this.onFocusIn);
    canvas.addEventListener('focusout', this.onFocusOut);
    for (const type of USE_EVENTS) canvas.addEventListener(type, this.onUse, true);
    canvas.addEventListener('transitionrun', this.onTransitionRun);
  }

  /** Whether a held node keeps `page` drawable. */
  holds(page: Page) {
    return this.held().some((node) => node?.page === page);
  }

  /** Nodes kept drawable and redrawn on every paint: under the pointer, focused, transitioning. */
  held() {
    return [this.current, this.lingering, this.focused, ...this.transitioning.keys()];
  }

  /** Moves the hit-test target to `node`: its page is registered and positioned under it. */
  set(node: GpuNode | null) {
    if (node === this.current) return;
    const previous = this.current;
    this.current = node;
    // Back before it was let go: it is held again, not redrawn as it rests.
    if (node && node === this.lingering) {
      clearTimeout(this.lingerTimer);
      this.lingering = null;
    }
    if (previous) {
      previous.element.style.pointerEvents = 'none';
      clearTimeout(this.lingerTimer);
      const earlier = this.lingering;
      this.lingering = previous;
      if (earlier && earlier !== previous) this.letGo(earlier);
      this.lingerTimer = window.setTimeout(() => {
        const last = this.lingering;
        if (!last) return;
        this.lingering = null;
        this.letGo(last);
      }, LINGER_MS);
      this.unpin(previous.page);
    }
    this.anchor();
  }

  /**
   * Lines up the page of the live node, or of the focused one when no node is live, with where
   * the GPU draws it. Its elements then report their drawn position from `getBoundingClientRect`,
   * so a popup a component opens in `document.body` lands next to the button that opened it, and
   * stays there as the camera moves while the button keeps focus.
   */
  private anchor() {
    const node = this.current ?? this.focused;
    this.anchored = node;
    this.positioned = false;
    if (!node) return;
    const { page } = node;
    page.setDrawable(true, this.o.frameNumber());
    if (!page.registered) {
      this.o.canvas.updateElementGeometry(page.element, {});
      page.registered = true;
    }
    this.position();
    this.o.schedule();
  }

  /** The camera moved: no node is live until it rests, and the focused one is lined up again. */
  cameraMoved() {
    if (this.current) this.set(null);
    else this.anchor();
  }

  /** Makes the topmost node under the last pointer position live. */
  pick() {
    if (!this.pointer) return this.set(null);
    this.set(this.o.nodeAt(screenToWorld(this.o.camera(), this.pointer)));
  }

  /**
   * Puts the live page's hit area under the live node. Chrome 157 hit tests at the canvas
   * transform given to `updateElementGeometry`, in CSS pixels. Chrome 156 ignores it and hit
   * tests at the CSS box, so the page gets the CSS transform `getElementTransform` derives from
   * the draw matrix, which maps the default-size snapshot (CSS px x dpr) to canvas pixels. A page
   * promoted this frame has no paint record there yet, so it is positioned on the next frame.
   */
  position() {
    const live = this.anchored;
    if (!live || this.positioned) return;
    const { canvas } = this.o;
    const camera = this.o.camera();
    const { zoom } = camera;
    const x = (live.rect.x - camera.x - live.pageX) * zoom;
    const y = (live.rect.y - camera.y - live.pageY) * zoom;
    try {
      if (CANVAS_TRANSFORM_HIT_TESTS) {
        canvas.updateElementGeometry(live.page.element, {
          canvasTransform: new DOMMatrix([zoom, 0, 0, zoom, x, y]),
        });
      } else {
        const dpr = this.o.canvasDpr();
        const drawn = new DOMMatrix([zoom, 0, 0, zoom, x * dpr, y * dpr]);
        live.page.element.style.transform = canvas
          .getElementTransform(live.page.element, drawn)
          .toString();
      }
      // Only the node under the pointer takes it: wheeling over a focused node still pans.
      if (live === this.current) live.element.style.pointerEvents = 'auto';
      this.positioned = true;
    } catch {
      this.o.schedule();
    }
  }

  /** Puts the hit area back under `node` after it moved, when it is the live node. */
  moved(node: GpuNode) {
    if (node !== this.anchored) return;
    this.positioned = false;
    this.position();
  }

  /** Releases a page from hit testing once nothing pins it; it parks after its next raster. */
  unpin(page: Page) {
    if (this.o.isPinned(page)) return;
    if (page.registered) this.o.canvas.clearElementGeometry(page.element);
    page.registered = false;
    page.element.style.transform = '';
    this.o.schedule();
  }

  /** Stops holding a removed node. */
  forget(node: GpuNode) {
    if (this.current === node) this.set(null);
    if (this.lingering === node) this.lingering = null;
    if (this.focused === node) this.focused = null;
    this.transitioning.delete(node);
    if (this.anchored === node) this.anchor();
  }

  destroy() {
    const { canvas, surface } = this.o;
    this.destroyed = true;
    clearTimeout(this.lingerTimer);
    surface.removeEventListener('pointermove', this.onPointerMove);
    surface.removeEventListener('pointerleave', this.onPointerLeave);
    surface.removeEventListener('pointerdown', this.onPointerDown, true);
    surface.removeEventListener('click', this.onClick);
    canvas.removeEventListener('focusin', this.onFocusIn);
    canvas.removeEventListener('focusout', this.onFocusOut);
    canvas.removeEventListener('transitionrun', this.onTransitionRun);
    for (const type of USE_EVENTS) canvas.removeEventListener(type, this.onUse, true);
  }

  /** A node no longer held: redrawn once as it rests, its page released. */
  private letGo(node: GpuNode) {
    node.dirty = true;
    this.unpin(node.page);
  }

  private nodeOf(target: EventTarget | null) {
    return nodeOf(this.o.nodes, target as HTMLElement);
  }

  private onPointerMove = (event: PointerEvent) => {
    this.pointer = pointIn(this.o.canvas, event);
    // A press in progress belongs to the live node (text selection, sliders) or to a pan.
    if (event.buttons === 0) this.pick();
  };

  private onPointerLeave = () => {
    this.pointer = null;
    this.set(null);
  };

  private onPointerDown = (event: PointerEvent) => {
    const at = pointIn(this.o.canvas, event);
    this.press = screenToWorld(this.o.camera(), at);
    this.pressedAt = performance.now();
    if (event.pointerType !== 'mouse') {
      this.pointer = at;
      this.pick();
      this.tapped = true;
    }
    this.o.onPress();
  };

  private onClick = (event: MouseEvent) => {
    if (!this.tapped) return;
    this.tapped = false;
    const point = screenToWorld(this.o.camera(), pointIn(this.o.canvas, event));
    const top = this.o.nodeAt(point);
    if (!top || top.element.contains(event.target as Element)) return;
    // An icon's SVG is not focusable or clickable the HTML way; its HTML parent is.
    let target: Element | null = elementInNode(top.element, top.rect, point);
    while (target && !(target instanceof HTMLElement)) target = target.parentElement;
    if (!(target instanceof HTMLElement)) return;
    target.focus({ preventScroll: true });
    target.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        composed: true,
        view: window,
        clientX: event.clientX,
        clientY: event.clientY,
      }),
    );
  };

  private onFocusIn = (event: FocusEvent) => {
    const node = this.nodeOf(event.target) ?? null;
    if (node === this.focused) return;
    const previous = this.focused;
    this.focused = node;
    if (previous) this.letGo(previous);
    if (node) {
      node.page.setDrawable(true, this.o.frameNumber());
      node.dirty = true;
      this.o.schedule();
    }
    if (!this.current) this.anchor();
  };

  private onFocusOut = (event: FocusEvent) => {
    if (event.relatedTarget && this.o.canvas.contains(event.relatedTarget as Node)) return;
    const previous = this.focused;
    this.focused = null;
    if (previous) this.letGo(previous);
    if (!this.current) this.anchor();
  };

  // A transition paints without touching the DOM, so a click (from a person or from script)
  // would leave a half-finished frame. A readable node in view that was just used keeps its page
  // pinned and redrawn on every paint until its transitions are over. Content that animates on
  // its own, like a looping indicator, keeps the cheaper refresh on mutations: pinning it would
  // repaint its whole page every frame. A deadline ends the pin, transitions in parked pages
  // never fire transitionend.
  private onUse = (event: Event) => {
    const node = this.nodeOf(event.target);
    if (node) this.usedAt.set(node, performance.now());
  };

  private onTransitionRun = (event: Event) => {
    const node = this.nodeOf(event.target);
    const now = performance.now();
    if (!node || now - (this.usedAt.get(node) ?? -Infinity) > USED_MS) return;
    if (!intersects(node.rect, this.o.view())) return;
    if (smallOnScreen(node, this.o.camera().zoom)) return;
    // Two frames past the end, so the transition's last frame is drawn.
    const ms = transitionMs(event.target as Element) + 32;
    const end = now + ms;
    if ((this.transitioning.get(node) ?? 0) >= end) return;
    this.transitioning.set(node, end);
    node.dirty = true;
    this.o.schedule();
    setTimeout(() => {
      if (this.destroyed || this.transitioning.get(node) !== end) return;
      this.transitioning.delete(node);
      this.letGo(node);
      this.o.schedule();
    }, ms);
  };
}

/** How long an element's transitions run, delays included, capped at a second. */
const transitionMs = (element: Element) => {
  const style = getComputedStyle(element);
  const seconds = (list: string) => list.split(',').map((value) => parseFloat(value) || 0);
  const durations = seconds(style.transitionDuration);
  const delays = seconds(style.transitionDelay);
  const longest = Math.max(...durations.map((d, i) => d + (delays[i % delays.length] ?? 0)));
  return Math.min(1000, longest * 1000);
};
