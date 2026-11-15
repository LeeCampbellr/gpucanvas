import { RiDownloadLine } from '@remixicon/react';
import { Button, Chip, toast } from '../../ui';
import { Bars, downloadCsv, type Props, Ring, rotate } from '../parts';
import { AppPage } from './shell';

export function Analytics({ product, seed }: Props) {
  const entries = rotate(product.entries, seed);
  return (
    <AppPage
      product={product}
      active={4}
      title="Reports"
      actions={
        <Button
          variant="secondary"
          leadingIcon={RiDownloadLine}
          onClick={(event) => {
            downloadCsv(`${product.name} report`, entries);
            toast(event.currentTarget, 'Report downloaded');
          }}
        >
          Download
        </Button>
      }
    >
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 flex flex-col gap-4 rounded-2xl border border-border-button-default p-5">
          <div className="flex items-center justify-between">
            <span className="text-headline-semibold text-text-primary">
              {product.kpis[1][0]}, by month
            </span>
            <Chip color="lime">{product.kpis[1][2]}</Chip>
          </div>
          <Bars seed={seed} count={12} height={330} />
          <div className="flex justify-between text-caption-1-regular text-text-tertiary">
            {['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'].map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border-button-default p-5">
          <Ring value={50 + (seed % 45)} size={220} label={product.kpis[2][0]} />
          <span className="text-body-2-regular text-text-tertiary">
            {product.kpis[2][1]} this period
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map((half) => (
          <div
            key={half}
            className="flex flex-col gap-3 rounded-2xl border border-border-button-default p-5"
          >
            <span className="text-headline-semibold text-text-primary">
              {half ? 'Rising' : 'Top'} {product.things.toLowerCase()}
            </span>
            {entries.slice(half * 3, half * 3 + 3).map((entry, i) => (
              <div key={entry.title} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-body-2-medium">
                  <span className="text-text-primary">{entry.title}</span>
                  <span className="text-text-tertiary">{entry.value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-background-tertiary-default">
                  <div
                    className="h-full rounded-full bg-accent-500"
                    style={{ width: `${90 - i * 22 - half * 10}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </AppPage>
  );
}
