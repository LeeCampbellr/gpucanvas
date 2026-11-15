import type { Atlas, AtlasSlot } from './atlas';
import { captureRegion } from './capture';
import {
  hasFreshThumb,
  nodeRegion,
  recordPartial,
  recordWhole,
  setThumb,
  texels,
  THUMBNAIL_SCALE,
  type GpuNode,
} from './node';
import type { Pages } from './pages';
import type { PagePlan } from './plan';
import type { Page } from './page';
import type { Rect } from '../core/rect';

/** Live content redraws its thumbnail at most this often; nobody reads a spinner at 3% zoom. */
const THUMBNAIL_REFRESH_MS = 1000;
/** A page made drawable has its snapshot within a paint or two; after this many, a capture fails. */
const MAX_CAPTURE_TRIES = 20;

/** A snapshot asked for and not drawn yet. */
export interface Capture {
  node: GpuNode;
  scale: number;
  resolve: (image: ImageData) => void;
  reject: (error: Error) => void;
  tries: number;
}

export interface RasterBudget {
  /** Most `drawElementImageToTexture` calls per frame. */
  calls: number;
  /** Most snapshot pixels per frame. */
  pixels: number;
  /** Most milliseconds per frame. */
  ms: number;
}

/** Draws planned snapshots, previews, tiles and thumbnails into the atlas. */
export class Rasterizer {
  constructor(
    private readonly device: GPUDevice,
    private readonly atlas: Atlas,
    private readonly budget: RasterBudget,
  ) {}

  /**
   * Rasterizes planned pages, most urgent first, within the frame's budget. A page where many
   * nodes need pixels is drawn whole in one call; otherwise each node is cropped out. Pages that
   * end up with nothing left to draw are parked unless `isPinned` holds them.
   */
  rasterize(
    ordered: readonly PagePlan[],
    pages: Pages,
    frameNumber: number,
    start: number,
    isPinned: (page: Page) => boolean,
  ) {
    const { atlas, budget } = this;
    const atlasSize = atlas.size;
    let calls = 0;
    let pixels = 0;
    let rasterized = 0;
    let pending = 0;
    const overBudget = () =>
      calls > 0 &&
      (calls >= budget.calls || pixels >= budget.pixels || performance.now() - start >= budget.ms);
    for (const plan of ordered) {
      const { page } = plan;
      // A page promoted this frame may still hold the snapshot from before it was parked.
      if (!page.drawable || page.promotedFrame >= frameNumber || overBudget()) {
        pending += plan.nodes.length + plan.previews.length + plan.tiles.length;
        continue;
      }
      const scale = plan.nodes.reduce((max, node) => Math.max(max, node.targetScale), 0);
      const members = pages.nodesOf(page);
      const neededArea = plan.nodes.reduce((sum, n) => sum + n.rect.width * n.rect.height, 0);
      // A whole page also redraws members nobody is looking at, so it is worth it only while
      // the page is small in the atlas: at most a quarter of a layer.
      const wholeFits = page.width * scale <= atlasSize / 2 && page.height * scale <= atlasSize / 2;
      const whole =
        wholeFits && (plan.nodes.length >= 6 || neededArea >= 0.25 * page.width * page.height);
      const wholeSlot = whole
        ? this.slotFor(
            page.wholeSlot,
            Math.ceil(page.width * scale),
            Math.ceil(page.height * scale),
            scale === THUMBNAIL_SCALE,
          )
        : null;
      if (wholeSlot) page.wholeSlot = wholeSlot;
      if (wholeSlot && !this.draw(page, null, wholeSlot)) {
        pending += plan.nodes.length + plan.previews.length + plan.tiles.length;
        continue;
      }

      if (wholeSlot) {
        const slot = wholeSlot;
        calls++;
        pixels += slot.width * slot.height;
        for (const node of members) {
          const part = {
            layer: slot.layer,
            generation: slot.generation,
            x: slot.x + node.pageX * scale,
            y: slot.y + node.pageY * scale,
            width: node.rect.width * scale,
            height: node.rect.height * scale,
          };
          recordWhole(node, part, scale, start);
        }
        rasterized += members.size;
      } else {
        for (const node of plan.nodes) {
          if (overBudget()) {
            pending++;
            continue;
          }
          const thumbnail = node.targetScale === THUMBNAIL_SCALE;
          const slot = this.slotFor(
            thumbnail ? node.thumb : node.slot,
            texels(node.rect.width, node.targetScale),
            texels(node.rect.height, node.targetScale),
            thumbnail,
          );
          if (!slot || !this.draw(page, nodeRegion(node), slot)) {
            pending++;
            continue;
          }
          calls++;
          pixels += slot.width * slot.height;
          recordWhole(node, slot, node.targetScale, start);
          rasterized++;
        }
      }
      // The first snapshot at a scale in a frame pays to rasterize the page at that scale;
      // further crops at the same scale are nearly free, so they skip the budget.
      const warm = new Set<number>();
      const drawRegion = (node: GpuNode, rect: Rect, scale: number, previous: AtlasSlot | null) => {
        if (!warm.has(scale) && overBudget()) return null;
        const slot = this.slotFor(previous, texels(rect.width, scale), texels(rect.height, scale));
        const region = {
          x: node.pageX + rect.x - node.rect.x,
          y: node.pageY + rect.y - node.rect.y,
          width: rect.width,
          height: rect.height,
        };
        if (!slot || !this.draw(page, region, slot)) return null;
        calls++;
        warm.add(scale);
        pixels += slot.width * slot.height;
        recordPartial(node, start);
        return slot;
      };
      for (const node of plan.previews) {
        const slot = drawRegion(node, node.previewTarget!, node.previewTargetScale, node.preview);
        if (!slot) {
          pending++;
          continue;
        }
        node.preview = slot;
        node.previewRect = node.previewTarget;
        node.previewScale = node.previewTargetScale;
        node.previewTarget = null;
      }
      let tilesLeft = 0;
      for (const job of plan.tiles) {
        // A change since planning makes the job's content stale; the next plan redoes it.
        const { node, column, row, scale } = job;
        const old = node.tiles.findIndex(
          (tile) =>
            tile.stale && tile.scale === scale && tile.column === column && tile.row === row,
        );
        const previous = old >= 0 ? node.tiles[old].slot : null;
        const slot = node.dirty ? null : drawRegion(node, job.rect, scale, previous);
        if (!slot) {
          tilesLeft++;
          continue;
        }
        if (old >= 0) node.tiles.splice(old, 1);
        node.tiles.push({ slot, rect: job.rect, scale, column, row, stale: false });
      }
      pending += tilesLeft;
      // While the page is drawable, its nodes' thumbnails are nearly free: one small raster of
      // the page, then a crop per node.
      for (const node of members) {
        if (hasFreshThumb(atlas, node) || node.dirty) continue;
        if (atlas.isValid(node.thumb) && start - node.thumbAt < THUMBNAIL_REFRESH_MS) continue;
        const slot = this.slotFor(
          node.thumb,
          texels(node.rect.width, THUMBNAIL_SCALE),
          texels(node.rect.height, THUMBNAIL_SCALE),
          true,
        );
        if (!slot || !this.draw(page, nodeRegion(node), slot)) continue;
        calls++;
        setThumb(node, slot, start);
      }
      const done =
        plan.nodes.every((node) => !node.dirty && atlas.isValid(node.slot)) &&
        plan.previews.every((node) => node.previewTarget === null) &&
        tilesLeft === 0;
      if (done && !isPinned(page)) page.setDrawable(false, frameNumber);
    }
    return { pending, rasterized, calls };
  }

  /**
   * Draws each node waiting for a snapshot into a texture of its own and reads it back, removing
   * it from `captures`. A page that just became drawable has no snapshot until the next paint
   * event, so a capture may wait a paint or two.
   */
  capture(captures: Capture[]) {
    for (const capture of [...captures]) {
      const { node, scale } = capture;
      let image: Promise<ImageData>;
      try {
        image = captureRegion(
          this.device,
          node.page.element,
          nodeRegion(node),
          texels(node.rect.width, scale),
          texels(node.rect.height, scale),
        );
      } catch (error) {
        if (++capture.tries > MAX_CAPTURE_TRIES) {
          captures.splice(captures.indexOf(capture), 1);
          capture.reject(error instanceof Error ? error : new Error(String(error)));
        }
        continue;
      }
      captures.splice(captures.indexOf(capture), 1);
      image.then(capture.resolve, capture.reject);
    }
  }

  /**
   * Atlas space for a `width` x `height` snapshot. A redraw at the same size overwrites the slot
   * it replaces, so redraws (a hover, a click, an animation) never fill the atlas. Slots cut from
   * a whole-page snapshot start at fractional texels and belong to the page, so they are never
   * overwritten. Thumbnails go to the pinned layer while it has room.
   */
  private slotFor(previous: AtlasSlot | null, width: number, height: number, thumbnail = false) {
    const { atlas } = this;
    return atlas.isValid(previous) &&
      atlas.isPinned(previous) === thumbnail &&
      previous.width === width &&
      previous.height === height &&
      Number.isInteger(previous.x) &&
      Number.isInteger(previous.y)
      ? previous
      : ((thumbnail ? atlas.allocatePinned(width, height) : null) ?? atlas.allocate(width, height));
  }

  /** Copies `source` of the page (all of it when null) into `slot`; false until it is recorded. */
  private draw(page: Page, source: Rect | null, slot: AtlasSlot) {
    try {
      this.device.queue.drawElementImageToTexture(
        source
          ? {
              source: page.element,
              sourceX: source.x,
              sourceY: source.y,
              sourceWidth: source.width,
              sourceHeight: source.height,
            }
          : { source: page.element },
        {
          texture: this.atlas.texture,
          origin: { x: slot.x, y: slot.y, z: slot.layer },
          size: { width: slot.width, height: slot.height },
          premultipliedAlpha: true,
        },
      );
      return true;
    } catch {
      // Not recorded yet; the next paint event retries.
      return false;
    }
  }
}
