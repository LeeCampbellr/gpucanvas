import { useState } from 'react';
import {
  RiCheckLine,
  RiHeartFill,
  RiHeartLine,
  RiMessage3Line,
  RiShareLine,
  RiStarFill,
} from '@remixicon/react';
import { Button, Divider, flow, IconButton, toast } from '../../ui';
import { Cover, Logo, type Props, Status } from '../parts';

export function Detail({ product, seed }: Props) {
  const entry = product.entries[seed % product.entries.length];
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex h-full flex-col">
      <nav className="flex items-center gap-8 border-b border-border-button-default px-10 py-4">
        <Logo product={product} />
        {product.nav.slice(0, 4).map((item) => (
          <span key={item} className="text-body-medium text-text-secondary">
            {item}
          </span>
        ))}
        <div className="ms-auto flex gap-2">
          <Button variant="secondary" onClick={flow(1)}>
            Sign in
          </Button>
          <Button onClick={flow(1)}>Get started</Button>
        </div>
      </nav>
      <div className="grid flex-1 grid-cols-[1fr_380px] gap-10 p-10">
        <div className="flex flex-col gap-6">
          <div className="grid h-[420px] grid-cols-[2fr_1fr] gap-3">
            <div className="relative overflow-hidden rounded-2xl">
              <Cover product={product} seed={seed} className="absolute inset-0 size-full" />
            </div>
            <div className="grid min-h-0 grid-rows-2 gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="relative overflow-hidden rounded-2xl">
                  <Cover product={product} seed={seed + i} className="absolute inset-0 size-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-display-4-semibold text-text-primary">{entry.title}</h1>
              <span className="flex items-center gap-2 text-body-regular text-text-secondary">
                <RiStarFill className="size-4 text-accent-500" /> 4.{(seed % 5) + 5} ({120 + seed}{' '}
                reviews), {entry.sub}
              </span>
            </div>
            <div className="ms-auto flex gap-2">
              <IconButton
                icon={RiShareLine}
                aria-label="Share"
                onClick={(event) => {
                  void navigator.clipboard?.writeText(location.href).catch(() => {});
                  toast(event.currentTarget, 'Link copied');
                }}
              />
              <IconButton
                icon={saved ? RiHeartFill : RiHeartLine}
                aria-label="Save"
                onClick={() => setSaved((v) => !v)}
              />
            </div>
          </div>
          <p className="max-w-[640px] text-body-regular text-text-secondary">
            {product.tagline}. {product.features.join('. ')}. Everything you need in one place,
            ready when you are.
          </p>
        </div>
        <div className="flex h-fit flex-col gap-4 rounded-2xl p-6 shadow-lg ring-1 ring-black/5 dark:ring-white/10">
          <div className="flex items-baseline justify-between">
            <span className="text-title-1-semibold text-text-primary">{entry.value}</span>
            <Status entry={entry} />
          </div>
          <Divider />
          {product.features.slice(0, 3).map((feature) => (
            <span
              key={feature}
              className="flex items-center gap-2 text-body-regular text-text-secondary"
            >
              <RiCheckLine className="size-4 text-accent-500" /> {feature}
            </span>
          ))}
          <Button onClick={flow(1)}>Continue</Button>
          <Button variant="secondary" leadingIcon={RiMessage3Line} onClick={flow(1)}>
            Ask a question
          </Button>
        </div>
      </div>
    </div>
  );
}
