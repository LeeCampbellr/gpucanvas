import { type ReactNode, useEffect, useRef, useState } from 'react';
import { RiCheckLine, RiNotification3Line } from '@remixicon/react';
import { cx } from './cx';
import { type Icon, IconButton } from './button';

/**
 * An icon button that opens a panel under it. A press outside or Escape closes it; `children`
 * gets `close` for items that should.
 */
function PopoverButton({
  icon,
  'aria-label': label,
  dot,
  className,
  panelClassName,
  children,
}: {
  icon: Icon;
  'aria-label': string;
  /** A small accent dot on the button, like unread notifications. */
  dot?: boolean;
  className?: string;
  panelClassName?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: globalThis.KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return (
    <span ref={root} className={cx('relative inline-flex', className)}>
      <IconButton
        icon={icon}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
        className={cx(open && 'bg-background-secondary-default')}
      />
      {dot && (
        <span className="pointer-events-none absolute top-2 right-2 size-2 rounded-full bg-accent-500 ring-2 ring-background-primary-default" />
      )}
      {open && (
        <div
          className={cx(
            'absolute top-full right-0 z-30 mt-2 flex flex-col gap-0.5 rounded-xl border border-border-button-default bg-background-primary-default p-1 text-start shadow-dropdown',
            panelClassName,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </span>
  );
}

/** A menu of actions behind an icon button. */
export function MenuButton({
  icon,
  'aria-label': label,
  className,
  items,
}: {
  icon: Icon;
  'aria-label': string;
  className?: string;
  items: { label: string; selected?: boolean; onSelect: (target: HTMLElement) => void }[];
}) {
  return (
    <PopoverButton icon={icon} aria-label={label} className={className} panelClassName="w-52">
      {(close) =>
        items.map((item) => (
          <button
            key={item.label}
            role="menuitem"
            onClick={(event) => {
              close();
              item.onSelect(event.currentTarget);
            }}
            className="flex h-9 items-center justify-between gap-3 rounded-lg ps-2.5 pe-2 text-body-2-medium whitespace-nowrap text-text-primary hover:bg-background-secondary-default"
          >
            {item.label}
            {item.selected && <RiCheckLine className="size-4 text-accent-500" />}
          </button>
        ))
      }
    </PopoverButton>
  );
}

/** A bell with an unread dot that opens the latest notifications. */
export function NotificationsButton({
  items,
}: {
  items: { title: string; description: string; time: string }[];
}) {
  const [unread, setUnread] = useState(true);
  return (
    <PopoverButton
      icon={RiNotification3Line}
      aria-label="Notifications"
      dot={unread}
      panelClassName="w-80 p-2"
    >
      {(close) => (
        <>
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-body-2-semibold text-text-primary">Notifications</span>
            <button
              className="text-caption-1-medium text-text-link"
              onClick={() => {
                setUnread(false);
                close();
              }}
            >
              Mark all as read
            </button>
          </div>
          {items.map((item, i) => (
            <div key={item.title} className="flex gap-3 rounded-lg px-2 py-2">
              <span
                className={cx(
                  'mt-1.5 size-2 shrink-0 rounded-full',
                  unread && i < 2 ? 'bg-accent-500' : 'bg-transparent',
                )}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body-2-medium text-text-primary">{item.title}</span>
                <span className="truncate text-caption-1-regular text-text-tertiary">
                  {item.description}
                </span>
              </div>
              <span className="text-caption-1-regular text-text-tertiary">{item.time}</span>
            </div>
          ))}
        </>
      )}
    </PopoverButton>
  );
}
