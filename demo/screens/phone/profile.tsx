import { useState } from 'react';
import { Badge, Button, Switch, toast } from '../../ui';
import { person } from '../../products';
import type { Props } from '../parts';
import { Phone } from './shell';

export function PhoneProfile({ product, seed }: Props) {
  const [name, src] = person(seed + 3);
  const [on, setOn] = useState([true, false, true]);
  return (
    <Phone title="Profile" tab={3}>
      <div className="flex flex-col items-center gap-2 py-2">
        <img
          src={src}
          alt={name}
          className="size-20 rounded-full object-cover ring-4 ring-accent-100 dark:ring-accent-900"
        />
        <span className="text-title-3-semibold text-text-primary">{name}</span>
        <Badge color="primary">{product.name} member since 2023</Badge>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {product.kpis.slice(0, 3).map(([label, value]) => (
          <div
            key={label}
            className="flex flex-col items-center rounded-2xl bg-background-secondary-default p-3 text-center"
          >
            <span className="text-headline-semibold text-text-primary">{value}</span>
            <span className="text-caption-1-regular text-text-tertiary">{label}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col divide-y divide-border-button-default rounded-2xl border border-border-button-default">
        {['Notifications', 'Face ID', 'Share activity'].map((label, i) => (
          <label
            key={label}
            className="flex items-center justify-between px-4 py-3.5 text-body-medium text-text-primary"
          >
            {label}
            <Switch
              aria-label={label}
              isSelected={on[i]}
              onChange={(v) => setOn((p) => p.map((x, j) => (j === i ? v : x)))}
            />
          </label>
        ))}
      </div>
      <Button variant="secondary" onClick={(event) => toast(event.currentTarget, 'Signed out')}>
        Sign out
      </Button>
    </Phone>
  );
}
