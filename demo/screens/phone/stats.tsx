import { useState } from 'react';
import { SegmentedControl, SegmentedControlItem } from '../../ui';
import { Bars, Kpi, type Props, Ring } from '../parts';
import { Phone } from './shell';

export function PhoneStats({ product, seed }: Props) {
  const [range, setRange] = useState(new Set(['week']));
  return (
    <Phone title="Activity" tab={2}>
      <SegmentedControl
        selectedKeys={range}
        onSelectionChange={(keys) => setRange(new Set(keys as Set<string>))}
        aria-label="Range"
      >
        <SegmentedControlItem id="week">Week</SegmentedControlItem>
        <SegmentedControlItem id="month">Month</SegmentedControlItem>
        <SegmentedControlItem id="year">Year</SegmentedControlItem>
      </SegmentedControl>
      <div className="flex items-center gap-4 rounded-3xl bg-background-secondary-default p-4">
        <Ring value={55 + (seed % 40)} size={120} label="of goal" />
        <div className="flex flex-col gap-1">
          <span className="text-body-2-regular text-text-tertiary">{product.hero.label}</span>
          <span className="text-title-2-semibold text-text-primary">{product.hero.value}</span>
          <span className="text-body-2-regular text-text-tertiary">{product.hero.sub}</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 rounded-3xl border border-border-button-default p-4">
        <span className="text-headline-semibold text-text-primary">{product.kpis[1][0]}</span>
        <Bars seed={seed} count={7} height={120} />
        <div className="flex justify-between text-caption-1-regular text-text-tertiary">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {product.kpis.slice(2, 4).map(([label, value, delta]) => (
          <Kpi key={label} label={label} value={value} delta={delta} />
        ))}
      </div>
    </Phone>
  );
}
