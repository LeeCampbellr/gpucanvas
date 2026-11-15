import type { GpuCanvasMode } from '../src/index';
import { parseEffect, type DemoEffect } from './effects';

/** Demo settings that come from the URL and the toolbar, with their names. */

/**
 * The engines the benchmark compares, fed the same components and camera path: gpucanvas's GPU
 * backend and its DOM backend, which is how real-HTML design canvases draw today, components moved
 * with a CSS transform.
 */
export const MODES: GpuCanvasMode[] = ['gpu', 'dom'];
/** Each engine's name in full, and short for the toolbar so it stays on one row. */
export const MODE_LABEL: Record<GpuCanvasMode, { full: string; short: string }> = {
  gpu: { full: 'gpucanvas', short: 'GPU' },
  dom: { full: 'DOM canvas', short: 'DOM' },
};

export const parseMode = (value: string | null): GpuCanvasMode =>
  MODES.includes(value as GpuCanvasMode) ? (value as GpuCanvasMode) : 'gpu';

/** The node counts the toolbar offers; `?n=` can ask for any other. */
export const NODE_COUNTS = [250, 1_000, 2_500, 5_000, 10_000];

/** What a click selects: a React component, a single element, or a whole screen. */
export type Pick = 'component' | 'element' | 'node';
export const PICKS: { id: Pick; label: string }[] = [
  { id: 'component', label: 'Components' },
  { id: 'element', label: 'Elements' },
  { id: 'node', label: 'Screens' },
];
export const parsePick = (value: string | null): Pick =>
  PICKS.find((pick) => pick.id === value)?.id ?? 'component';

const params = new URLSearchParams(location.search);

/**
 * The settings the page loaded with. The toolbar owns them after that; the URL only remembers
 * them across reloads.
 */
export const initial = {
  /** Requested engine; the GPU one falls back to DOM where the browser lacks it. */
  mode: parseMode(params.get('mode')),
  /** `?n=`: how many nodes, or null for the default that suits the device. */
  nodes: Number(params.get('n')) || null,
  /** `?hud=0` leaves only the canvas on screen, for recording footage. */
  hud: params.get('hud') !== '0',
  agents: params.get('agents') !== '0',
  edit: params.get('edit') !== '0',
  pick: parsePick(params.get('pick')),
  /** `?effect=glow` (or hue, blur, ripple, pixelate, grayscale): a shader on every component. */
  effect: parseEffect(params.get('effect')),
  /** `?theme=dark` or `light`, ahead of the theme saved last time. */
  theme: params.get('theme'),
  /** `?mountBudget=`: main-thread ms per mount frame, or null for the default. */
  mountBudget: Number(params.get('mountBudget')) || null,
  /** `?bench` runs the benchmark once the canvas is ready. */
  bench: params.has('bench'),
};

/** Reloads with `changes` in the URL: a new engine or node count needs a fresh canvas. */
export function reloadWith(changes: { mode?: GpuCanvasMode; n?: number }) {
  const next = new URLSearchParams(location.search);
  for (const [key, value] of Object.entries(changes)) next.set(key, String(value));
  location.search = next.toString();
}

/** Writes the toolbar settings into the URL without a reload, so a reload or mode switch keeps them. */
export function rememberToolbar(toolbar: {
  effect: DemoEffect | null;
  edit: boolean;
  pick: Pick;
  agents: boolean;
}) {
  const next = new URLSearchParams(location.search);
  const set = (key: string, value: string | null) =>
    value === null ? next.delete(key) : next.set(key, value);
  set('effect', toolbar.effect);
  set('edit', toolbar.edit ? null : '0');
  set('pick', toolbar.pick === 'component' ? null : toolbar.pick);
  set('agents', toolbar.agents ? null : '0');
  history.replaceState(null, '', `?${next}`);
}
