import { RiArrowRightLine } from '@remixicon/react';
import { Badge, Button, flow } from '../../ui';
import { Cover, Logo, type Props } from '../parts';

export function Landing({ product, seed }: Props) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <nav className="flex items-center gap-8 px-12 py-5">
        <Logo product={product} />
        {['Product', 'Pricing', 'Customers', 'Blog'].map((item) => (
          <span key={item} className="text-body-medium text-text-secondary">
            {item}
          </span>
        ))}
        <div className="ms-auto flex gap-2">
          <Button variant="ghost" onClick={flow(1)}>
            Log in
          </Button>
          <Button onClick={flow(1)}>Start free</Button>
        </div>
      </nav>
      <section className="relative flex flex-col items-center gap-6 px-12 pt-14 text-center">
        <div
          className="absolute inset-x-0 top-0 -z-0 h-[520px] opacity-60"
          style={{
            background: 'radial-gradient(60% 60% at 50% 0%, var(--color-accent-200), transparent)',
          }}
        />
        <Badge className="relative">New: {product.features[seed % product.features.length]}</Badge>
        <h1 className="relative max-w-[860px] text-[64px] leading-[1.05] font-semibold tracking-tight text-text-primary">
          {product.tagline}
        </h1>
        <p className="relative max-w-[560px] text-title-3-regular text-text-secondary">
          {product.name} brings {product.features.slice(0, 2).join(' and ').toLowerCase()} together,
          so you spend less time on busywork.
        </p>
        <div className="relative flex gap-3">
          <Button trailingIcon={RiArrowRightLine} onClick={flow(1)}>
            Get started
          </Button>
          <Button variant="secondary" onClick={flow(1)}>
            Book a demo
          </Button>
        </div>
        <div className="relative mt-6 grid w-full max-w-[1100px] grid-cols-3 gap-4 text-start">
          {product.features.slice(0, 3).map((feature, i) => (
            <div
              key={feature}
              className="flex flex-col gap-3 rounded-2xl bg-background-primary-default p-5 shadow-md ring-1 ring-black/5 dark:ring-white/10"
            >
              <Cover product={product} seed={seed + i} className="h-36 w-full rounded-xl" />
              <span className="text-headline-semibold text-text-primary">{feature}</span>
              <span className="text-body-2-regular text-text-tertiary">
                Built for teams that move fast. Works on web, iOS and Android.
              </span>
            </div>
          ))}
        </div>
        <div className="relative mt-8 flex flex-col items-center gap-4">
          <span className="text-body-2-medium text-text-tertiary">Trusted by teams at</span>
          <div className="flex gap-12 text-title-3-semibold text-text-tertiary/70">
            {['Northwind', 'Acme', 'Globex', 'Initech', 'Umbrella', 'Hooli'].map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
