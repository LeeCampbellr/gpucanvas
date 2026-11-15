import { NotificationsButton } from '../../ui';
import { person } from '../../products';
import { notificationsOf, type Props, rotate } from '../parts';
import { Phone, Row } from './shell';

export function PhoneHome({ product, seed }: Props) {
  const [name] = person(seed);
  return (
    <Phone tab={0}>
      <div className="flex items-center justify-between pt-2">
        <div className="flex flex-col">
          <span className="text-body-2-regular text-text-tertiary">Hi {name.split(' ')[0]}</span>
          <span className="text-title-2-semibold text-text-primary">{product.name}</span>
        </div>
        <NotificationsButton items={notificationsOf(product, seed)} />
      </div>
      <div className="relative flex flex-col gap-1 overflow-hidden rounded-3xl bg-accent-500 p-5 text-white shadow-lg">
        <div className="absolute -end-10 -top-10 size-40 rounded-full bg-white/15" />
        <span className="text-body-2-medium text-white/80">{product.hero.label}</span>
        <span className="text-[30px] leading-tight font-semibold">{product.hero.value}</span>
        <span className="text-body-2-regular text-white/80">{product.hero.sub}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {product.nav.slice(1, 5).map((item) => (
          <div key={item} className="flex flex-col items-center gap-1.5">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 dark:bg-accent-950">
              <product.icon className="size-5" />
            </span>
            <span className="truncate text-caption-1-medium text-text-secondary">{item}</span>
          </div>
        ))}
      </div>
      <span className="text-headline-semibold text-text-primary">Recent</span>
      {rotate(product.entries, seed)
        .slice(0, 4)
        .map((entry, i) => (
          <Row key={entry.title} entry={entry} product={product} seed={seed + i} />
        ))}
    </Phone>
  );
}
