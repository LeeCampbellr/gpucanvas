import { useState } from 'react';
import { Button, Input, Switch, Tab, TabList, Tabs, Textarea, toast } from '../../ui';
import { person, type Product } from '../../products';
import type { Props } from '../parts';
import { AppPage } from './shell';

export function SettingsPage({ product, seed }: Props) {
  const [name] = person(seed);
  const [photo, setPhoto] = useState(seed);
  const src = person(photo)[1];
  const [toggles, setToggles] = useState([true, false, true]);
  return (
    <AppPage
      product={product}
      active={4}
      title="Settings"
      actions={
        <Button done="Saved" onClick={(event) => toast(event.currentTarget, 'Changes saved')}>
          Save changes
        </Button>
      }
    >
      <Tabs defaultSelectedKey="profile">
        <TabList aria-label="Settings">
          <Tab id="profile">Profile</Tab>
          <Tab id="notifications">Notifications</Tab>
          <Tab id="billing">Billing</Tab>
          <Tab id="security">Security</Tab>
        </TabList>
      </Tabs>
      <div className="grid max-w-[880px] grid-cols-[240px_1fr] gap-x-10 gap-y-8">
        <div className="flex flex-col gap-1">
          <span className="text-headline-semibold text-text-primary">Profile</span>
          <span className="text-body-2-regular text-text-tertiary">
            How others see you in {product.name}.
          </span>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <img src={src} alt={name} className="size-16 rounded-full object-cover" />
            <Button variant="secondary" onClick={() => setPhoto((value) => value + 1)}>
              Change photo
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full name" defaultValue={name} />
            <Input
              label="Email"
              defaultValue={`${name.split(' ')[0].toLowerCase()}@${product.name.toLowerCase()}.com`}
            />
          </div>
          <Textarea label="Bio" defaultValue={`Working on ${product.name}. ${product.tagline}.`} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-headline-semibold text-text-primary">Notifications</span>
          <span className="text-body-2-regular text-text-tertiary">Choose what reaches you.</span>
        </div>
        <div className="flex flex-col divide-y divide-border-button-default rounded-2xl border border-border-button-default">
          {['Product updates', `New ${product.things.toLowerCase()}`, 'Weekly summary'].map(
            (label, i) => (
              <label
                key={label}
                className="flex items-center justify-between px-4 py-3.5 text-body-medium text-text-primary"
              >
                {label}
                <Switch
                  aria-label={label}
                  isSelected={toggles[i]}
                  onChange={(value) =>
                    setToggles((prev) => prev.map((item, j) => (j === i ? value : item)))
                  }
                />
              </label>
            ),
          )}
        </div>
      </div>
    </AppPage>
  );
}
