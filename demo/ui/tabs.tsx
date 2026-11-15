import { createContext, type ReactNode, useContext, useState } from 'react';
import { cx } from './cx';

const Selection = createContext<{ selected: string; select: (id: string) => void }>({
  selected: '',
  select: () => {},
});

export function SegmentedControl({
  'aria-label': ariaLabel,
  selectedKeys,
  onSelectionChange,
  children,
}: {
  'aria-label': string;
  selectedKeys: Iterable<string>;
  onSelectionChange: (keys: Set<string>) => void;
  children: ReactNode;
}) {
  const selected = [...selectedKeys][0] ?? '';
  return (
    <Selection.Provider value={{ selected, select: (id) => onSelectionChange(new Set([id])) }}>
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        className="inline-flex shrink-0 gap-0.5 rounded-xl bg-background-secondary-default p-1"
      >
        {children}
      </div>
    </Selection.Provider>
  );
}

export function SegmentedControlItem({
  id,
  isDisabled,
  children,
}: {
  id: string;
  isDisabled?: boolean;
  children: ReactNode;
}) {
  const { selected, select } = useContext(Selection);
  return (
    <button
      role="radio"
      aria-checked={selected === id}
      disabled={isDisabled}
      onClick={() => select(id)}
      className={cx(
        'h-8 rounded-lg px-3 text-body-2-medium whitespace-nowrap transition-colors duration-150 disabled:opacity-40',
        selected === id
          ? 'bg-background-primary-default text-text-primary shadow-card'
          : 'text-text-tertiary hover:text-text-primary',
      )}
    >
      {children}
    </button>
  );
}

export function Tabs({
  defaultSelectedKey,
  children,
}: {
  defaultSelectedKey: string;
  children: ReactNode;
}) {
  const [selected, select] = useState(defaultSelectedKey);
  return <Selection.Provider value={{ selected, select }}>{children}</Selection.Provider>;
}

export function TabList({
  'aria-label': ariaLabel,
  children,
}: {
  'aria-label': string;
  children: ReactNode;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex gap-6 border-b border-border-button-default"
    >
      {children}
    </div>
  );
}

export function Tab({ id, count, children }: { id: string; count?: number; children: ReactNode }) {
  const { selected, select } = useContext(Selection);
  const active = selected === id;
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={() => select(id)}
      className={cx(
        '-mb-px flex h-10 items-center gap-2 border-b-2 text-body-2-medium',
        active ? 'border-accent-500 text-text-primary' : 'border-transparent text-text-tertiary',
      )}
    >
      {children}
      {count !== undefined && (
        <span
          className={cx(
            'rounded-full px-1.5 text-caption-1-medium',
            active
              ? 'bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-200'
              : 'bg-background-secondary-default',
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
