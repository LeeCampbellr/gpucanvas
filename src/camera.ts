import type { Point, Rect } from './rect';

export interface Camera {
  /** World coordinate shown at the viewport's top-left corner. */
  x: number;
  y: number;
  zoom: number;
}

/** A point in surface pixels (from the surface's top left) as world units. */
export const screenToWorld = (camera: Camera, point: Point): Point => ({
  x: camera.x + point.x / camera.zoom,
  y: camera.y + point.y / camera.zoom,
});

/** A world point as surface pixels. */
export const worldToScreen = (camera: Camera, point: Point): Point => ({
  x: (point.x - camera.x) * camera.zoom,
  y: (point.y - camera.y) * camera.zoom,
});

/** A world rect as surface pixels. */
export const rectToScreen = (camera: Camera, rect: Rect): Rect => ({
  ...worldToScreen(camera, rect),
  width: rect.width * camera.zoom,
  height: rect.height * camera.zoom,
});

const MIN_ZOOM = 0.02;
const MAX_ZOOM = 16;

const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

/** Zooms by `factor` while keeping the world point under (screenX, screenY) fixed. */
export function zoomAt(camera: Camera, screenX: number, screenY: number, factor: number): Camera {
  const zoom = clampZoom(camera.zoom * factor);
  const worldX = camera.x + screenX / camera.zoom;
  const worldY = camera.y + screenY / camera.zoom;
  return { x: worldX - screenX / zoom, y: worldY - screenY / zoom, zoom };
}

export function visibleWorldRect(
  camera: Camera,
  viewportWidth: number,
  viewportHeight: number,
): Rect {
  return {
    x: camera.x,
    y: camera.y,
    width: viewportWidth / camera.zoom,
    height: viewportHeight / camera.zoom,
  };
}

/** Fits `bounds` into the viewport with `padding` CSS pixels on each side. */
export function fitCamera(
  bounds: Rect,
  viewportWidth: number,
  viewportHeight: number,
  padding = 40,
): Camera {
  const zoom = clampZoom(
    Math.min(
      (viewportWidth - padding * 2) / Math.max(1, bounds.width),
      (viewportHeight - padding * 2) / Math.max(1, bounds.height),
    ),
  );
  return {
    x: bounds.x + bounds.width / 2 - viewportWidth / 2 / zoom,
    y: bounds.y + bounds.height / 2 - viewportHeight / 2 / zoom,
    zoom,
  };
}
