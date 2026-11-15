import { useState } from 'react';
import { RiSearchLine } from '@remixicon/react';
import { cx, Input } from '../../ui';
import { type Props, rotate, Status } from '../parts';
import { Phone, Row } from './shell';

export function PhoneList({ product, seed }: Props) {
  const [filter, setFilter] = useState(0);
  const statuses = [...new Set(product.entries.map((e) => e.status))].slice(0, 3);
  return (
    <Phone title={product.things} tab={1}>
      <Input placeholder={`Search ${product.things.toLowerCase()}`} leadingIcon={RiSearchLine} />
      <div className="flex gap-2">
        {['All', ...statuses].map((label, i) => (
          <button
            key={label}
            onClick={() => setFilter(i)}
            className={cx(
              'rounded-full px-3 py-1.5 text-body-2-medium',
              i === filter
                ? 'bg-accent-500 text-white'
                : 'bg-background-secondary-default text-text-secondary',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {rotate(product.entries, seed)
        .filter((entry) => filter === 0 || entry.status === statuses[filter - 1])
        .slice(0, 5)
        .map((entry, i) => (
          <div
            key={entry.title}
            className="flex flex-col gap-2 border-b border-border-button-default pb-3"
          >
            <Row entry={entry} product={product} seed={seed + i} />
            <div className="ps-15">
              <Status entry={entry} />
            </div>
          </div>
        ))}
    </Phone>
  );
}
