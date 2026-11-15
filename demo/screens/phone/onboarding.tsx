import { useState } from 'react';
import { cx } from '../../ui';
import { Cover, Logo, type Props } from '../parts';
import { StatusBar } from './shell';

export function PhoneOnboarding({ product, seed }: Props) {
  const [step, setStep] = useState(seed % 3);
  return (
    <div className="flex h-full flex-col bg-accent-500 text-white">
      <StatusBar light />
      <div className="relative mx-6 mt-4 h-[400px] overflow-hidden rounded-[32px]">
        <Cover product={product} seed={seed} className="absolute inset-0 size-full" />
        <div className="absolute bottom-4 left-4">
          <Logo product={product} size="lg" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-8 pt-8">
        <span className="text-[32px] leading-tight font-semibold">{product.features[step]}</span>
        <span className="text-body-regular text-white/80">
          {product.tagline}. It takes less than a minute to start.
        </span>
        <div className="mt-auto mb-10 flex items-center justify-between">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cx(
                  'h-2 rounded-full bg-white transition-all',
                  i === step ? 'w-6' : 'w-2 opacity-40',
                )}
              />
            ))}
          </div>
          <button
            className="rounded-full bg-white px-6 py-3 text-body-semibold text-accent-700"
            onClick={() => setStep((s) => (s + 1) % 3)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
