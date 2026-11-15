import type { Point, Rect } from '../src/index';

export const center = (rect: Rect): Point => ({
  x: rect.x + rect.width / 2,
  y: rect.y + rect.height / 2,
});

export const intersects = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** The smallest rect around `rects`, which must not be empty. */
export const union = (rects: Rect[]): Rect => {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  return {
    x,
    y,
    width: Math.max(...rects.map((r) => r.x + r.width)) - x,
    height: Math.max(...rects.map((r) => r.y + r.height)) - y,
  };
};

/**
 * Where `element` sits in the world, from its box inside canvas node `node`, which sits at
 * `rect`: measured on screen, so it holds at any zoom and in either engine.
 */
export const worldRectOf = (node: Element, rect: Rect, element: Element): Rect => {
  const box = node.getBoundingClientRect();
  const r = element.getBoundingClientRect();
  const scale = rect.width / (box.width || 1);
  return {
    x: rect.x + (r.x - box.x) * scale,
    y: rect.y + (r.y - box.y) * scale,
    width: r.width * scale,
    height: r.height * scale,
  };
};
