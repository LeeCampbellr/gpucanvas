import { useState } from 'react';
import {
  RiCheckboxCircleFill,
  RiCloseLine,
  RiErrorWarningFill,
  RiInformationFill,
  RiNotification3Fill,
} from '@remixicon/react';
import { cx } from './cx';

const STATUS = {
  success: [RiCheckboxCircleFill, 'text-lime-500'],
  error: [RiErrorWarningFill, 'text-rose-500'],
  information: [RiInformationFill, 'text-blue-500'],
  neutral: [RiNotification3Fill, 'text-text-tertiary'],
} as const;

/** A notification card; its close button removes it. */
export function Notification({
  status,
  title,
  description,
  timestamp,
}: {
  status: keyof typeof STATUS;
  title: string;
  description: string;
  timestamp: string;
}) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  const [Glyph, tone] = STATUS[status];
  return (
    <div className="flex w-full gap-3 rounded-2xl bg-background-primary-default p-3.5 shadow-card ring-1 ring-black/5 dark:ring-white/10">
      <Glyph className={cx('mt-0.5 size-5 shrink-0', tone)} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-body-2-semibold text-text-primary">{title}</span>
          <span className="ms-auto shrink-0 text-caption-1-regular text-text-tertiary">
            {timestamp}
          </span>
        </div>
        <span className="line-clamp-2 text-body-2-regular text-text-secondary">{description}</span>
      </div>
      <button
        aria-label="Dismiss notification"
        onClick={() => setOpen(false)}
        className="-me-1 -mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg text-text-tertiary hover:bg-background-secondary-default"
      >
        <RiCloseLine className="size-4" />
      </button>
    </div>
  );
}

/** Someone is typing: three pulsing dots and a label. */
export function Thinking({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-body-2-regular text-text-tertiary">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 rounded-full bg-text-tertiary"
            style={{ animation: `thinking 1.2s ${i * 0.15}s infinite ease-in-out` }}
          />
        ))}
      </span>
      {label}
    </div>
  );
}
