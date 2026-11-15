import type { GpuCanvas, Rect } from '../src/index';
import { centeredOn, flyTo } from './fly';
import { frameOf } from './screens';
import { FLOW_EVENT, toast } from './ui';

/**
 * Back, Continue and the like move the camera to the neighboring screen in the same row. Returns
 * the function that stops listening.
 */
export function followFlows(canvas: GpuCanvas) {
  const onFlow = (event: Event) => {
    const from = canvas.getNodeOf(event.target as Element);
    const rect = from && canvas.getNodeRect(from);
    if (!rect) return;
    const step = (event as CustomEvent<number>).detail;
    const row = rect.y + rect.height / 2;
    const search = {
      x: step > 0 ? rect.x + rect.width : rect.x - rect.width * 3,
      y: rect.y - rect.height,
      width: rect.width * 3,
      height: rect.height * 3,
    };
    let next: Rect | null = null;
    for (const node of canvas.getNodesIn(search)) {
      const r = canvas.getNodeRect(node);
      if (!r || node === from || !frameOf(node)) continue;
      if (Math.abs(r.y + r.height / 2 - row) > rect.height / 2) continue;
      if (
        (r.x - rect.x) * step > 0 &&
        (!next || Math.abs(r.x - rect.x) < Math.abs(next.x - rect.x))
      )
        next = r;
    }
    if (!next)
      return void toast(event.target!, step > 0 ? 'Last screen in this flow' : 'First screen');
    const { zoom } = canvas.getCamera();
    const { clientWidth: w, clientHeight: h } = canvas.surface;
    flyTo(canvas, centeredOn(next.x + next.width / 2, next.y + next.height / 2, zoom, w, h), 700);
  };
  document.addEventListener(FLOW_EVENT, onFlow);
  return () => document.removeEventListener(FLOW_EVENT, onFlow);
}
