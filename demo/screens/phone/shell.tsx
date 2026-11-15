import type { ReactNode } from 'react';
import {
  RiArrowLeftSLine,
  RiBookmarkLine,
  RiCompass3Line,
  RiHome5Line,
  RiUser3Line,
} from '@remixicon/react';
import { cx, flow, IconButton } from '../../ui';
import type { Entry } from '../../products';
import { Cover, type Props } from '../parts';

export function StatusBar({ light }: { light?: boolean }) {
  return (
    <div
      className={cx(
        'flex h-12 shrink-0 items-center justify-between px-8 pt-2 text-body-2-semibold',
        light ? 'text-white' : 'text-text-primary',
      )}
    >
      <span>9:41</span>
      <span className="flex items-end gap-0.5">
        {[4, 6, 8, 10].map((h) => (
          <span key={h} className="w-[3px] rounded-sm bg-current" style={{ height: h }} />
        ))}
        <span className="ms-1.5 h-[11px] w-[22px] rounded-[3px] border border-current p-px">
          <span className="block h-full w-3/4 rounded-[1px] bg-current" />
        </span>
      </span>
    </div>
  );
}

function TabBar({ active }: { active: number }) {
  const items = [RiHome5Line, RiCompass3Line, RiBookmarkLine, RiUser3Line];
  return (
    <div className="flex shrink-0 justify-around border-t border-border-button-default px-6 pt-3 pb-7">
      {items.map((Icon, i) => (
        <Icon
          key={i}
          className={cx('size-6', i === active ? 'text-accent-500' : 'text-text-tertiary')}
        />
      ))}
    </div>
  );
}

export function Phone({
  title,
  back,
  tab,
  children,
}: {
  title?: string;
  back?: boolean;
  tab?: number;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      {title && (
        <div className="flex items-center gap-2 px-5 pt-2 pb-3">
          {back && <IconButton icon={RiArrowLeftSLine} aria-label="Back" onClick={flow(-1)} />}
          <h1 className="text-title-2-semibold text-text-primary">{title}</h1>
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-5 pb-4">{children}</div>
      {tab !== undefined ? (
        <TabBar active={tab} />
      ) : (
        <div className="mx-auto mb-2 h-1.5 w-32 shrink-0 rounded-full bg-text-primary/80" />
      )}
    </div>
  );
}

export function Row({ entry, product, seed }: { entry: Entry } & Props) {
  return (
    <div className="flex items-center gap-3">
      <Cover product={product} seed={seed} className="size-12 shrink-0 rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body-medium text-text-primary">{entry.title}</span>
        <span className="truncate text-body-2-regular text-text-tertiary">{entry.sub}</span>
      </div>
      <span className="text-body-2-medium text-text-primary">{entry.value}</span>
    </div>
  );
}
