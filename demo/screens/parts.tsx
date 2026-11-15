import type { CSSProperties } from 'react';
import { Chip, cx } from '../ui';
import type { Entry, Product } from '../products';

export type Props = { product: Product; seed: number };

/** A seeded series, smooth enough to read as real data. */
function series(seed: number, count: number) {
  let value = 40 + (seed % 30);
  return Array.from({ length: count }, (_, i) => {
    value += Math.sin(seed * 0.7 + i * 0.9) * 9 + ((seed * (i + 3)) % 7) - 2.6;
    return Math.max(8, Math.min(96, value));
  });
}

/** `list` rotated by the seed, so the same entries come in a different order per screen. */
export const rotate = <T,>(list: readonly T[], seed: number) => {
  const start = seed % list.length;
  return [...list.slice(start), ...list.slice(0, start)];
};

export function Logo({ product, size = 'md' }: { product: Product; size?: 'sm' | 'md' | 'lg' }) {
  const Icon = product.icon;
  return (
    <span className="flex items-center gap-2">
      <span
        className={cx(
          'flex items-center justify-center rounded-xl bg-accent-500 text-white shadow-sm',
          size === 'sm' ? 'size-7' : size === 'md' ? 'size-9' : 'size-14 rounded-2xl',
        )}
      >
        <Icon className={size === 'lg' ? 'size-8' : 'size-5'} />
      </span>
      {size !== 'lg' && (
        <span className="text-headline-semibold text-text-primary">{product.name}</span>
      )}
    </span>
  );
}

/** Lines morph from one range to the next. */
const MORPH: CSSProperties = { transition: 'd 700ms cubic-bezier(0.2, 0.8, 0.2, 1)' };

export function AreaChart({
  seed,
  shift = 0,
  height = 220,
}: {
  seed: number;
  shift?: number;
  height?: number;
}) {
  const data = series(seed + shift, 24);
  const previous = series(seed + shift + 11, 24).map((v) => v * 0.8);
  const path = (values: number[]) =>
    values
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (values.length - 1)) * 100} ${100 - v}`)
      .join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`fill-${seed}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--color-accent-500)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--color-accent-500)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[25, 50, 75].map((y) => (
        <line
          key={y}
          x1="0"
          x2="100"
          y1={y}
          y2={y}
          stroke="var(--color-border-button-default)"
          strokeWidth="0.4"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <path d={`${path(data)} L100 100 L0 100 Z`} fill={`url(#fill-${seed})`} style={MORPH} />
      <path
        style={MORPH}
        d={path(previous)}
        fill="none"
        stroke="var(--color-text-tertiary)"
        strokeDasharray="3 3"
        strokeWidth="1.2"
        vectorEffect="non-scaling-stroke"
      />
      <path
        style={MORPH}
        d={path(data)}
        fill="none"
        stroke="var(--color-accent-500)"
        strokeWidth="2.2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function Bars({
  seed,
  count = 12,
  height = 160,
}: {
  seed: number;
  count?: number;
  height?: number;
}) {
  const data = series(seed, count);
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((v, i) => (
        <div
          key={i}
          className={cx(
            'flex-1 rounded-t-md',
            i === count - 1 ? 'bg-accent-500' : 'bg-accent-200 dark:bg-accent-800',
          )}
          style={{ height: `${v}%` }}
        />
      ))}
    </div>
  );
}

export function Ring({
  value,
  size = 140,
  label,
}: {
  value: number;
  size?: number;
  label: string;
}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--color-background-tertiary-default)"
          strokeWidth="10"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--color-accent-500)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(c * value) / 100} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-title-2-semibold text-text-primary">{value}%</span>
        <span className="text-caption-1-regular text-text-tertiary">{label}</span>
      </div>
    </div>
  );
}

export function Kpi({ label, value, delta }: { label: string; value: string; delta: string }) {
  const down = delta.startsWith('-');
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border-button-default bg-background-primary-default p-4">
      <span className="text-body-2-medium text-text-tertiary">{label}</span>
      <span className="text-title-1-semibold text-text-primary">{value}</span>
      <span
        className={cx('text-caption-1-medium', down ? 'text-text-tertiary' : 'text-accent-600')}
      >
        {delta}
      </span>
    </div>
  );
}

export function Status({ entry }: { entry: Entry }) {
  return (
    <Chip color={entry.tone} variant="subtle">
      {entry.status}
    </Chip>
  );
}

/** Downloads `entries` as a CSV file, the way an Export button would. */
export function downloadCsv(name: string, entries: Entry[]) {
  const rows = [
    ['Name', 'Details', 'Status', 'Value'],
    ...entries.map((e) => [e.title, e.sub, e.status, e.value]),
  ];
  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  link.download = `${name.toLowerCase().replaceAll(' ', '-')}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/** The bell's latest few, from the product's own entries. */
export const notificationsOf = (product: Product, seed: number) =>
  rotate(product.entries, seed + 1)
    .slice(0, 4)
    .map((entry, i) => ({
      title: `${entry.title}: ${entry.status.toLowerCase()}`,
      description: entry.sub,
      time: `${(i + 1) * 7}m`,
    }));

/** A cover from the product's pictures, or a brand gradient when it runs out. */
export function Cover({
  product,
  seed,
  className,
  style,
}: Props & { className?: string; style?: CSSProperties }) {
  const src = product.images[seed % (product.images.length + 1)];
  return src ? (
    <img
      src={src}
      alt=""
      draggable={false}
      className={cx('object-cover', className)}
      style={style}
    />
  ) : (
    <div
      className={cx('flex items-center justify-center overflow-hidden', className)}
      style={{
        background: `radial-gradient(circle at ${20 + (seed % 60)}% 30%, var(--color-accent-300), transparent 60%), linear-gradient(135deg, var(--color-accent-500), var(--color-accent-800))`,
        ...style,
      }}
    >
      <product.icon
        className="size-1/2 max-h-48 max-w-48 text-white/20"
        style={{ rotate: `${(seed % 5) * 6 - 12}deg` }}
      />
    </div>
  );
}
