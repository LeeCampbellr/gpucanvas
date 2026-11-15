import { useState } from 'react';
import { Button, type Day, MonthCalendar, toast } from '../../ui';
import type { Props } from '../parts';
import { Phone } from './shell';

export function PhoneBooking({ product, seed }: Props) {
  const [date, setDate] = useState<Day>({ year: 2026, month: 8, day: 10 + (seed % 15) });
  const [slot, setSlot] = useState('10:30');
  return (
    <Phone title="Pick a time" back>
      <MonthCalendar value={date} onChange={setDate} />
      <div className="grid grid-cols-3 gap-2">
        {['09:00', '09:30', '10:30', '11:00', '14:00', '15:30'].map((time) => (
          <Button
            key={time}
            size="small"
            variant={time === slot ? 'primary' : 'secondary'}
            onClick={() => setSlot(time)}
          >
            {time}
          </Button>
        ))}
      </div>
      <Button
        done={`Booked for ${slot}`}
        onClick={(event) => toast(event.currentTarget, `Booked ${slot} with ${product.name}`)}
      >
        Book {slot} with {product.name}
      </Button>
    </Phone>
  );
}
