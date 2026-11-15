import type { AtlasSlot } from './atlas';
import { Shelves } from './shelves';

/**
 * A page is one `drawable` container holding many nodes, laid out side by side in CSS pixels.
 * The browser records a page as one snapshot, so a single `drawElementImageToTexture` call can
 * rasterize every node on it, and a source rectangle crops out one node when only it changed.
 * Each call costs roughly a quarter millisecond on top of its pixels, so batching nodes into
 * pages is what makes a 10,000-node overview fill in a second instead of a minute.
 */

/** Space between nodes on a page, so filtering at a node's edge never reads its neighbor. */
const GAP = 4;

export interface PageSlot {
  page: Page;
  x: number;
  y: number;
}

export class Page {
  readonly element: HTMLDivElement;
  readonly width: number;
  readonly height: number;
  /** Has the `drawable` attribute and is rendered; parked pages use `content-visibility: hidden`. */
  drawable = false;
  /** Frame in which the page became drawable. Its snapshot exists from that frame's paint on. */
  promotedFrame = -1;
  /** Registered for hit testing with `updateElementGeometry`. */
  registered = false;
  /** The atlas slot of the page's last whole snapshot, reused when it is drawn again that size. */
  wholeSlot: AtlasSlot | null = null;
  private readonly shelves: Shelves;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    // A node may end flush with the page edge: its gap would fall outside.
    this.shelves = new Shelves(width + GAP, height + GAP, 1.25);
    this.element = document.createElement('div');
    this.element.dataset.gpucanvasPage = '';
    Object.assign(this.element.style, {
      position: 'relative',
      width: `${width}px`,
      height: `${height}px`,
      // Pages share the canvas origin: each one pulls the next back up by its own height.
      marginBottom: `${-height}px`,
      contain: 'strict',
      overflow: 'hidden',
      // Parked pages keep their layout but skip style, layout updates and paint. Unlike
      // `display: none`, their nodes keep their size, so components that measure themselves
      // (charts with a ResizeObserver) don't re-render empty every time a page parks.
      contentVisibility: 'hidden',
    });
  }

  /** Reserves a spot for a `width` x `height` node, or returns null when the page is full. */
  place(width: number, height: number): PageSlot | null {
    const at = this.shelves.place(Math.ceil(width) + GAP, Math.ceil(height) + GAP);
    return at && { page: this, ...at };
  }

  setDrawable(drawable: boolean, frame: number) {
    if (this.drawable === drawable) return;
    this.drawable = drawable;
    this.registered = false;
    if (drawable) {
      this.promotedFrame = frame;
      this.element.style.contentVisibility = '';
      this.element.setAttribute('drawable', '');
    } else {
      this.element.removeAttribute('drawable');
      this.element.style.contentVisibility = 'hidden';
      this.element.style.transform = '';
    }
  }
}
