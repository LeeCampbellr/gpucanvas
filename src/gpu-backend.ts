import { Atlas } from './atlas';
import { createBase } from './base';
import { screenToWorld } from './camera';
import { nodeOfElement, rectInNode } from './elements';
import { effectPad, effectParams, type Effect } from './effects';
import { Live, FAR_AWAY } from './gpu-live';
import {
  createGpuNode,
  isCurrentTile,
  nodeOf,
  placeNode,
  translateNode,
  type GpuNode,
  type Tile,
} from './gpu-node';
import { Pages } from './gpu-pages';
import { Planner } from './gpu-plan';
import { Rasterizer, type Capture } from './gpu-raster';
import { CompositeRenderer } from './gpu-renderer';
import { markSurface } from './input';
import type { Page } from './page';
import { intersects, type Rect } from './rect';
import {
  DEFAULT_SELECTION_COLOR,
  HOVER_WIDTH,
  SELECTION_WIDTH,
  type GpuCanvas,
  type GpuCanvasOptions,
} from './types';

/** How long the camera must rest before blurry snapshots are upgraded. */
const SETTLE_MS = 120;
const DEFAULT_PAGE_SIZE = 2048;
/**
 * Pages made drawable per frame. Chrome paints every drawable page in its rendering update,
 * outside our own timing, and a page of two dozen rich cards can take tens of milliseconds, so
 * the count adapts to how long frames actually take: halved after a slow frame, grown by one
 * after a fast one.
 */
const MAX_PROMOTIONS_PER_FRAME = 8;
const SLOW_FRAME_MS = 22;
const FAST_FRAME_MS = 12;

export function supportsGpuCanvas(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'gpu' in navigator &&
    typeof HTMLCanvasElement !== 'undefined' &&
    'requestPaint' in HTMLCanvasElement.prototype &&
    'getElementTransform' in HTMLCanvasElement.prototype &&
    typeof GPUQueue !== 'undefined' &&
    'drawElementImageToTexture' in GPUQueue.prototype
  );
}

function cssColorToRgba(color: string): [number, number, number, number] {
  const context = document.createElement('canvas').getContext('2d')!;
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255, a / 255];
}

const premultiplied = ([r, g, b, a]: [number, number, number, number]) =>
  [r * a, g * a, b * a, a] as [number, number, number, number];

/**
 * The GPU backend.
 *
 * Nodes are live DOM, grouped into pages inside `<canvas content="drawable">` (`Pages`). Each
 * frame the planner picks the visible nodes that need pixels (`Planner`); a page that has some is
 * made drawable, rasterized into a texture-array atlas in the next paint event (`Rasterizer`),
 * then parked with `content-visibility: hidden` so it costs the browser nothing per frame.
 * Compositing runs from requestAnimationFrame and draws every visible node in one instanced call,
 * so panning and zooming never touch the DOM. The node under the pointer, the focused one and
 * ones finishing a transition stay real and hit-testable (`Live`).
 */
export async function createGpuCanvas(
  host: HTMLElement,
  options: GpuCanvasOptions,
): Promise<GpuCanvas> {
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('gpucanvas: no WebGPU adapter');
  const device = await adapter.requestDevice();

  const canvas = document.createElement('canvas');
  canvas.setAttribute('content', 'drawable');
  markSurface(canvas);
  Object.assign(canvas.style, { display: 'block', width: '100%', height: '100%' });
  const context = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  // Fails before touching the host, so the DOM fallback starts from a clean host.
  try {
    if (!context) throw new Error('gpucanvas: no WebGPU canvas context');
    context.configure({ device, format, alphaMode: 'opaque' });
  } catch (error) {
    device.destroy();
    throw error;
  }

  const base = createBase<GpuNode>(
    host,
    options,
    () => {
      lastCameraChange = performance.now();
      // A moving canvas has no hover; the node under a still pointer becomes live once it rests.
      live.set(null);
      live.position();
      clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        live.pick();
        schedule();
      }, SETTLE_MS);
      schedule();
    },
    {
      add(element, rect) {
        element.style.pointerEvents = 'none';
        const node = createGpuNode(element, rect, pages.place(element, rect));
        pages.join(node);
        schedule();
        return node;
      },
      update(node, rect) {
        ringRects.clear();
        if (node.rect.width === rect.width && node.rect.height === rect.height) {
          translateNode(node, rect);
          live.moved(node);
          return schedule();
        }
        // A retained node moves directly between drawable pages so resizing cannot blur it.
        node.rect = rect;
        if (live.retains(node)) {
          relocate(node, () => {
            pages.lift(node);
            placeNode(node, { page: node.page, x: 0, y: 0 });
            node.solo = true;
          });
          node.page.setDrawable(true, frameNumber);
          live.reorder();
          return schedule();
        }
        relocate(node, () => {
          pages.release(node);
          placeNode(node, pages.place(node.element, rect));
          pages.join(node);
        });
        schedule();
      },
      order() {
        live.reorder();
        schedule();
      },
      remove(node) {
        live.forget(node);
        effects.delete(node.element);
        selection.delete(node.element);
        pages.release(node);
        schedule();
      },
    },
  );
  const { surface, nodes } = base;
  surface.append(canvas);

  const atlasSize = Math.min(options.atlasSize ?? 4096, device.limits.maxTextureDimension2D);
  const atlas: Atlas = new Atlas(
    device,
    atlasSize,
    Math.min(options.atlasLayers ?? 5, device.limits.maxTextureArrayLayers),
    () => planner.keep(),
  );
  const pages = new Pages(canvas, Math.min(options.pageSize ?? DEFAULT_PAGE_SIZE, atlasSize));
  const rasterizer = new Rasterizer(device, atlas, {
    calls: options.maxRastersPerFrame ?? 12,
    ms: options.rasterTimeBudgetMs ?? 6,
    pixels: options.rasterPixelBudget ?? 24_000_000,
  });
  // Nodes still waiting for pixels draw as a block slightly off the background.
  const colorsFor = (css: string) => {
    const background = cssColorToRgba(css);
    const shade = background[0] + background[1] + background[2] > 1.5 ? 0.92 : 1.25;
    const placeholder = background.map((channel) =>
      Math.min(1, channel * shade + (shade > 1 ? 0.02 : 0)),
    );
    placeholder[3] = 1;
    return [background, placeholder] as [typeof background, typeof background];
  };
  const renderer = new CompositeRenderer(
    device,
    context,
    format,
    atlas,
    ...colorsFor(options.background ?? '#f4f4f5'),
    () => schedule(),
  );
  const selectionColor = premultiplied(
    cssColorToRgba(options.selectionColor ?? DEFAULT_SELECTION_COLOR),
  );
  const hoverColor = options.hoverColor
    ? premultiplied(cssColorToRgba(options.hoverColor))
    : selectionColor;

  /** Effects nodes wear, with their parameters and how far past the node they draw. */
  const effects = new Map<HTMLElement, { effect: Effect; params: number[]; pad: number }>();
  const startedAt = performance.now();
  /** An effect in view animates, or is still compiling: draw again next frame. */
  let effectsMoving = false;
  let selection = new Set<Element>();
  let hovered: Element | null = null;
  /** World rects of outlined elements inside nodes, measured once until their layout changes. */
  const ringRects = new Map<Element, Rect>();
  const ringRect = (element: Element): Rect | null => {
    const own = nodes.get(element as HTMLElement);
    if (own) return own.rect;
    const at = element.isConnected ? nodeOfElement(nodes, element) : null;
    if (!at) return null;
    const node = nodes.get(at)!;
    let rect = ringRects.get(element);
    if (!rect) ringRects.set(element, (rect = rectInNode(at, node.rect, element)));
    return rect;
  };

  let lastCameraChange = -Infinity;
  let frameNumber = 0;
  let promotionsPerFrame = 2;
  let lastFrameAt = 0;
  let rafId = 0;
  let destroyed = false;
  let settleTimer = 0;
  /** A frame asked for this paint event; others come from content animating on its own. */
  let awaitingPaint = false;
  const requestPaint = () => {
    awaitingPaint = true;
    canvas.requestPaint();
  };
  const stats = {
    visible: 0,
    pending: 0,
    rasterizedLastFrame: 0,
    rasterCallsLastFrame: 0,
    rasterMs: 0,
    frameMs: 0,
    frames: 0,
    lostPixels: 0,
    lostDetail: 0,
    onThumbnail: 0,
  };

  const schedule = () => {
    if (rafId || destroyed) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      frameNumber++;
      frame(false);
    });
  };

  /** Canvas pixels per CSS pixel. */
  const canvasDpr = () => canvas.width / Math.max(1, canvas.clientWidth);
  const resizeObserver = new ResizeObserver(([entry]) => {
    // Chrome's device-pixel box ignores emulated DPR; use the same pixel ratio as raster planning.
    canvas.width = Math.max(1, Math.round(entry.contentRect.width * devicePixelRatio));
    canvas.height = Math.max(1, Math.round(entry.contentRect.height * devicePixelRatio));
    schedule();
  });
  resizeObserver.observe(canvas, { box: 'device-pixel-content-box' });

  /** Snapshots asked for and not drawn yet. Their pages stay drawable until they are. */
  const captures: Capture[] = [];
  const captured = (page: Page) => captures.some((capture) => capture.node.page === page);
  const isPinned = (page: Page) => captured(page) || live.holds(page);

  const live: Live = new Live({
    canvas,
    surface,
    nodes,
    camera: base.camera,
    view: base.view,
    nodeAt: base.nodeAt,
    frameNumber: () => frameNumber,
    canvasDpr,
    schedule,
    isPinned,
    onPress: () => {
      if (effects.size) schedule();
    },
  });

  /**
   * Moves a node to another page with `move`. The page it left is released from hit testing and
   * parked unless something else holds it. The pointer did not move, so a live node is live again.
   */
  const relocate = (node: GpuNode, move: () => void) => {
    const wasLive = live.current === node;
    if (wasLive) live.set(null);
    const previous = node.page;
    move();
    if (pages.has(previous) && !isPinned(previous)) {
      live.unpin(previous);
      previous.setDrawable(false, frameNumber);
    }
    if (wasLive) live.pick();
  };
  /**
   * Moves a node onto a page of its own, so deep zooms rasterize only it. Its whole snapshot
   * stays valid: the pixels did not change, only the page.
   */
  const lift = (node: GpuNode) => relocate(node, () => pages.lift(node));
  const planner: Planner = new Planner(atlas, lift, schedule);

  const composite = () => {
    const { visible, detailScale, view } = planner;
    renderer.begin();
    effectsMoving = false;
    const pushRing = (element: Element, color: number[], width: number) => {
      const rect = ringRect(element);
      if (rect && intersects(rect, view)) renderer.ring(rect, color, width);
    };
    let onThumbnail = 0;
    for (const node of visible) {
      // Until its snapshot is drawn, a node shows its thumbnail.
      const image = atlas.isValid(node.slot)
        ? node.slot
        : atlas.isValid(node.thumb)
          ? node.thumb
          : null;
      if (image && image !== node.slot) onThumbnail++;
      const hasSlot = image !== null;
      const sharp = node.tiles.length > 0 || (node.preview !== null && atlas.isValid(node.preview));
      const shown = sharp ? 3 : hasSlot ? 2 : 1;
      // Flicker accounting: pixels a node showed last frame and lost this one. A node coming
      // into view is pop-in, not flicker.
      const before = node.shownFrame === stats.frames - 1 ? node.shown : 0;
      if (before >= 2 && shown === 1) stats.lostPixels++;
      if (before === 3 && shown === 2) stats.lostDetail++;
      node.shown = shown;
      node.shownFrame = stats.frames;
      const worn = effects.size ? effects.get(node.element) : undefined;
      // An effect that failed to compile is drawn plain, without asking for more frames.
      if (worn && !renderer.effectFailed(worn.effect)) {
        if (worn.effect.animated) effectsMoving = true;
        if (image && renderer.hasEffect(worn.effect)) {
          renderer.effectQuad(node.rect, image, worn.effect, worn.pad, worn.params);
          continue;
        }
        effectsMoving = true;
      }
      renderer.quad(node.rect, image);
      // Back to front: stale tiles and tiles from an earlier zoom, the preview of a change,
      // then this zoom's fresh tiles.
      const current = (tile: Tile) => isCurrentTile(tile, detailScale);
      for (const tile of node.tiles)
        if (!current(tile) && atlas.isValid(tile.slot)) renderer.quad(tile.rect, tile.slot);
      if (node.preview && atlas.isValid(node.preview))
        renderer.quad(node.previewRect!, node.preview);
      for (const tile of node.tiles)
        if (current(tile) && atlas.isValid(tile.slot)) renderer.quad(tile.rect, tile.slot);
    }
    stats.onThumbnail = onThumbnail;
    // Outlines last, so no neighbor covers them, and hover over the selection.
    for (const element of selection) pushRing(element, selectionColor, SELECTION_WIDTH);
    if (hovered && !selection.has(hovered)) pushRing(hovered, hoverColor, HOVER_WIDTH);
    const cssWidth = canvas.clientWidth;
    const dpr = canvasDpr();
    const now = performance.now();
    const camera = base.camera();
    renderer.draw(camera, cssWidth, canvas.clientHeight, dpr, {
      time: (now - startedAt) / 1000,
      pointer: live.pointer ? screenToWorld(camera, live.pointer) : FAR_AWAY,
      press: live.press,
      sincePress: Math.min((now - live.pressedAt) / 1000, 1e4),
    });
  };

  /**
   * One frame. From requestAnimationFrame (`inPaint` false) it plans, promotes the pages that
   * need pixels, and either composites straight away or asks for a paint event. In the paint
   * event snapshots are current, so rasterizing happens there, followed by the composite.
   */
  const frame = (inPaint: boolean) => {
    if (destroyed) return;
    const start = performance.now();
    atlas.nextFrame();
    const dpr = canvasDpr();
    const camera = base.camera();
    const view = base.view();
    const moving = start - lastCameraChange < SETTLE_MS;
    planner.plan(nodes.values(), view, camera.zoom, dpr, moving);
    const { plans, ordered } = planner;

    if (!inPaint && plans.size > 0) {
      // Only consecutive frames say how long a frame takes.
      const interval = start - lastFrameAt;
      if (interval < 100) {
        if (interval > SLOW_FRAME_MS) promotionsPerFrame = Math.max(1, promotionsPerFrame >> 1);
        else if (interval < FAST_FRAME_MS)
          promotionsPerFrame = Math.min(MAX_PROMOTIONS_PER_FRAME, promotionsPerFrame + 1);
      }
      lastFrameAt = start;
      let promoted = 0;
      for (const plan of ordered) {
        if (plan.page.drawable) continue;
        if (promoted++ >= promotionsPerFrame) break;
        plan.page.setDrawable(true, frameNumber);
      }
      // The paint event follows in this same rendering update and finishes the frame.
      requestPaint();
      return;
    }

    let pending = 0;
    stats.rasterizedLastFrame = 0;
    stats.rasterCallsLastFrame = 0;
    if (inPaint && plans.size > 0) {
      const drawn = rasterizer.rasterize(ordered, pages, frameNumber, start, isPinned);
      pending = drawn.pending;
      stats.rasterizedLastFrame = drawn.rasterized;
      stats.rasterCallsLastFrame = drawn.calls;
    }
    pages.parkIdle(plans, frameNumber, isPinned);
    stats.rasterMs = performance.now() - start;
    composite();
    stats.frames++;
    live.position();
    stats.visible = planner.visible.length;
    stats.pending = pending;
    stats.frameMs = performance.now() - start;
    if (pending > 0 || effectsMoving) schedule();
  };

  canvas.onpaint = (event) => {
    if (captures.length) {
      rasterizer.capture(captures);
      if (captures.length) requestPaint();
      else schedule();
    }
    // CSS-only changes (hover, focus rings, transitions) on pinned pages reach us only here.
    let changed = false;
    for (const element of event.changedElements) {
      const page = pages.pageOf(element);
      if (!page) continue;
      for (const node of live.held()) {
        if (node?.page === page) {
          node.dirty = true;
          changed = true;
        }
      }
    }
    if (changed) ringRects.clear();
    if (!awaitingPaint && !changed) return;
    awaitingPaint = false;
    frame(true);
  };

  // Content changes on any node, drawable or parked. Style that gpucanvas writes on page and
  // node elements is ignored.
  const mutations = new MutationObserver((records) => {
    // Outlined elements may have moved inside their nodes.
    ringRects.clear();
    let changed = false;
    for (const record of records) {
      const target = record.target as HTMLElement;
      if (
        record.type === 'attributes' &&
        (nodes.has(target) || pages.pageOf(target) || target === canvas)
      ) {
        continue;
      }
      const node = nodeOf(nodes, record.target);
      if (node && !node.dirty) {
        node.dirty = true;
        // Off screen it waits until it scrolls into view.
        if (!changed) changed = intersects(node.rect, base.view());
      }
    }
    if (changed) schedule();
  });
  mutations.observe(canvas, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
  });

  // An image that finishes loading changes pixels without changing the DOM.
  const onResourceLoad = (event: Event) => {
    const node = nodeOf(nodes, event.target as HTMLElement);
    if (!node) return;
    node.dirty = true;
    schedule();
  };
  canvas.addEventListener('load', onResourceLoad, true);
  // Snapshots taken before a web font arrived show the fallback font.
  const onFontsLoaded = () => {
    for (const node of nodes.values()) node.dirty = true;
    schedule();
  };
  document.fonts.addEventListener('loadingdone', onFontsLoaded);

  return {
    ...base.api,
    mode: 'gpu',
    setLiveNodes(elements) {
      const retained = new Set(
        [...elements].map((element) => {
          const node = nodes.get(element);
          if (!node) throw new Error('setLiveNodes: element is not a canvas node');
          return node;
        }),
      );
      for (const node of retained) if (!node.solo) lift(node);
      live.retain(retained);
    },
    getElementRect(element) {
      const rect = ringRect(element);
      return rect ? { ...rect } : null;
    },
    setSelection(elements) {
      selection = new Set(elements);
      ringRects.clear();
      schedule();
    },
    setHover(element) {
      if (element === hovered) return;
      hovered = element;
      ringRects.clear();
      schedule();
    },
    setEffect(element, effect, params) {
      if (!nodes.has(element)) return;
      if (effect) {
        const values = effectParams(effect, params);
        effects.set(element, { effect, params: values, pad: effectPad(effect, values) });
      } else effects.delete(element);
      schedule();
    },
    invalidate: onFontsLoaded,
    snapshot(element, options = {}) {
      const node = nodes.get(element);
      if (!node) return Promise.reject(new Error('Not a node on this canvas'));
      const largest = device.limits.maxTextureDimension2D;
      const wanted = options.scale ?? devicePixelRatio;
      const scale = Math.min(wanted, largest / node.rect.width, largest / node.rect.height);
      return new Promise((resolve, reject) => {
        captures.push({ node, scale, resolve, reject, tries: 0 });
        node.page.setDrawable(true, frameNumber);
        requestPaint();
      });
    },
    setBackground(color) {
      [renderer.background, renderer.placeholder] = colorsFor(color);
      schedule();
    },
    getStats: () => ({
      mode: 'gpu',
      nodes: nodes.size,
      visible: stats.visible,
      pending: stats.pending,
      rasterizedLastFrame: stats.rasterizedLastFrame,
      rasterCallsLastFrame: stats.rasterCallsLastFrame,
      rasterMs: stats.rasterMs,
      pages: pages.size,
      drawablePages: [...pages.all()].filter((page) => page.drawable).length,
      atlasLayersUsed: atlas.usedLayers,
      frameMs: stats.frameMs,
      frames: stats.frames,
      lostPixels: stats.lostPixels,
      lostDetail: stats.lostDetail,
      thumbnailFill: atlas.pinnedFill,
      onThumbnail: stats.onThumbnail,
      needs: planner.needs,
    }),
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(settleTimer);
      live.destroy();
      planner.destroy();
      mutations.disconnect();
      document.fonts.removeEventListener('loadingdone', onFontsLoaded);
      canvas.removeEventListener('load', onResourceLoad, true);
      resizeObserver.disconnect();
      canvas.onpaint = null;
      base.destroy();
      renderer.destroy();
      atlas.destroy();
      device.destroy();
    },
  };
}
