import { useState } from 'react';
import { RiCheckLine } from '@remixicon/react';
import {
  Badge,
  Button,
  cx,
  Divider,
  SegmentedControl,
  SegmentedControlItem,
  toast,
} from '../../ui';
import { Logo, type Props } from '../parts';

export function Pricing({ product, seed }: Props) {
  const [yearly, setYearly] = useState(new Set(['yearly']));
  const annual = yearly.has('yearly');
  const [plan, setPlan] = useState<number | null>(null);
  const tiers = [
    ['Starter', 0, 'For trying it out'],
    ['Pro', 12 + (seed % 8), 'For growing teams'],
    ['Business', 39 + (seed % 20), 'For larger organizations'],
  ] as const;
  return (
    <div className="flex h-full flex-col items-center gap-8 bg-background-secondary-default px-16 pt-14">
      <Logo product={product} />
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-display-4-semibold text-text-primary">
          Simple pricing for {product.name}
        </h1>
        <p className="text-title-3-regular text-text-secondary">
          Start free. Upgrade when your team grows.
        </p>
      </div>
      <SegmentedControl
        selectedKeys={yearly}
        onSelectionChange={(keys) => setYearly(new Set(keys as Set<string>))}
        aria-label="Billing period"
      >
        <SegmentedControlItem id="monthly">Monthly</SegmentedControlItem>
        <SegmentedControlItem id="yearly">Yearly, 2 months free</SegmentedControlItem>
      </SegmentedControl>
      <div className="grid w-full max-w-[1100px] grid-cols-3 gap-5">
        {tiers.map(([name, price, blurb], i) => (
          <div
            key={name}
            className={cx(
              'flex flex-col gap-5 rounded-3xl bg-background-primary-default p-7 shadow-md ring-1',
              i === 1 ? 'ring-2 ring-accent-500' : 'ring-black/5 dark:ring-white/10',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-title-3-semibold text-text-primary">{name}</span>
              {i === 1 && <Badge color="primary">Most popular</Badge>}
            </div>
            <span className="text-body-2-regular text-text-tertiary">{blurb}</span>
            <span className="text-[44px] leading-none font-semibold text-text-primary">
              ${annual ? Math.round(price * 0.83) : price}
              <span className="text-body-regular text-text-tertiary"> / seat / month</span>
            </span>
            <Button
              variant={i === 1 ? 'primary' : 'secondary'}
              leadingIcon={plan === i ? RiCheckLine : undefined}
              onClick={(event) => {
                setPlan(i);
                toast(event.currentTarget, `${name} plan selected`);
              }}
            >
              {plan === i ? 'Your plan' : i === 0 ? 'Start free' : `Choose ${name}`}
            </Button>
            <Divider />
            {product.features.slice(0, 2 + i).map((feature) => (
              <span
                key={feature}
                className="flex items-center gap-2 text-body-2-regular text-text-secondary"
              >
                <RiCheckLine className="size-4 text-accent-500" /> {feature}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
