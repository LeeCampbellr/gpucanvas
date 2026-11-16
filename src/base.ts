import { fitCamera, screenToWorld, viewOf, worldToScreen, type Camera } from './camera';
import { elementInNode, nodeOfElement } from './elements';
import { bindCameraInput, markSurface } from './input';
import { containsPoint, intersects, unionOf, type Point, type Rect } from './rect';
import { DEFAULT_CAMERA, type GpuCanvas, type GpuCanvasOptions } from './types';

export interface BaseNode {
  element: HTMLElement;
  rect: Rect;
}

/** Styles every node gets: containment keeps one node's changes from relaying out the others. */
const styleNode = (element: HTMLElement) =>
  Object.assign(element.style, { boxSizing: 'border-box', contain: 'strict', overflow: 'hidden' });

/** How a backend shows a node: called once the base has checked the element. */
export interface NodeHooks<N extends BaseNode> {
  /** Shows a new node; `element` already has the node styles. */
  add(element: HTMLElement, rect: Rect): N;
  /** Moves or resizes a node; `node.rect` still holds its old rect. */
  update(node: N, rect: Rect): void;
  /** Stops showing a node, before the base forgets it and removes its element. */
  remove(node: N): void;
  /** Applies the node map's back-to-front order without moving mounted DOM. */
  order(): void;
}

/**
 * What both backends share: the surface in `host`, the nodes and where they sit, and the camera
 * with its input. `onCamera` runs on every camera change, before `options.onCameraChange`.
 * Adding, updating and removing nodes goes through the base, which keeps the node map and calls
 * the backend's `hooks`.
 */
export function createBase<N extends BaseNode>(
  host: HTMLElement,
  options: GpuCanvasOptions,
  onCamera: (camera: Camera) => void,
  hooks: NodeHooks<N>,
) {
  const surface = document.createElement('div');
  markSurface(surface);
  Object.assign(surface.style, {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    touchAction: 'none',
  });
  host.append(surface);

  const nodes = new Map<HTMLElement, N>();
  let camera = options.camera ?? DEFAULT_CAMERA;
  const setCamera = (next: Camera) => {
    camera = next;
    onCamera(camera);
    options.onCameraChange?.(camera);
  };
  const unbindInput =
    options.input === false ? () => {} : bindCameraInput(surface, () => camera, setCamera);

  /** The topmost node at a world point follows the current back-to-front map order. */
  const nodeAt = (point: Point): N | null => {
    let top: N | null = null;
    for (const node of nodes.values()) if (containsPoint(node.rect, point)) top = node;
    return top;
  };

  const api = {
    surface,
    addNode(element, rect) {
      if (nodes.has(element)) return api.updateNode(element, rect);
      styleNode(element);
      nodes.set(element, hooks.add(element, rect));
    },
    updateNode(element, rect) {
      const node = nodes.get(element);
      if (node) hooks.update(node, rect);
    },
    removeNode(element) {
      const node = nodes.get(element);
      if (!node) return;
      hooks.remove(node);
      nodes.delete(element);
      element.remove();
      hooks.order();
    },
    setNodeOrder(elements) {
      const ordered = [...elements].map((element) => {
        const node = nodes.get(element);
        if (!node) throw new Error('setNodeOrder: element is not a canvas node');
        return node;
      });
      for (const node of ordered) {
        nodes.delete(node.element);
        nodes.set(node.element, node);
      }
      hooks.order();
    },
    getNodeRect: (element) => {
      const node = nodes.get(element);
      return node ? { ...node.rect } : null;
    },
    getNodesIn(rect) {
      const hits: HTMLElement[] = [];
      for (const node of nodes.values()) if (intersects(node.rect, rect)) hits.push(node.element);
      return hits;
    },
    getNodeOf: (element) => nodeOfElement(nodes, element),
    getElementAt(point) {
      const top = nodeAt(point);
      return top ? elementInNode(top.element, top.rect, point) : null;
    },
    getCamera: () => camera,
    setCamera,
    screenToWorld: (point) => screenToWorld(camera, point),
    worldToScreen: (point) => worldToScreen(camera, point),
    fit(padding) {
      const bounds = unionOf([...nodes.values()].map((node) => node.rect));
      if (bounds) setCamera(fitCamera(bounds, surface.clientWidth, surface.clientHeight, padding));
    },
  } satisfies Partial<GpuCanvas>;

  return {
    surface,
    nodes,
    camera: () => camera,
    view: () => viewOf(api),
    nodeAt,
    api,
    destroy() {
      unbindInput();
      surface.remove();
    },
  };
}
