import type { GpuNode } from './gpu-node';
import { Page } from './page';
import type { Rect } from './rect';

/**
 * The pages inside the canvas and the nodes on each. New nodes fill the open page until it is
 * full; a node larger than a page, or one lifted for a deep zoom, gets a page of its own. A page
 * is removed once its last node leaves, unless it is the open page.
 */
export class Pages {
  private readonly members = new Map<Page, Set<GpuNode>>();
  private readonly byElement = new Map<Element, Page>();
  private open: Page | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly pageSize: number,
  ) {}

  get size() {
    return this.members.size;
  }

  all() {
    return this.members.keys();
  }

  has(page: Page) {
    return this.members.has(page);
  }

  nodesOf(page: Page) {
    return this.members.get(page)!;
  }

  /** The page whose element is `element`. */
  pageOf(element: Element) {
    return this.byElement.get(element);
  }

  /** Counts a node, already placed on its page, as one of the page's nodes. */
  join(node: GpuNode) {
    this.members.get(node.page)!.add(node);
  }

  release(node: GpuNode) {
    const members = this.members.get(node.page)!;
    members.delete(node);
    if (members.size === 0 && node.page !== this.open) this.drop(node.page);
  }

  /**
   * Moves a node onto a page of its own and returns the page it left. Chrome rasterizes a
   * snapshot's whole source element at the requested scale before cropping, so zoomed in, a crop
   * from a shared page pays for every node on it: about 100 ms at 16x for two dozen app screens,
   * under 10 ms for one. `moveBefore` keeps focus, running transitions and other DOM state across
   * the move.
   */
  lift(node: GpuNode) {
    const previous = node.page;
    const page = this.newPage(Math.ceil(node.rect.width), Math.ceil(node.rect.height));
    page.place(node.rect.width, node.rect.height);
    if (previous.drawable) page.setDrawable(true, previous.promotedFrame);
    const target = page.element as HTMLElement & {
      moveBefore?: (child: Node, before: Node | null) => void;
    };
    if (target.moveBefore) target.moveBefore(node.element, null);
    else target.append(node.element);
    node.element.style.left = '0px';
    node.element.style.top = '0px';
    this.release(node);
    node.page = page;
    node.pageX = 0;
    node.pageY = 0;
    node.solo = true;
    this.join(node);
    return previous;
  }

  /** Lays out `element` on the open page, or a new one when it is full or too small. */
  place(element: HTMLElement, rect: Rect) {
    const { pageSize } = this;
    let slot = this.open?.place(rect.width, rect.height) ?? null;
    if (!slot) {
      const page = this.newPage(
        Math.max(pageSize, Math.ceil(rect.width)),
        Math.max(pageSize, Math.ceil(rect.height)),
      );
      // Oversized nodes get a page of their own and leave the open page as it was.
      if (page.width === pageSize && page.height === pageSize) this.open = page;
      slot = page.place(rect.width, rect.height)!;
    }
    Object.assign(element.style, {
      position: 'absolute',
      left: `${slot.x}px`,
      top: `${slot.y}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
    slot.page.element.append(element);
    return slot;
  }

  /**
   * Parks drawable pages that nothing in this frame's plan needs: a page promoted for a camera
   * that has moved on would otherwise be painted by Chrome every frame.
   */
  parkIdle(plans: Map<Page, unknown>, frameNumber: number, isPinned: (page: Page) => boolean) {
    for (const page of this.members.keys()) {
      if (page.drawable && !plans.has(page) && page.promotedFrame < frameNumber && !isPinned(page))
        page.setDrawable(false, frameNumber);
    }
  }

  private newPage(width: number, height: number) {
    const page = new Page(width, height);
    this.members.set(page, new Set());
    this.byElement.set(page.element, page);
    this.canvas.append(page.element);
    return page;
  }

  private drop(page: Page) {
    this.members.delete(page);
    this.byElement.delete(page.element);
    page.element.remove();
  }
}
