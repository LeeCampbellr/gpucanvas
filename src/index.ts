import { createDomCanvas } from './dom/backend';
import { createGpuCanvas as createGpuBackend, supportsGpuCanvas } from './gpu/backend';
import type { GpuCanvas, GpuCanvasOptions } from './types';

export type { AgentElement, AgentView, DescribeOptions } from './features/agent';
export { createAgentView } from './features/agent';
export type { Camera } from './core/camera';
export type { Point, Rect } from './core/rect';
export { fitCamera, screenToWorld, worldToScreen, zoomAt } from './core/camera';
export type { Editor, EditorOptions, TransformEvent } from './editor/editor';
export { bindEditor, createMarquee } from './editor/editor';
export type { EditorPick, Layer } from './editor/layers';
export type { Effect, EffectDefinition } from './features/effects';
export { defineEffect, EFFECTS as effects } from './features/effects';
export type { CursorMark, Mark, Marks } from './features/marks';
export { createMarks } from './features/marks';
export type { Filmstrip, FilmstripFrame, ImageDiff } from './features/snapshots';
export { diffImages, recordFilmstrip, toBlob } from './features/snapshots';
export type { AnimateEffectOptions, Easing } from './features/transitions';
export { animateEffect, easeInOut, swapNodes } from './features/transitions';
export type { GpuCanvas, GpuCanvasMode, GpuCanvasOptions, GpuCanvasStats } from './types';
export { supportsGpuCanvas };

/**
 * Creates an infinite canvas inside `host`. Uses WebGPU + HTML-in-Canvas when the browser has
 * both (Chrome 157+), and plain DOM transforms everywhere else; the API is the same.
 */
export async function createGpuCanvas(
  host: HTMLElement,
  options: GpuCanvasOptions = {},
): Promise<GpuCanvas> {
  const mode = options.mode ?? 'auto';
  if (mode === 'dom' || (mode === 'auto' && !supportsGpuCanvas())) {
    return createDomCanvas(host, options);
  }
  try {
    return await createGpuBackend(host, options);
  } catch (error) {
    if (mode === 'gpu') throw error;
    // The browser has both APIs, so a failure here is worth knowing about.
    console.warn('gpucanvas: the GPU backend failed to start, using DOM', error);
    return createDomCanvas(host, options);
  }
}
