import type { CSSProperties, ReactNode } from 'react';
import { cx, useToasts } from '../ui';
import type { Product } from '../products';
import type { Props } from './parts';
import { Dashboard } from './desktop/dashboard';
import { ListPage } from './desktop/list';
import { Board } from './desktop/board';
import { Detail } from './desktop/detail';
import { Landing } from './desktop/landing';
import { Pricing } from './desktop/pricing';
import { CalendarPage } from './desktop/calendar';
import { SettingsPage } from './desktop/settings';
import { SignIn } from './desktop/sign-in';
import { Analytics } from './desktop/analytics';
import { Gallery } from './desktop/gallery';
import { Messages } from './desktop/messages';
import { PhoneHome } from './phone/home';
import { PhoneList } from './phone/list';
import { PhoneDetail } from './phone/detail';
import { PhoneChat } from './phone/chat';
import { PhoneProfile } from './phone/profile';
import { PhoneOnboarding } from './phone/onboarding';
import { PhoneSignIn } from './phone/sign-in';
import { PhoneCheckout } from './phone/checkout';
import { PhoneStats } from './phone/stats';
import { PhonePlayer } from './phone/player';
import { PhoneNotifications } from './phone/notifications';
import { PhoneBooking } from './phone/booking';

/**
 * Product screens made of the demo's own components (ui.tsx), the way they sit on a design canvas: the
 * frame's name above a framed screen. A layout takes a product and a seed, so every cluster
 * shows its own brand, copy and numbers. Every screen is one canvas node and fully interactive.
 */
const DESKTOP = { width: 1440, height: 900 };

export const PHONE = { width: 402, height: 874 };

/** Room above the frame for its name. */
const LABEL = 30;

/**
 * Room around the frame for its shadow. A node's snapshot ends at its box, so anything that
 * should show, shadows included, stays inside it.
 */
const BLEED = 28;

function Frame({
  name,
  product,
  phone,
  children,
}: {
  name: string;
  product: Product;
  phone?: boolean;
  children: ReactNode;
}) {
  const [toastRoot, toasts] = useToasts();
  return (
    <div className="flex h-full flex-col" style={{ padding: `0 ${BLEED}px ${BLEED}px` }}>
      <span className="h-[30px] truncate text-body-2-medium text-text-tertiary">{name}</span>
      <div
        className={cx(
          'brand relative flex-1 overflow-hidden bg-background-primary-default shadow-xl ring-1 ring-black/5 dark:ring-white/10',
          phone ? 'rounded-[48px]' : 'rounded-2xl',
        )}
        style={{ '--brand': product.brand } as CSSProperties}
      >
        <div ref={toastRoot} className="relative h-full">
          {children}
          {toasts}
        </div>
      </div>
    </div>
  );
}

type Screen = (props: Props) => ReactNode;

const DESKTOP_SCREENS: Record<string, Screen> = {
  Dashboard,
  List: ListPage,
  Board,
  Detail,
  Landing,
  Pricing,
  Calendar: CalendarPage,
  Settings: SettingsPage,
  'Sign in': SignIn,
  Reports: Analytics,
  Library: Gallery,
  Messages,
};

const PHONE_SCREENS: Record<string, Screen> = {
  Home: PhoneHome,
  List: PhoneList,
  Detail: PhoneDetail,
  Assistant: PhoneChat,
  Profile: PhoneProfile,
  Welcome: PhoneOnboarding,
  'Sign in': PhoneSignIn,
  Checkout: PhoneCheckout,
  Activity: PhoneStats,
  Player: PhonePlayer,
  Notifications: PhoneNotifications,
  Booking: PhoneBooking,
};

/** Layouts that only make sense for some products: a player for audio, checkout for shops. */
const ONLY_FOR: Record<string, string[]> = {
  Player: ['Tempo', 'Airwaves'],
  Checkout: [
    'Forkful',
    'Atelier',
    'Pantry',
    'Encore',
    'Fern',
    'Wayfarer',
    'Roam',
    'Carely',
    'Stride',
  ],
  Booking: [
    'Wayfarer',
    'Carely',
    'Stride',
    'Roam',
    'Encore',
    'Nestwise',
    'Forkful',
    'Lumen',
    'Crew',
  ],
};

/** The layouts of `kind` that suit `product`. */
export function layoutsFor(kind: 'desktop' | 'phone', product: Product) {
  return Object.keys(kind === 'desktop' ? DESKTOP_SCREENS : PHONE_SCREENS).filter(
    (layout) => !ONLY_FOR[layout] || ONLY_FOR[layout].includes(product.name),
  );
}

export const DESKTOP_SIZE = {
  width: DESKTOP.width + BLEED * 2,
  height: DESKTOP.height + LABEL + BLEED,
};

export const PHONE_SIZE = { width: PHONE.width + BLEED * 2, height: PHONE.height + LABEL + BLEED };

/** A screen's frame name, the way a designer would name it: `Tempo / Web / Sign in`. */
export const screenName = (kind: 'desktop' | 'phone', layout: string, product: Product) =>
  `${product.name} / ${kind === 'desktop' ? 'Web' : 'iOS'} / ${layout === 'List' ? product.things : layout}`;

/** One framed screen of `product`. */
export function renderScreen(
  kind: 'desktop' | 'phone',
  layout: string,
  product: Product,
  seed: number,
) {
  const Screen = (kind === 'desktop' ? DESKTOP_SCREENS : PHONE_SCREENS)[layout];
  return (
    <Frame name={screenName(kind, layout, product)} product={product} phone={kind === 'phone'}>
      <Screen product={product} seed={seed} />
    </Frame>
  );
}
