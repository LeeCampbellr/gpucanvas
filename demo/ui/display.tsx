import type { ReactNode } from 'react';
import { cx } from './cx';

const AVATAR = { xs: 'size-6', sm: 'size-8', md: 'size-10', lg: 'size-14' };

export function Avatar({
  size = 'md',
  src,
  alt,
}: {
  size?: keyof typeof AVATAR;
  src: string;
  alt: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={cx('shrink-0 rounded-full object-cover', AVATAR[size])}
    />
  );
}

export function Badge({
  color,
  className,
  children,
}: {
  color?: 'primary' | 'neutral' | 'success' | 'error';
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        'inline-flex h-6 w-fit items-center rounded-full px-2.5 text-caption-1-medium',
        color === 'primary'
          ? 'bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-200'
          : color === 'success'
            ? 'bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-300'
            : color === 'error'
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
              : 'bg-background-secondary-default text-text-secondary',
        className,
      )}
    >
      {children}
    </span>
  );
}

const TONE = {
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  lime: 'bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-300',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
  cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  neutral: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  gray: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200',
  soft: 'bg-accent-50 text-accent-700 dark:bg-accent-950 dark:text-accent-300',
} as const;

type ChipColor = keyof typeof TONE;

export function Chip({
  color = 'neutral',
  className,
  children,
}: {
  color?: ChipColor;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        'inline-flex h-6 w-fit items-center gap-1 rounded-md px-2 text-caption-1-medium whitespace-nowrap',
        TONE[color],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const Divider = () => <hr className="border-border-button-default" />;

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-background-secondary-default px-1.5 font-sans text-caption-1-medium text-text-secondary ring-1 ring-border-button-default">
      {children}
    </kbd>
  );
}

export function Breadcrumb({ children }: { children: ReactNode }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-body-2-regular">
      {children}
    </nav>
  );
}

export function BreadcrumbItem({
  href,
  current,
  children,
}: {
  href?: string;
  current?: boolean;
  children: ReactNode;
}) {
  return current ? (
    <span aria-current="page" className="text-text-primary">
      {children}
    </span>
  ) : (
    <>
      <a href={href} className="text-text-tertiary hover:text-text-primary">
        {children}
      </a>
      <span className="text-text-tertiary">/</span>
    </>
  );
}
