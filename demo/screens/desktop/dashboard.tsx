import { useState } from 'react';
import { SegmentedControl, SegmentedControlItem } from '../../ui';
import { person } from '../../products';
import { AreaChart, Kpi, type Props, rotate } from '../parts';
import { AppPage } from './shell';

/** How each range scales the 30 day numbers, and where its series starts. */
const RANGES: Record<string, { factor: number; shift: number; compare: string }> = {
  '7d': { factor: 0.23, shift: 5, compare: 'This week vs. last' },
  '30d': { factor: 1, shift: 0, compare: 'This period vs. last' },
  '12m': { factor: 11.6, shift: 23, compare: 'This year vs. last' },
};

/** `value` with its number scaled, so `$3,214` reads `$37,282` over a year. Rates stay. */
const scaled = (value: string, factor: number) =>
  value.includes('%') || factor === 1
    ? value
    : value.replace(/[\d,]+(\.\d+)?/, (n) => {
        const scaledNumber = parseFloat(n.replace(/,/g, '')) * factor;
        return n.includes('.')
          ? scaledNumber.toLocaleString('en-US', {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })
          : Math.round(scaledNumber).toLocaleString('en-US');
      });

export function Dashboard({ product, seed }: Props) {
  const [range, setRange] = useState(new Set(['30d']));
  const current = RANGES[[...range][0]] ?? RANGES['30d'];
  const [name] = person(seed);
  return (
    <AppPage
      product={product}
      active={0}
      title={`Good ${seed % 2 ? 'afternoon' : 'morning'}, ${name.split(' ')[0]}`}
      actions={
        <SegmentedControl
          selectedKeys={range}
          onSelectionChange={(keys) => setRange(new Set(keys as Set<string>))}
          aria-label="Range"
        >
          <SegmentedControlItem id="7d">7 days</SegmentedControlItem>
          <SegmentedControlItem id="30d">30 days</SegmentedControlItem>
          <SegmentedControlItem id="12m">12 months</SegmentedControlItem>
        </SegmentedControl>
      }
    >
      <div className="grid grid-cols-4 gap-4">
        {product.kpis.map(([label, value, delta]) => (
          <Kpi key={label} label={label} value={scaled(value, current.factor)} delta={delta} />
        ))}
      </div>
      <div className="grid grid-cols-[1fr_340px] gap-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-border-button-default p-5">
          <div className="flex items-center justify-between">
            <span className="text-headline-semibold text-text-primary">{product.kpis[0][0]}</span>
            <span className="text-body-2-regular text-text-tertiary">{current.compare}</span>
          </div>
          <AreaChart seed={seed} shift={current.shift} height={420} />
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-border-button-default p-5">
          <span className="text-headline-semibold text-text-primary">
            Recent {product.things.toLowerCase()}
          </span>
          {rotate(product.entries, seed)
            .slice(0, 8)
            .map((entry) => (
              <div
                key={entry.title}
                className="flex items-center gap-3 border-b border-border-button-default pb-3 last:border-0"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body-2-medium text-text-primary">
                    {entry.title}
                  </span>
                  <span className="truncate text-caption-1-regular text-text-tertiary">
                    {entry.sub}
                  </span>
                </div>
                <span className="text-body-2-medium text-text-primary">{entry.value}</span>
              </div>
            ))}
        </div>
      </div>
    </AppPage>
  );
}
