import {
  Children,
  isValidElement,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { RiArrowDownSLine, RiCheckLine } from '@remixicon/react';
import { cx } from './cx';
import type { Icon } from './button';
import { Tab } from './tabs';

const FIELD =
  'w-full rounded-xl bg-background-primary-default text-body-2-regular text-text-primary ring-1 ring-border-button-default outline-none placeholder:text-text-tertiary focus:ring-2 focus:ring-accent-500';

function Field({ label, children }: { label?: string; children: ReactNode }) {
  return label ? (
    <label className="flex flex-col gap-1.5">
      <span className="text-body-2-medium text-text-secondary">{label}</span>
      {children}
    </label>
  ) : (
    children
  );
}

export function Input({
  label,
  placeholder,
  value,
  defaultValue,
  onChange,
  onEnter,
  leadingIcon: Leading,
  type = 'text',
}: {
  label?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onEnter?: () => void;
  leadingIcon?: Icon;
  type?: string;
}) {
  return (
    <Field label={label}>
      <span className="relative flex">
        {Leading && (
          <Leading className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-text-tertiary" />
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          onChange={(event) => onChange?.(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && onEnter?.()}
          className={cx(FIELD, 'h-10 pe-3', Leading ? 'ps-9' : 'ps-3')}
        />
      </span>
    </Field>
  );
}

export function Textarea({ label, defaultValue }: { label?: string; defaultValue?: string }) {
  return (
    <Field label={label}>
      <textarea defaultValue={defaultValue} rows={3} className={cx(FIELD, 'resize-none p-3')} />
    </Field>
  );
}

export function Checkbox({
  isSelected,
  onChange,
  children,
}: {
  isSelected: boolean;
  onChange: (value: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex items-center gap-2.5 text-body-2-regular text-text-secondary">
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(event) => onChange(event.target.checked)}
        className="size-[18px] accent-[var(--color-accent-500)]"
      />
      {children}
    </label>
  );
}

export function Switch({
  isSelected,
  onChange,
  'aria-label': ariaLabel,
}: {
  isSelected: boolean;
  onChange: (value: boolean) => void;
  'aria-label': string;
}) {
  return (
    <button
      role="switch"
      aria-checked={isSelected}
      aria-label={ariaLabel}
      onClick={() => onChange(!isSelected)}
      className={cx(
        'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200',
        isSelected ? 'bg-accent-500' : 'bg-neutral-300 dark:bg-neutral-600',
      )}
    >
      <span
        className={cx(
          'absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform duration-200',
          isSelected && 'translate-x-5',
        )}
      />
    </button>
  );
}

interface SelectItemProps {
  id: string;
  /** What the trigger shows when the item's content is not plain text. */
  textValue?: string;
  isDisabled?: boolean;
  children: ReactNode;
}

/** One option of a Select. The Select renders it; on its own it renders nothing. */
export const SelectItem = (_: SelectItemProps) => null;

/**
 * A dropdown: a trigger showing the chosen option and a listbox under it. Arrow keys, Home and
 * End move, Enter or Space picks, Escape or a press outside closes.
 */
export function Select({
  'aria-label': ariaLabel,
  selectedKey,
  defaultSelectedKey,
  onSelectionChange,
  triggerClassName,
  children,
}: {
  'aria-label': string;
  selectedKey?: string;
  defaultSelectedKey?: string;
  onSelectionChange?: (key: string) => void;
  triggerClassName?: string;
  children: ReactNode;
}) {
  const items = Children.toArray(children).flatMap((child) =>
    isValidElement<SelectItemProps>(child) ? [child.props] : [],
  );
  const [ownKey, setOwnKey] = useState(defaultSelectedKey ?? items[0]?.id);
  const value = selectedKey ?? ownKey;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const chosen = items.find((item) => item.id === value);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close, true);
    return () => document.removeEventListener('pointerdown', close, true);
  }, [open]);

  const show = () => {
    setActive(Math.max(0, items.indexOf(chosen!)));
    setOpen(true);
  };
  const pick = (item: SelectItemProps | undefined) => {
    if (!item || item.isDisabled) return;
    setOpen(false);
    trigger.current?.focus();
    if (item.id === value) return;
    setOwnKey(item.id);
    onSelectionChange?.(item.id);
  };
  /** The next enabled option from `from` in `step` direction, staying put at either end. */
  const move = (from: number, step: number) => {
    for (let i = from + step; i >= 0 && i < items.length; i += step) {
      if (!items[i].isDisabled) return i;
    }
    return active;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const keys: Record<string, () => void> = open
      ? {
          ArrowDown: () => setActive(move(active, 1)),
          ArrowUp: () => setActive(move(active, -1)),
          Home: () => setActive(move(-1, 1)),
          End: () => setActive(move(items.length, -1)),
          Enter: () => pick(items[active]),
          ' ': () => pick(items[active]),
          Escape: () => setOpen(false),
        }
      : { ArrowDown: show, ArrowUp: show, Enter: show, ' ': show };
    if (event.key === 'Tab') setOpen(false);
    const action = keys[event.key];
    if (!action) return;
    event.preventDefault();
    // Keys that drive the dropdown don't also reach the page's shortcuts.
    event.stopPropagation();
    action();
  };

  return (
    <div ref={root} className="relative shrink-0">
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        className={cx(
          FIELD,
          'flex h-10 items-center justify-between gap-2 ps-3 pe-2.5 text-start hover:bg-background-secondary-default',
          open && 'ring-2 ring-accent-500',
          triggerClassName,
        )}
      >
        <span className="truncate">{chosen?.textValue ?? chosen?.children}</span>
        <RiArrowDownSLine
          aria-hidden
          className={cx(
            'size-[18px] shrink-0 text-text-tertiary transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          // Pressing an option keeps focus on the trigger, so the keyboard still drives it.
          onMouseDown={(event) => event.preventDefault()}
          className="absolute top-full left-0 z-30 mt-2 flex min-w-full flex-col gap-0.5 rounded-xl border border-border-button-default bg-background-primary-default p-1 shadow-dropdown"
        >
          {items.map((item, i) => (
            <li
              key={item.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={item.id === value}
              aria-disabled={item.isDisabled || undefined}
              onPointerEnter={() => !item.isDisabled && setActive(i)}
              onClick={() => pick(item)}
              className={cx(
                'flex h-9 cursor-default items-center justify-between gap-3 rounded-lg ps-2.5 pe-2 text-body-2-medium whitespace-nowrap text-text-primary',
                i === active && !item.isDisabled && 'bg-background-secondary-default',
                item.isDisabled && 'text-text-tertiary opacity-60',
              )}
            >
              {item.children}
              <RiCheckLine
                aria-hidden
                className={cx('size-4 text-accent-500', item.id !== value && 'invisible')}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
