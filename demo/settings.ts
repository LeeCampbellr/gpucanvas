import type { GpuCanvasMode } from '../src/index';

/** Demo settings that come from the URL and the toolbar, with their names. */

/**
 * The engines the benchmark compares, fed the same components and camera path: gpucanvas's GPU
 * backend and its DOM backend, which is how real-HTML design canvases draw today, components moved
 * with a CSS transform.
 */
export const MODES: GpuCanvasMode[] = ['gpu', 'dom'];
export const MODE_LABEL: Record<GpuCanvasMode, string> = {
  gpu: 'gpucanvas',
  dom: 'DOM canvas',
};

export const parseMode = (value: string | null): GpuCanvasMode =>
  MODES.includes(value as GpuCanvasMode) ? (value as GpuCanvasMode) : 'gpu';

/** What a click selects: a React component, a single element, or a whole screen. */
export type Pick = 'component' | 'element' | 'node';
export const PICKS: { id: Pick; label: string }[] = [
  { id: 'component', label: 'Components' },
  { id: 'element', label: 'Elements' },
  { id: 'node', label: 'Screens' },
];
export const parsePick = (value: string | null): Pick =>
  PICKS.find((pick) => pick.id === value)?.id ?? 'component';
