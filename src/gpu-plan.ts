import type { Atlas } from './atlas';
import {
  hasFreshThumb,
  isCurrentTile,
  smallOnScreen,
  SMALL_REFRESH_MS,
  THUMBNAIL_SCALE,
  type GpuNode,
  type Tile,
} from './gpu-node';
import type { Page } from './page';
import { center, contains, intersection, intersects, type Rect } from './rect';

/** A tile a zoomed-in node is missing, waiting to be drawn. */
export interface TileJob {
  node: GpuNode;
  rect: Rect;
  scale: number;
  column: number;
  row: number;
  priority: number;
}

export interface PagePlan {
  page: Page;
  /** Nodes that need a whole snapshot. */
  nodes: GpuNode[];
  /** Nodes that need a preview, then tiles; both after any whole snapshot. */
  previews: GpuNode[];
  tiles: TileJob[];
  priority: number;
}

const MIN_RASTER_SCALE = 1 / 64;
/**
 * Whole-node snapshots stop here (100% zoom on a 2x display); closer in, tiles of the visible
 * part take over. A snapshot costs about 12 ns per pixel on the main thread, so one large card
 * at 4x would already stall a frame.
 */
const MAX_RASTER_SCALE = 2;
const MAX_DETAIL_SCALE = 64;
/** Side of a tile in device pixels: about 3 ms to draw, so two fit the frame budget. */
const TILE_PIXELS = 512;
/**
 * Content that changed this recently counts as animating: zoomed in, it is drawn as one
 * half-resolution preview of the view, then as sharp tiles once it rests. The full screen at 8x
 * zoom is about ten million pixels, too many to redraw every frame.
 */
const CONTENT_SETTLE_MS = 150;
/** Kept snapshots may be this many times sharper than needed before they are redrawn smaller. */
const MAX_OVERSAMPLING = 4;

/** Need classes, most urgent first. */
const MISSING = 0;
const DIRTY = 1;
const BLURRY = 2;
const OVERSAMPLED = 3;

/**
 * Snapshots are rasterized at power-of-two scales so zooming reuses them; a snapshot up to 10%
 * too small is accepted before paying for the next scale.
 */
function rasterScaleFor(deviceScale: number) {
  const scale = 2 ** Math.ceil(Math.log2(deviceScale) - 0.14);
  return Math.min(MAX_DETAIL_SCALE, Math.max(MIN_RASTER_SCALE, scale));
}

const distanceToCenter = (rect: Rect, view: Rect) => {
  const a = center(rect);
  const b = center(view);
  return Math.hypot(a.x - b.x, a.y - b.y);
};

/**
 * Decides, each frame, which visible nodes need pixels and how urgently, grouped by page so the
 * rasterizer can draw a page in one call. Nodes zoomed in past MAX_RASTER_SCALE get a preview
 * or tiles instead of a sharper whole snapshot.
 */
export class Planner {
  /** This frame's texels per CSS pixel for tiles. */
  detailScale = 1;
  /** This frame's world rect in view. */
  view: Rect = { x: 0, y: 0, width: 0, height: 0 };
  readonly visible: GpuNode[] = [];
  readonly plans = new Map<Page, PagePlan>();
  /** This frame's plans, most urgent first. */
  ordered: PagePlan[] = [];
  /** Last plan's nodes per need class: missing, dirty, blurry, oversampled. */
  needs = [0, 0, 0, 0];
  private zoom = 1;
  private contentTimer = 0;
  private refreshTimer = 0;
  private refreshAt = Infinity;

  constructor(
    private readonly atlas: Atlas,
    /** Moves a node onto a page of its own. */
    private readonly lift: (node: GpuNode) => void,
    private readonly schedule: () => void,
  ) {}

  /**
   * Builds this frame's raster plan: which visible nodes need pixels, grouped by page. `dpr` is
   * canvas pixels per CSS pixel; `moving` means the camera has not rested yet.
   */
  plan(nodes: Iterable<GpuNode>, view: Rect, zoom: number, dpr: number, moving: boolean) {
    const { atlas, visible, plans } = this;
    const atlasSize = atlas.size;
    const deviceScale = zoom * dpr;
    const desiredScale = rasterScaleFor(deviceScale);
    const now = performance.now();
    this.zoom = zoom;
    // Tiles are redrawn whenever the zoom settles anyway, so they use the exact device scale:
    // one tile texel per screen pixel.
    this.detailScale = Math.min(deviceScale, MAX_DETAIL_SCALE);
    this.view = view;
    visible.length = 0;
    plans.clear();
    this.needs = [0, 0, 0, 0];
    for (const node of nodes) {
      if (!intersects(node.rect, view)) continue;
      visible.push(node);
      const scale = Math.min(
        desiredScale,
        MAX_RASTER_SCALE,
        (atlasSize - 1) / node.rect.width,
        (atlasSize - 1) / node.rect.height,
      );
      if (node.dirty) node.changedAt = now;
      // Zoomed out this far the thumbnail is all the detail there is to see.
      const thumbnailEnough = scale <= THUMBNAIL_SCALE;
      if (thumbnailEnough && hasFreshThumb(atlas, node) && !node.dirty && !node.wholeStale) {
        node.slot = node.thumb;
        node.slotScale = THUMBNAIL_SCALE;
      }
      const animating = now - node.changedAt < CONTENT_SETTLE_MS;
      const deep = desiredScale > scale;
      if (deep && !node.solo) this.lift(node);
      const jobs = deep ? this.planDetail(node, view, animating, moving) : [];
      if (!deep) {
        node.preview = null;
        node.tiles.length = 0;
      }
      const valid = atlas.isValid(node.slot);
      let need = -1;
      // A node with a thumbnail has something on screen, so empty ones go first.
      if (!valid) need = atlas.isValid(node.thumb) ? DIRTY : MISSING;
      // Zoomed in, the whole snapshot is a backdrop under the preview and tiles; a change can
      // wait for it until the node is seen at a smaller zoom.
      else if (deep) need = node.slotScale < scale / (moving ? 4 : 2) ? BLURRY : -1;
      else if (node.dirty || node.wholeStale) {
        const wait = this.refreshWait(node, now);
        if (wait > 0) this.refreshLater(wait);
        else need = DIRTY;
      }
      // In motion only snapshots under half the needed scale are redrawn, nearest the middle
      // first within the frame's budget, so a flight never shows thumbnails blown up.
      else if (node.slotScale < (moving ? scale / 2 : scale)) need = BLURRY;
      else if (!moving && node.slotScale > scale * MAX_OVERSAMPLING) need = OVERSAMPLED;
      if (need >= 0) this.needs[need]++;
      if (need < 0 && !node.previewTarget && jobs.length === 0) continue;
      // Snapshots this small are thumbnails, and those have one fixed scale.
      node.targetScale = thumbnailEnough ? THUMBNAIL_SCALE : scale;
      node.priority = (need < 0 ? BLURRY : need) * 1e12 + distanceToCenter(node.rect, view);
      let plan = plans.get(node.page);
      if (!plan) {
        plan = { page: node.page, nodes: [], previews: [], tiles: [], priority: node.priority };
        plans.set(node.page, plan);
      }
      plan.priority = Math.min(plan.priority, node.priority);
      if (need >= 0) plan.nodes.push(node);
      if (node.previewTarget) plan.previews.push(node);
      plan.tiles.push(...jobs);
    }
    for (const plan of plans.values()) plan.tiles.sort((a, b) => a.priority - b.priority);
    this.ordered = [...plans.values()].sort((a, b) => a.priority - b.priority);
  }

  /** Atlas slots to keep when it is full: what is on screen, whole snapshots before sharp tiles. */
  *keep() {
    const { visible, detailScale, view } = this;
    const onScreen = (tile: Tile) => intersects(tile.rect, view);
    for (const node of visible) yield node.slot;
    for (const node of visible) {
      for (const tile of node.tiles) {
        if (isCurrentTile(tile, detailScale) && onScreen(tile)) yield tile.slot;
      }
    }
    for (const node of visible) {
      yield node.preview;
      for (const tile of node.tiles) if (onScreen(tile)) yield tile.slot;
    }
  }

  destroy() {
    clearTimeout(this.contentTimer);
    clearTimeout(this.refreshTimer);
  }

  /**
   * Plans a zoomed-in node: a preview while its content animates, otherwise the tiles in view
   * it is missing at this frame's scale.
   */
  private planDetail(node: GpuNode, view: Rect, animating: boolean, moving: boolean) {
    const { atlas, detailScale } = this;
    const shown = intersection(node.rect, view)!;
    node.previewTarget = null;
    node.tiles = node.tiles.filter((tile) => atlas.isValid(tile.slot));
    // Old tiles stay on screen under the preview until fresh ones replace them.
    if (node.dirty) for (const tile of node.tiles) tile.stale = true;
    if (!atlas.isValid(node.preview)) node.preview = null;
    if (animating) {
      const scale = detailScale / 2;
      const stale =
        !node.preview ||
        node.dirty ||
        node.previewScale !== scale ||
        !contains(node.previewRect!, shown);
      if (stale) {
        node.previewTarget = this.fitPreview(shown, scale);
        node.previewTargetScale = scale;
      }
      this.scheduleAfterContentSettles();
      return [];
    }
    // Panning at a steady zoom keeps filling tiles; while the zoom changes it waits to settle.
    const current = node.tiles.filter((tile) => isCurrentTile(tile, detailScale));
    if (moving && current.length === 0) return [];
    const size = Math.max(1, Math.floor(TILE_PIXELS / detailScale));
    const jobs: TileJob[] = [];
    const first = (edge: number, origin: number) => Math.floor((edge - origin) / size);
    for (
      let row = first(shown.y, node.rect.y);
      row <= first(shown.y + shown.height - 1e-6, node.rect.y);
      row++
    ) {
      for (
        let column = first(shown.x, node.rect.x);
        column <= first(shown.x + shown.width - 1e-6, node.rect.x);
        column++
      ) {
        if (current.some((tile) => tile.column === column && tile.row === row)) continue;
        const rect = intersection(node.rect, {
          x: node.rect.x + column * size,
          y: node.rect.y + row * size,
          width: size,
          height: size,
        })!;
        jobs.push({
          node,
          rect,
          scale: detailScale,
          column,
          row,
          priority: distanceToCenter(rect, view),
        });
      }
    }
    // Once the view is tiled at this scale, older tiles and the preview are hidden anyway.
    if (jobs.length === 0) {
      node.tiles = current;
      node.preview = null;
    }
    return jobs;
  }

  /** The world rect a preview covers: `shown`, shrunk around its center to fit one layer. */
  private fitPreview(shown: Rect, scale: number): Rect {
    const limit = (this.atlas.size - 2) / scale;
    const fit = (start: number, size: number) =>
      size <= limit ? [start, size] : [start + (size - limit) / 2, limit];
    const [x, width] = fit(shown.x, shown.width);
    const [y, height] = fit(shown.y, shown.height);
    return { x, y, width, height };
  }

  private scheduleAfterContentSettles() {
    clearTimeout(this.contentTimer);
    // A little past the settle time, so the content counts as resting when the timer fires.
    this.contentTimer = window.setTimeout(this.schedule, CONTENT_SETTLE_MS + 10);
  }

  /** How long a changed node waits before it is redrawn: only small ones wait. */
  private refreshWait(node: GpuNode, now: number) {
    return smallOnScreen(node, this.zoom) ? node.refreshedAt + SMALL_REFRESH_MS - now : 0;
  }

  private refreshLater(wait: number) {
    const at = performance.now() + wait;
    if (at >= this.refreshAt) return;
    clearTimeout(this.refreshTimer);
    this.refreshAt = at;
    this.refreshTimer = window.setTimeout(() => {
      this.refreshAt = Infinity;
      this.schedule();
    }, wait);
  }
}
