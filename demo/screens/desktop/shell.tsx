import type { ReactNode } from 'react';
import { RiSearchLine } from '@remixicon/react';
import { Avatar, Breadcrumb, BreadcrumbItem, cx, Input, NotificationsButton } from '../../ui';
import { person, type Product } from '../../products';
import { Logo, notificationsOf } from '../parts';

export function Sidebar({ product, active = 0 }: { product: Product; active?: number }) {
  const [name, src] = person(product.name.length);
  return (
    <aside className="flex w-[232px] shrink-0 flex-col gap-1 border-e border-border-button-default bg-background-secondary-default p-4">
      <div className="mb-5 px-2">
        <Logo product={product} />
      </div>
      <div className="mb-3">
        <Input placeholder="Search" leadingIcon={RiSearchLine} />
      </div>
      {product.nav.map((item, index) => (
        <span
          key={item}
          className={cx(
            'rounded-xl px-3 py-2 text-body-medium',
            index === active
              ? 'bg-background-primary-default text-text-primary shadow-card'
              : 'text-text-secondary',
          )}
        >
          {item}
        </span>
      ))}
      <div className="mt-auto flex items-center gap-2 rounded-xl p-2">
        <Avatar size="sm" src={src} alt={name} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-body-2-medium text-text-primary">{name}</span>
          <span className="truncate text-caption-1-regular text-text-tertiary">
            {product.name} team
          </span>
        </div>
      </div>
    </aside>
  );
}

export function AppPage({
  product,
  active,
  title,
  actions,
  children,
}: {
  product: Product;
  active: number;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full">
      <Sidebar product={product} active={active} />
      <main className="flex min-w-0 flex-1 flex-col gap-6 overflow-hidden p-8">
        <header className="flex items-center gap-4">
          <div className="flex flex-col gap-1">
            <Breadcrumb>
              <BreadcrumbItem href="#">{product.name}</BreadcrumbItem>
              <BreadcrumbItem current>{product.nav[active]}</BreadcrumbItem>
            </Breadcrumb>
            <h1 className="text-title-1-semibold text-text-primary">{title}</h1>
          </div>
          <div className="ms-auto flex items-center gap-2">
            {actions}
            <NotificationsButton items={notificationsOf(product, active)} />
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
