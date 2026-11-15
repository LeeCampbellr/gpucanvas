import { RiMapPin2Line } from '@remixicon/react';
import { Avatar, Button, flow } from '../../ui';
import { PEOPLE } from '../../products';
import { Cover, type Props, Status } from '../parts';
import { StatusBar } from './shell';

export function PhoneDetail({ product, seed }: Props) {
  const entry = product.entries[(seed + 1) % product.entries.length];
  return (
    <div className="relative flex h-full flex-col">
      <div className="relative h-[380px] shrink-0">
        <Cover product={product} seed={seed} className="absolute inset-0 size-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent" />
        <div className="relative">
          <StatusBar light />
        </div>
      </div>
      <div className="relative -mt-8 flex flex-1 flex-col gap-4 rounded-t-[32px] bg-background-primary-default px-6 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-title-2-semibold text-text-primary">{entry.title}</span>
            <span className="flex items-center gap-1 text-body-2-regular text-text-tertiary">
              <RiMapPin2Line className="size-4" /> {entry.sub}
            </span>
          </div>
          <Status entry={entry} />
        </div>
        <p className="text-body-regular text-text-secondary">
          {product.tagline}. {product.features.slice(0, 2).join(', ')}.
        </p>
        <div className="flex -space-x-2">
          {PEOPLE.slice(seed % 4, (seed % 4) + 4).map(([name, src]) => (
            <span key={name} className="rounded-full ring-2 ring-background-primary-default">
              <Avatar size="sm" src={src} alt={name} />
            </span>
          ))}
        </div>
        <div className="mt-auto mb-8 flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-caption-1-regular text-text-tertiary">Total</span>
            <span className="text-title-3-semibold text-text-primary">{entry.value}</span>
          </div>
          <div className="flex-1">
            <Button className="w-full" onClick={flow(1)}>
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
