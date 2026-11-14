/**
 * Shelf packing: boxes fill rows left to right, and a box joins an existing row only when the row
 * is at least as tall and at most `tolerance` times its height, so short boxes don't waste tall
 * rows. Nothing is freed individually; `clear` empties the whole area.
 */
export class Shelves {
  private shelves: Array<{ x: number; y: number; height: number }> = [];
  /** Height taken by rows so far. */
  filled = 0;

  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly tolerance: number,
  ) {}

  /** Top left corner of a free `w` x `h` box, or null when it does not fit. */
  place(w: number, h: number): { x: number; y: number } | null {
    if (w > this.width || h > this.height) return null;
    let shelf = this.shelves.find(
      (candidate) =>
        candidate.height >= h &&
        candidate.height <= h * this.tolerance &&
        candidate.x + w <= this.width,
    );
    if (!shelf) {
      if (this.filled + h > this.height) return null;
      shelf = { x: 0, y: this.filled, height: h };
      this.shelves.push(shelf);
      this.filled += h;
    }
    const at = { x: shelf.x, y: shelf.y };
    shelf.x += w;
    return at;
  }

  clear() {
    this.shelves = [];
    this.filled = 0;
  }
}
