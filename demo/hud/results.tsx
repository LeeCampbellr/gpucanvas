import { cx } from '../ui';
import { JANK_MS, resultKey, type BenchResult } from '../bench';
import { DEMO_EFFECTS, type DemoEffect } from '../effects';
import { MODE_LABEL, MODES } from '../settings';
import type { GpuCanvasMode } from '../../src/index';
import { format, PANEL } from './shared';

/** The latest run of every engine at this node count, fastest first. */
export function Results({
  nodes,
  effect,
  results,
}: {
  nodes: number;
  effect: DemoEffect | null;
  results: Record<string, BenchResult>;
}) {
  const runs = MODES.map((mode) => ({
    mode,
    result: results[resultKey(nodes, mode, effect)] as BenchResult | undefined,
  }));
  if (!runs.some((run) => run.result)) return null;
  const best = Math.max(60, ...runs.map((run) => run.result?.avgFps ?? 0));
  const ours = runs.find((run) => run.mode === 'gpu')?.result;
  const others = runs.filter((run) => run.mode !== 'gpu' && run.result);
  const rival = others.reduce<(typeof others)[number] | null>(
    (top, run) => (!top || run.result!.avgFps > top.result!.avgFps ? run : top),
    null,
  );
  const ranked = [...runs].sort((a, b) => (b.result?.avgFps ?? -1) - (a.result?.avgFps ?? -1));
  return (
    <div
      className={cx(
        PANEL,
        'fixed right-4 bottom-4 z-20 w-80 p-4 max-sm:inset-x-2 max-sm:bottom-14 max-sm:w-auto',
      )}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-body-semibold text-text-primary">Benchmark</span>
        <span className="text-body-2-regular text-text-secondary">
          {format(nodes)} components{effect ? `, ${DEMO_EFFECTS[effect].label.toLowerCase()}` : ''}
        </span>
      </div>
      {ours && rival && (
        <p className="mt-2 text-title-2-semibold text-text-primary">
          {(ours.avgFps / rival.result!.avgFps).toFixed(1)}x {MODE_LABEL[rival.mode].full}
        </p>
      )}
      <div className="mt-3 flex flex-col gap-3">
        {ranked.map(({ mode, result }) => (
          <ResultRow key={mode} mode={mode} result={result} best={best} />
        ))}
      </div>
    </div>
  );
}

function ResultRow({
  mode,
  result,
  best,
}: {
  mode: GpuCanvasMode;
  result?: BenchResult;
  best: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-body-2-medium">
        <span className="text-text-primary">{MODE_LABEL[mode].full}</span>
        <span className="text-text-primary tabular-nums">
          {result ? `${result.avgFps} fps` : 'not run'}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-background-secondary-default">
        <div
          className={cx(
            'h-full rounded-full',
            mode === 'gpu' ? 'bg-button-primary' : 'bg-text-tertiary',
          )}
          style={{ width: `${((result?.avgFps ?? 0) / best) * 100}%` }}
        />
      </div>
      {result && (
        <div className="mt-1 flex justify-between text-caption-1-regular text-text-secondary tabular-nums">
          <span>p95 {result.p95Ms} ms</span>
          <span>{`${result.jankPercent}% frames over ${JANK_MS} ms`}</span>
        </div>
      )}
    </div>
  );
}
