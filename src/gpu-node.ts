import type { Atlas, AtlasSlot } from './atlas';
import { nodeOfElement } from './elements';
import type { Page } from './page';
import type { Rect } from './rect';

/** A node on the GPU backend: where it sits, and what of it the atlas holds. */
export interface GpuNode {
  element: HTMLElement;
  rect: Rect;
  page: Page;
  /** The node's position on its page, CSS pixels. */
  pageX: number;
  pageY: number;
  slot: AtlasSlot | null;
  /** Texels per CSS pixel the slot was rasterized at. */
  slotScale: number;
  /**
   * A THUMBNAIL_SCALE snapshot in the atlas's pinned layer. It is never evicted, so zoomed out
   * the node needs nothing else, and closer in it stands in while a sharper snapshot is drawn.
   */
  thumb: AtlasSlot | null;
  /** The node changed since its thumbnail was drawn. */
  thumbStale: boolean;
  /** When the thumbnail was last drawn, from performance.now(). */
  thumbAt: number;
  /** What the last composite showed for this node: 0 nothing, 1 placeholder, 2 snapshot, 3 sharp. */
  shown: number;
  shownFrame: number;
  /** Content changed since the slot was rasterized. */
  dirty: boolean;
  /**
   * Zoomed in past MAX_RASTER_SCALE the whole snapshot is only a backdrop: the part in view is
   * drawn sharp as tiles, filled center first within the frame budget. While content animates,
   * one half-resolution preview of the view stands in, since redrawing every tile each frame
   * would cost too much.
   */
  tiles: Tile[];
  preview: AtlasSlot | null;
  previewRect: Rect | null;
  previewScale: number;
  /** Scratch: this frame's preview rect and scale, when one is needed. */
  previewTarget: Rect | null;
  previewTargetScale: number;
  /** Last time the node's content changed, from performance.now(). */
  changedAt: number;
  /** Last time a change of the node's content reached the atlas. */
  refreshedAt: number;
  /**
   * The whole snapshot predates a change that only the preview and tiles show so far. It is
   * redrawn once the node is no longer zoomed in that far.
   */
  wholeStale: boolean;
  /** Alone on its page, so zoomed-in snapshots rasterize only this node. */
  solo: boolean;
  /** Scratch values for the current frame's plan. */
  targetScale: number;
  priority: number;
}

/** A sharp piece of a zoomed-in node, `rect` in world units. */
export interface Tile {
  slot: AtlasSlot;
  rect: Rect;
  scale: number;
  column: number;
  row: number;
  /** Shows content from before the node's last change; stays until a fresh tile replaces it. */
  stale: boolean;
}

/**
 * Thumbnails: a 1440 px wide screen is 90 texels across, as sharp as it gets on a 2x display at
 * the 3% zoom of a 5,000 node overview. Five thousand of them fit the pinned layer.
 */
export const THUMBNAIL_SCALE = 1 / 16;

/**
 * Live content (spinners, clocks, video) changes every frame. A node that small on screen shows
 * no difference between 60 redraws a second and a few, so below SMALL_NODE_PX it refreshes at
 * most every SMALL_REFRESH_MS. Thousands of tiny spinners then cost what a few large ones do.
 */
const SMALL_NODE_PX = 200;
export const SMALL_REFRESH_MS = 250;

export const smallOnScreen = (node: GpuNode, zoom: number) =>
  Math.max(node.rect.width, node.rect.height) * zoom < SMALL_NODE_PX;

/** The node a DOM node (an event target, a mutated text) belongs to. */
export const nodeOf = (nodes: Map<HTMLElement, GpuNode>, target: Node): GpuNode | undefined => {
  const element = target instanceof Element ? target : target.parentElement;
  const node = element && nodeOfElement(nodes, element);
  return node ? nodes.get(node) : undefined;
};

/** Texels for `length` CSS pixels at `scale`: a snapshot is never empty. */
export const texels = (length: number, scale: number) => Math.max(1, Math.round(length * scale));

/** The node's own box on its page, where a snapshot of it is cropped from. */
export const nodeRegion = (node: GpuNode): Rect => ({
  x: node.pageX,
  y: node.pageY,
  width: node.rect.width,
  height: node.rect.height,
});

export const hasFreshThumb = (atlas: Atlas, node: GpuNode) =>
  atlas.isValid(node.thumb) && !node.thumbStale;
