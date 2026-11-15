import { useEffect, useState } from 'react';
import {
  RiCloseLine,
  RiCursorLine,
  RiEqualizerLine,
  RiGithubFill,
  RiMoonLine,
  RiPlayFill,
  RiStarFill,
  RiSunLine,
} from '@remixicon/react';
import {
  Button,
  cx,
  IconButton,
  SegmentedControl,
  SegmentedControlItem,
  Select,
  SelectItem,
} from '../ui';
import { BENCH_DURATION_MS } from '../bench';
import { DEMO_EFFECTS, type DemoEffect } from '../effects';
import { MODE_LABEL, MODES, NODE_COUNTS, parsePick, PICKS, type Pick } from '../settings';
import type { GpuCanvasMode } from '../../src/index';
import { format, PANEL, REPO } from './shared';

export function Toolbar({
  mode,
  gpuSupported,
  nodes,
  benchProgress,
  dark,
  canBench,
  effect,
  edit,
  pick,
  agents,
  onMode,
  onNodes,
  onEffect,
  onEdit,
  onPick,
  onAgents,
  onBench,
  onTheme,
}: {
  mode: GpuCanvasMode;
  gpuSupported: boolean;
  nodes: number;
  benchProgress: number | null;
  dark: boolean;
  canBench: boolean;
  effect: DemoEffect | null;
  edit: boolean;
  pick: Pick;
  agents: boolean;
  onMode: (mode: GpuCanvasMode) => void;
  onNodes: (nodes: number) => void;
  onEffect: (effect: DemoEffect | null) => void;
  onEdit: (edit: boolean) => void;
  onPick: (pick: Pick) => void;
  onAgents: (agents: boolean) => void;
  onBench: () => void;
  onTheme: () => void;
}) {
  const counts = NODE_COUNTS.includes(nodes)
    ? NODE_COUNTS
    : [...NODE_COUNTS, nodes].sort((a, b) => a - b);
  // On a phone the bar shows the logo and Edit or Interact; the rest opens below them.
  const [expanded, setExpanded] = useState(false);
  const stars = useStars();
  const more = cx('contents', !expanded && 'max-sm:hidden');
  return (
    <div
      className={cx(
        PANEL,
        'fixed inset-x-2 top-2 z-20 flex flex-wrap items-center gap-2 p-2 sm:top-4 sm:right-auto sm:left-4 sm:max-w-[calc(100vw-20rem)]',
      )}
    >
      <span className="ps-1" title="gpucanvas">
        <Logo />
      </span>
      <span className={more}>
        <SegmentedControl
          aria-label="Renderer"
          selectedKeys={[mode]}
          onSelectionChange={(keys) => {
            const key = [...keys][0];
            if (MODES.includes(key as GpuCanvasMode)) onMode(key as GpuCanvasMode);
          }}
        >
          {MODES.map((id) => (
            <SegmentedControlItem key={id} id={id} isDisabled={id === 'gpu' && !gpuSupported}>
              {MODE_LABEL[id].short}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        <Select
          aria-label="Components"
          selectedKey={String(nodes)}
          onSelectionChange={(key) => onNodes(Number(key))}
          triggerClassName="min-w-44"
        >
          {counts.map((count) => (
            <SelectItem key={count} id={String(count)} textValue={`${format(count)} components`}>
              {format(count)} components
            </SelectItem>
          ))}
        </Select>
      </span>
      <Separator />
      <SegmentedControl
        aria-label="Clicks"
        selectedKeys={[edit ? 'edit' : 'interact']}
        onSelectionChange={(keys) => onEdit([...keys][0] === 'edit')}
      >
        <SegmentedControlItem id="edit">Edit</SegmentedControlItem>
        <SegmentedControlItem id="interact">Interact</SegmentedControlItem>
      </SegmentedControl>
      <span className={more}>
        {edit && (
          <Select
            aria-label="What a click selects"
            selectedKey={pick}
            onSelectionChange={(key) => onPick(parsePick(key))}
            triggerClassName="min-w-36"
          >
            {PICKS.map(({ id, label }) => (
              <SelectItem key={id} id={id} textValue={label}>
                {label}
              </SelectItem>
            ))}
          </Select>
        )}
        <Select
          aria-label="Shader effect"
          selectedKey={effect ?? 'none'}
          onSelectionChange={(key) => onEffect(key === 'none' ? null : (key as DemoEffect))}
          triggerClassName="min-w-28"
        >
          <SelectItem id="none" textValue="No effect">
            No effect
          </SelectItem>
          {Object.entries(DEMO_EFFECTS).map(([id, { label, effect: shader }]) => (
            <SelectItem
              key={id}
              id={id}
              textValue={label}
              isDisabled={mode === 'dom' && !shader.css}
            >
              {mode === 'dom' && !shader.css ? `${label} (GPU only)` : label}
            </SelectItem>
          ))}
        </Select>
        <Separator />
        <IconButton
          icon={RiCursorLine}
          aria-label="Agent cursors"
          title={agents ? 'Agent cursors: on' : 'Agent cursors: off'}
          aria-pressed={agents}
          onClick={() => onAgents(!agents)}
          className={cx(
            agents && 'bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300',
          )}
        />
        <Button
          leadingIcon={RiPlayFill}
          disabled={!canBench || benchProgress !== null}
          onClick={onBench}
          className="min-w-32"
        >
          {benchProgress === null
            ? 'Benchmark'
            : `Running ${((benchProgress * BENCH_DURATION_MS) / 1000).toFixed(1)} s`}
        </Button>
        <IconButton
          icon={dark ? RiSunLine : RiMoonLine}
          aria-label={dark ? 'Light theme' : 'Dark theme'}
          onClick={onTheme}
        />
      </span>
      <GitHubLink stars={stars} className="sm:hidden" />
      <GitHubLink
        stars={stars}
        className={cx(PANEL, 'fixed right-4 bottom-4 z-10 h-11 ring-0 max-sm:hidden')}
      />
      <IconButton
        icon={expanded ? RiCloseLine : RiEqualizerLine}
        aria-label="More controls"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="ms-auto sm:hidden"
      />
    </div>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
      <rect width="24" height="24" rx="7" className="fill-button-primary" />
      <rect x="6" y="6" width="5" height="5" rx="1.5" className="fill-white" />
      <rect x="13" y="6" width="5" height="5" rx="1.5" className="fill-white/60" />
      <rect x="6" y="13" width="5" height="5" rx="1.5" className="fill-white/60" />
      <rect x="13" y="13" width="5" height="5" rx="1.5" className="fill-white/30" />
    </svg>
  );
}

/** The repository's star count, once GitHub answers. */
function useStars() {
  const [stars, setStars] = useState<number | null>(null);
  useEffect(() => {
    fetch(REPO.replace('github.com/', 'api.github.com/repos/'))
      .then((response) => (response.ok ? response.json() : null))
      .then((repo) => typeof repo?.stargazers_count === 'number' && setStars(repo.stargazers_count))
      .catch(() => {});
  }, []);
  return stars;
}

/** A link to the repository with its star count: in the toolbar on phones, bottom right otherwise. */
function GitHubLink({ stars, className }: { stars: number | null; className?: string }) {
  return (
    <a
      href={REPO}
      target="_blank"
      rel="noreferrer"
      title="gpucanvas on GitHub"
      className={cx(
        'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-body-2-medium text-text-primary ring-1 ring-border-button-default hover:bg-background-secondary-default',
        className,
      )}
    >
      <RiGithubFill className="size-5" aria-hidden />
      {stars === null ? (
        'GitHub'
      ) : (
        <>
          <RiStarFill className="size-4 text-yellow-400" aria-hidden />
          <span className="tabular-nums">{format(stars)}</span>
          <span className="sr-only">stars on GitHub</span>
        </>
      )}
    </a>
  );
}

const Separator = () => (
  <span aria-hidden className="mx-1 h-6 w-px bg-border-button-default max-sm:hidden" />
);
