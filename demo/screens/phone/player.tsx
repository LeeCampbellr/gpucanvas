import { useEffect, useState } from 'react';
import {
  RiHeartFill,
  RiHeartLine,
  RiPauseFill,
  RiPlayFill,
  RiSkipBackFill,
  RiSkipForwardFill,
} from '@remixicon/react';
import { cx } from '../../ui';
import { Cover, type Props } from '../parts';
import { StatusBar } from './shell';

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

/** A player that plays: the time runs while it plays, and the skip buttons change the track. */
export function PhonePlayer({ product, seed }: Props) {
  const [track, setTrack] = useState(seed % product.entries.length);
  const [elapsed, setElapsed] = useState(70 + (seed % 49));
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  const entry = product.entries[track];
  const length = 150 + ((track * 37 + seed) % 120);
  const skip = (by: number) => {
    setTrack((t) => (t + by + product.entries.length) % product.entries.length);
    setElapsed(0);
  };
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setElapsed((s) => s + 0.25), 250);
    return () => clearInterval(id);
  }, [playing]);
  if (elapsed >= length) skip(1);
  return (
    <div
      className="flex h-full flex-col"
      style={{
        background: 'linear-gradient(180deg, var(--color-accent-700), var(--color-accent-950))',
      }}
    >
      <StatusBar light />
      <div className="flex flex-1 flex-col gap-6 px-7 pt-6 text-white">
        <Cover
          product={product}
          seed={seed + track}
          className={cx(
            'aspect-square w-full rounded-3xl shadow-xl transition-transform duration-500',
            !playing && 'scale-[0.92]',
          )}
        />
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-title-2-semibold">{entry.title}</span>
            <span className="text-body-regular text-white/70">{entry.sub}</span>
          </div>
          <button aria-label="Like" onClick={() => setLiked((v) => !v)}>
            {liked ? <RiHeartFill className="size-7" /> : <RiHeartLine className="size-7" />}
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-1.5 rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${(elapsed / length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-caption-1-regular text-white/70">
            <span>{clock(elapsed)}</span>
            <span>-{clock(length - elapsed)}</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-10">
          <button aria-label="Previous track" onClick={() => skip(-1)}>
            <RiSkipBackFill className="size-8" />
          </button>
          <button
            aria-label={playing ? 'Pause' : 'Play'}
            onClick={() => setPlaying((v) => !v)}
            className="flex size-18 items-center justify-center rounded-full bg-white text-accent-700"
          >
            {playing ? <RiPauseFill className="size-9" /> : <RiPlayFill className="size-9" />}
          </button>
          <button aria-label="Next track" onClick={() => skip(1)}>
            <RiSkipForwardFill className="size-8" />
          </button>
        </div>
      </div>
    </div>
  );
}
