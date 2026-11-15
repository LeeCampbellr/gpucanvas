import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Badge, cx } from '../ui';
import { MODE_LABEL } from '../settings';
import type { GpuCanvas } from '../../src/index';
import { format, PANEL } from './shared';

const SPARK_FRAMES = 120;
const SPARK_MAX_MS = 50;
/** Frame rates the graph marks with a dashed line, at their frame time to a tenth of a ms. */
const GUIDE_FPS = [60, 120];

/** Frame rate measured from requestAnimationFrame, with a frame time graph. */
export function Meter({
  canvas,
  mounted,
  total,
}: {
  canvas: GpuCanvas | null;
  mounted: number;
  total: number;
}) {
  const path = useRef<SVGPathElement>(null);
  const [fps, setFps] = useState(0);
  const [stats, setStats] = useState(() => canvas?.getStats());

  useEffect(() => {
    const frames: number[] = [];
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      frames.push(now - last);
      if (frames.length > SPARK_FRAMES) frames.shift();
      last = now;
      let d = '';
      const step = 100 / (SPARK_FRAMES - 1);
      const offset = SPARK_FRAMES - frames.length;
      for (let i = 0; i < frames.length; i++) {
        const y = 40 - (Math.min(frames[i], SPARK_MAX_MS) / SPARK_MAX_MS) * 40;
        d += `${i ? 'L' : 'M'}${((offset + i) * step).toFixed(2)} ${y.toFixed(2)}`;
      }
      path.current?.setAttribute('d', d);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const timer = setInterval(() => {
      const recent = frames.slice(-30);
      const average = recent.reduce((sum, value) => sum + value, 0) / Math.max(1, recent.length);
      setFps(Math.round(1000 / average));
      if (canvas) setStats(canvas.getStats());
    }, 250);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
    };
  }, [canvas]);

  const budget = (ms: number) => 40 - (ms / SPARK_MAX_MS) * 40;
  return (
    <div
      className={cx(
        PANEL,
        'fixed right-2 bottom-2 z-20 px-3 py-1.5 sm:top-4 sm:right-4 sm:bottom-auto sm:w-72 sm:p-4',
      )}
    >
      <div className="flex items-center justify-between max-sm:hidden">
        <span className="text-body-2-medium text-text-secondary">Frame rate</span>
        {stats && (
          <Badge color={stats.mode === 'gpu' ? 'primary' : 'neutral'}>
            {MODE_LABEL[stats.mode].full}
          </Badge>
        )}
      </div>
      <div className="flex items-baseline gap-1.5 sm:mt-1">
        <span className="text-display-2-semibold text-text-primary tabular-nums max-sm:text-title-2-semibold">
          {fps}
        </span>
        <span className="text-body-medium text-text-secondary">fps</span>
      </div>
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className="mt-2 h-12 w-full overflow-visible max-sm:hidden"
        aria-hidden
      >
        {GUIDE_FPS.map((rate) => {
          const y = budget(+(1000 / rate).toFixed(1));
          return (
            <line
              key={rate}
              x1="0"
              x2="100"
              y1={y}
              y2={y}
              className="stroke-border-button-default"
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        <path
          ref={path}
          fill="none"
          className="stroke-text-primary"
          strokeWidth="1.5"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1 flex justify-between text-caption-2-regular text-text-tertiary max-sm:hidden">
        <span>{`last ${SPARK_FRAMES} frames`}</span>
        <span>{`dashed: ${GUIDE_FPS.join(' and ')} fps`}</span>
      </div>
      <dl className="mt-3 flex flex-col gap-1.5 border-t border-border-button-default pt-3 text-body-2-regular max-sm:hidden">
        {mounted < total ? (
          <Row label="Mounting">
            {format(mounted)} / {format(total)}
          </Row>
        ) : (
          <Row label="Components">{format(stats?.nodes ?? total)}</Row>
        )}
        <Row label="In view">{format(stats?.visible ?? 0)}</Row>
        {Number.isFinite(stats?.frameMs) && (
          <Row label="Main thread per frame">{stats!.frameMs.toFixed(2)} ms</Row>
        )}
        {stats?.mode === 'gpu' && <Row label="Waiting for pixels">{format(stats.pending)}</Row>}
      </dl>
      {mounted < total && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-background-secondary-default">
          <div
            className="h-full rounded-full bg-button-primary transition-[width] duration-200"
            style={{ width: `${(mounted / total) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="text-text-primary tabular-nums">{children}</dd>
    </div>
  );
}
