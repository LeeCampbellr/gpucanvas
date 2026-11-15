import { useState } from 'react';
import { RiArrowLeftSLine, RiArrowRightSLine } from '@remixicon/react';
import { cx } from './cx';
import { IconButton } from './button';

export interface Day {
  year: number;
  /** 1 to 12. */
  month: number;
  day: number;
}

const MONTHS = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });

/** One month to pick a day from, with arrows to the months around it. */
export function MonthCalendar({ value, onChange }: { value: Day; onChange: (day: Day) => void }) {
  const [shown, setShown] = useState({ year: value.year, month: value.month });
  const first = new Date(shown.year, shown.month - 1, 1);
  const days = new Date(shown.year, shown.month, 0).getDate();
  // Weeks start on Monday.
  const blank = (first.getDay() + 6) % 7;
  const move = (by: number) => {
    const next = new Date(shown.year, shown.month - 1 + by, 1);
    setShown({ year: next.getFullYear(), month: next.getMonth() + 1 });
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-body-semibold text-text-primary">{MONTHS.format(first)}</span>
        <span className="flex gap-1">
          <IconButton icon={RiArrowLeftSLine} aria-label="Previous" onClick={() => move(-1)} />
          <IconButton icon={RiArrowRightSLine} aria-label="Next" onClick={() => move(1)} />
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((name) => (
          <span key={name} className="text-caption-1-medium text-text-tertiary">
            {name}
          </span>
        ))}
        {Array.from({ length: blank }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const day = i + 1;
          const picked =
            value.year === shown.year && value.month === shown.month && value.day === day;
          return (
            <button
              key={day}
              onClick={() => onChange({ ...shown, day })}
              className={cx(
                'flex aspect-square items-center justify-center rounded-full text-body-2-medium',
                picked
                  ? 'bg-accent-500 text-white'
                  : 'text-text-primary hover:bg-background-secondary-default',
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
