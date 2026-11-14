import { easeInOut, type Camera, type GpuCanvas } from '../src/index';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Zoom is interpolated in log space, so each halving of the zoom takes the same time. */
export const lerpCamera = (a: Camera, b: Camera, t: number): Camera => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), t)),
});

/** The camera that shows world point `x`, `y` in the middle of a `w` x `h` view. */
export const centeredOn = (x: number, y: number, zoom: number, w: number, h: number): Camera => ({
  x: x - w / zoom / 2,
  y: y - h / zoom / 2,
  zoom,
});

/** Animates the camera to `target`. */
export function flyTo(canvas: GpuCanvas, target: Camera, duration = 1400): Promise<void> {
  const from = canvas.getCamera();
  return new Promise((resolve) => {
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      canvas.setCamera(lerpCamera(from, target, easeInOut(t)));
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}
