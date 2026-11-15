import { toBlob, type GpuCanvas } from '../src/index';

/** Downloads `node` as a PNG at twice its size. */
export async function saveSnapshot(canvas: GpuCanvas, node: HTMLElement) {
  const image = await canvas.snapshot(node, { scale: 2 }).catch((error: unknown) => {
    console.warn('[gpucanvas] snapshot failed', error);
    return null;
  });
  if (!image) return;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(await toBlob(image));
  link.download = 'screen.png';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
