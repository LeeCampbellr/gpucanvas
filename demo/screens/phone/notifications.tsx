import { Notification } from '../../ui';
import { type Props, rotate } from '../parts';
import { Phone } from './shell';

export function PhoneNotifications({ product, seed }: Props) {
  const entries = rotate(product.entries, seed).slice(0, 5);
  const statuses = ['success', 'information', 'neutral', 'error', 'success'] as const;
  return (
    <Phone title="Notifications" tab={0}>
      {entries.map((entry, i) => (
        <Notification
          key={entry.title}
          status={statuses[(i + seed) % statuses.length]}
          title={`${entry.title}: ${entry.status.toLowerCase()}`}
          description={`${entry.sub}. ${entry.value}.`}
          timestamp={`${(i + 1) * (2 + (seed % 9))}m`}
        />
      ))}
    </Phone>
  );
}
