import { intersects, sameRect, unionOf, type Point, type Rect } from './rect';
import type { GpuCanvas } from './types';

/**
 * A layer is what one click selects: one element, or several that act as one, such as a React
 * component that renders a fragment. Its first element is its identity.
 */
export type Layer = Element[];

/**
 * What a click can select, from the element under the pointer. `'node'`: whole nodes only.
 * `'element'`: every element down to the one under the pointer. A function returns the layers
 * inside the node that hold `element`, outermost first; the node itself always comes before them.
 */
export type EditorPick =
  'node' | 'element' | ((element: Element, canvas: GpuCanvas) => Array<Element | Element[]>);

export const sameLayer = (a: Layer | null | undefined, b: Layer | null | undefined) =>
  !!a && !!b && a[0] === b[0];

export const layerIn = (layer: Layer, list: readonly Layer[]) =>
  list.some((other) => sameLayer(layer, other));

/** The union of a layer's elements in world units, or null when none is on the canvas. */
export const layerRect = (canvas: GpuCanvas, layer: Layer): Rect | null =>
  unionOf(layer.map((element) => canvas.getElementRect(element)));

/** Every depth a click can reach through the elements and pick of one canvas. */
export function createLayers(canvas: GpuCanvas, pick: EditorPick) {
  /** The layers holding `element`, outermost first, starting with its node. */
  const chainOf = (element: Element): Layer[] => {
    const node = canvas.getNodeOf(element);
    if (!node) return [];
    let inner: Layer[];
    if (pick === 'node') inner = [];
    else if (pick === 'element') {
      inner = [];
      for (let at: Element | null = element; at && at !== node; at = at.parentElement) {
        inner.unshift([at]);
      }
    } else {
      inner = pick(element, canvas)
        .map((layer) => [layer].flat())
        .filter((layer) => layer.length > 0 && layer[0] !== node);
    }
    // A wrapper the size of the layer around it is a click that seems to do nothing: skip it.
    const chain: Layer[] = [[node]];
    let previous = canvas.getNodeRect(node);
    for (const layer of inner) {
      const rect = layerRect(canvas, layer);
      if (sameRect(rect, previous)) continue;
      chain.push(layer);
      previous = rect;
    }
    return chain;
  };

  const chainAt = (world: Point): Layer[] => {
    const element = canvas.getElementAt(world);
    return element ? chainOf(element) : [];
  };

  /** The layers one level inside `parent`, in document order. */
  const childrenOf = (parent: Layer): Layer[] => {
    if (pick === 'node') return [];
    const children: Layer[] = [];
    if (pick === 'element') {
      // Element children, looking through wrappers the size of their parent.
      const visit = (element: Element, outer: Rect | null) => {
        for (const child of element.children) {
          const rect = canvas.getElementRect(child);
          if (!rect || rect.width <= 0 || rect.height <= 0) continue;
          if (sameRect(rect, outer)) visit(child, outer);
          else children.push([child]);
        }
      };
      for (const root of parent) visit(root, layerRect(canvas, parent));
      return children;
    }
    // Any other pick: the next layer on the chain of every element inside, skipping what an
    // earlier child already holds.
    for (const root of parent) {
      for (const element of root.querySelectorAll('*')) {
        if (children.some((child) => child.some((held) => held.contains(element)))) continue;
        const chain = chainOf(element);
        const index = chain.findIndex((layer) => sameLayer(layer, parent));
        const child = index >= 0 ? chain[index + 1] : undefined;
        if (child && !layerIn(child, children)) children.push(child);
      }
    }
    return children;
  };

  /** Layers at the top level (nodes) or inside `scope` that overlap a world rect. */
  const layersIn = (scope: Layer | null, rect: Rect): Layer[] =>
    scope
      ? childrenOf(scope).filter((layer) => {
          const box = layerRect(canvas, layer);
          return !!box && intersects(box, rect);
        })
      : canvas.getNodesIn(rect).map((node) => [node]);

  return { chainOf, chainAt, childrenOf, layersIn };
}
