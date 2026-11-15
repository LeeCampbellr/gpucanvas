import { useState } from 'react';
import { RiCalendarLine } from '@remixicon/react';
import { Button, cx } from '../../ui';
import { type Props, rotate } from '../parts';
import { AppPage } from './shell';

const DAYS = ['Mon 9', 'Tue 10', 'Wed 11', 'Thu 12', 'Fri 13'];

/** What "New event" books, in order: a title and its free slot as [day, hour]. */
const NEW_EVENTS: [string, number, number][] = [
  ['Launch review', 2, 1],
  ['Design critique', 4, 4],
  ['Customer call', 0, 6],
  ['Team lunch', 3, 4],
  ['Roadmap sync', 1, 7],
];

/** A week whose free slots book on a click, and "New event" books the next one. */
export function CalendarPage({ product, seed }: Props) {
  const entries = rotate(product.entries, seed);
  const [events, setEvents] = useState(() =>
    DAYS.flatMap((_, d) =>
      Array.from({ length: 9 }, (_, hour) => hour)
        .filter((hour) => (hour * 3 + d + seed) % 5 === 0)
        .map((hour) => {
          const entry = entries[(hour + d * 2) % entries.length];
          return { day: d, hour, title: entry.title, sub: entry.sub, added: false };
        }),
    ),
  );
  const at = (day: number, hour: number) => events.find((e) => e.day === day && e.hour === hour);
  const book = (day: number, hour: number, title: string) =>
    setEvents((all) =>
      all.some((e) => e.day === day && e.hour === hour)
        ? all
        : [...all, { day, hour, title, sub: `${hour + 8}:00 to ${hour + 9}:00`, added: true }],
    );
  const next = () => {
    const free = NEW_EVENTS.find(([, day, hour]) => !at(day, hour));
    if (free) book(free[1], free[2], free[0]);
  };
  return (
    <AppPage
      product={product}
      active={3}
      title="This week"
      actions={
        <Button leadingIcon={RiCalendarLine} onClick={next}>
          New event
        </Button>
      }
    >
      <div className="grid flex-1 grid-cols-[56px_repeat(5,1fr)] overflow-hidden rounded-2xl border border-border-button-default">
        <div />
        {DAYS.map((day) => (
          <div
            key={day}
            className="border-s border-border-button-default p-3 text-body-2-medium text-text-secondary"
          >
            {day}
          </div>
        ))}
        {Array.from({ length: 9 }, (_, hour) => (
          <div key={hour} className="contents">
            <div className="border-t border-border-button-default p-2 text-caption-1-regular text-text-tertiary">
              {hour + 8}:00
            </div>
            {DAYS.map((day, d) => {
              const event = at(d, hour);
              return (
                <div
                  key={day}
                  className="h-16 border-s border-t border-border-button-default p-1"
                  onClick={() => book(d, hour, 'New event')}
                >
                  {event && (
                    <div
                      className={cx(
                        'h-full rounded-lg border-s-4 border-accent-500 px-2 py-1',
                        event.added
                          ? 'bg-accent-500 text-white shadow-md'
                          : 'bg-accent-50 dark:bg-accent-950',
                      )}
                    >
                      <span
                        className={cx(
                          'block truncate text-caption-1-medium',
                          !event.added && 'text-text-primary',
                        )}
                      >
                        {event.title}
                      </span>
                      <span
                        className={cx(
                          'block truncate text-caption-1-regular',
                          event.added ? 'text-white/80' : 'text-text-tertiary',
                        )}
                      >
                        {event.sub}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </AppPage>
  );
}
