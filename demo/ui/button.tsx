import { type ButtonHTMLAttributes, type ComponentType, useEffect, useState } from 'react';
import { RiCheckLine } from '@remixicon/react';
import { cx } from './cx';

export type Icon = ComponentType<{ className?: string }>;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium';
  leadingIcon?: Icon;
  trailingIcon?: Icon;
  /** Shown with a check for two seconds after a click, like "Saved". */
  done?: string;
};

const BUTTON = {
  primary: 'bg-accent-500 text-white shadow-sm hover:bg-accent-600 disabled:opacity-50',
  secondary:
    'bg-background-primary-default text-text-primary ring-1 ring-border-button-default shadow-sm hover:bg-background-secondary-default',
  ghost:
    'bg-accent-100 text-accent-700 hover:bg-accent-200 dark:bg-accent-900 dark:text-accent-300',
};

export function Button({
  variant = 'primary',
  size = 'medium',
  leadingIcon: Leading,
  trailingIcon: Trailing,
  done,
  className,
  children,
  onClick,
  ...rest
}: ButtonProps) {
  const [showDone, setShowDone] = useState(false);
  useEffect(() => {
    if (!showDone) return;
    const timer = setTimeout(() => setShowDone(false), 2000);
    return () => clearTimeout(timer);
  }, [showDone]);
  if (showDone) {
    Leading = RiCheckLine;
    Trailing = undefined;
    children = done;
  }
  return (
    <button
      {...rest}
      onClick={(event) => {
        onClick?.(event);
        if (done) setShowDone(true);
      }}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap transition-colors',
        size === 'small' ? 'h-9 px-3 text-body-2-medium' : 'h-10 px-4 text-body-2-semibold',
        BUTTON[variant],
        className,
      )}
    >
      {Leading && <Leading className="size-[18px]" />}
      {children}
      {Trailing && <Trailing className="size-[18px]" />}
    </button>
  );
}

export function IconButton({
  icon: Glyph,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: Icon }) {
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-text-secondary ring-1 ring-border-button-default hover:bg-background-secondary-default',
        className,
      )}
    >
      <Glyph className="size-5" />
    </button>
  );
}
