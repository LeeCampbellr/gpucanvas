import type { Rect } from './rect';

/**
 * Draws `region` of `source`, a drawable element, into a `width` x `height` texture of its own
 * and reads it back. Throws before reading anything while the browser has no snapshot of
 * `source` yet.
 */
export function captureRegion(
  device: GPUDevice,
  source: HTMLElement,
  region: Rect,
  width: number,
  height: number,
): Promise<ImageData> {
  const texture = device.createTexture({
    size: { width, height },
    format: 'rgba8unorm',
    usage: GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });
  try {
    device.queue.drawElementImageToTexture(
      {
        source,
        sourceX: region.x,
        sourceY: region.y,
        sourceWidth: region.width,
        sourceHeight: region.height,
      },
      { texture, size: { width, height }, premultipliedAlpha: false },
    );
  } catch (error) {
    texture.destroy();
    throw error;
  }
  return readTexture(device, texture, width, height);
}

async function readTexture(device: GPUDevice, texture: GPUTexture, width: number, height: number) {
  // Buffer rows are padded to WebGPU's 256-byte copy alignment.
  const bytesPerRow = Math.ceil((width * 4) / 256) * 256;
  const buffer = device.createBuffer({
    size: bytesPerRow * height,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  const encoder = device.createCommandEncoder();
  encoder.copyTextureToBuffer({ texture }, { buffer, bytesPerRow }, { width, height });
  device.queue.submit([encoder.finish()]);
  try {
    await buffer.mapAsync(GPUMapMode.READ);
    const rows = new Uint8Array(buffer.getMappedRange());
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      pixels.set(rows.subarray(y * bytesPerRow, y * bytesPerRow + width * 4), y * width * 4);
    }
    return new ImageData(pixels, width, height);
  } finally {
    buffer.destroy();
    texture.destroy();
  }
}
