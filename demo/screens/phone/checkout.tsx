import { useState } from 'react';
import { RiAppleFill } from '@remixicon/react';
import { Button, Checkbox, Divider, Input, Select, SelectItem, toast } from '../../ui';
import { type Props, rotate } from '../parts';
import { Phone, Row } from './shell';

export function PhoneCheckout({ product, seed }: Props) {
  const items = rotate(product.entries, seed).slice(0, 3);
  const [agree, setAgree] = useState(true);
  return (
    <Phone title="Checkout" back>
      {items.map((entry, i) => (
        <Row key={entry.title} entry={entry} product={product} seed={seed + i} />
      ))}
      <Divider />
      <Select aria-label="Payment" defaultSelectedKey="apple">
        <SelectItem id="apple">Apple Pay</SelectItem>
        <SelectItem id="card">Visa ending 4242</SelectItem>
      </Select>
      <Input placeholder="Promo code" />
      <div className="flex flex-col gap-2 rounded-2xl bg-background-secondary-default p-4 text-body-2-regular text-text-secondary">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${(48 + (seed % 70)).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Service</span>
          <span>$2.99</span>
        </div>
        <div className="flex justify-between text-headline-semibold text-text-primary">
          <span>Total</span>
          <span>${(50.99 + (seed % 70)).toFixed(2)}</span>
        </div>
      </div>
      <Checkbox isSelected={agree} onChange={setAgree}>
        Save for next time
      </Checkbox>
      <Button
        leadingIcon={RiAppleFill}
        done="Paid"
        onClick={(event) => toast(event.currentTarget, 'Payment complete')}
      >
        Pay now
      </Button>
    </Phone>
  );
}
