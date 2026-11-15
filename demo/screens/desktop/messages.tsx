import { useState } from 'react';
import { RiMore2Line, RiSendPlaneFill } from '@remixicon/react';
import { Avatar, Button, cx, Input, MenuButton, Thinking, toast } from '../../ui';
import { person } from '../../products';
import { type Props, rotate } from '../parts';
import { Sidebar } from './shell';

/** What the other side answers, in turn. */
const REPLIES = [
  'Love it. Sending the final files tonight.',
  'Works for me, see you then.',
  'Done, it is live now.',
];

const MINE =
  'ms-auto max-w-[60%] rounded-2xl rounded-br-md bg-accent-500 px-4 py-3 text-body-regular text-white';

const THEIRS =
  'max-w-[60%] rounded-2xl rounded-bl-md bg-background-secondary-default px-4 py-3 text-body-regular text-text-primary';

export function Messages({ product, seed }: Props) {
  const threads = rotate(product.entries, seed).slice(0, 6);
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState<{ mine: boolean; text: string }[]>([]);
  const [typing, setTyping] = useState(true);
  const [name, src] = person(seed + 2);
  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setSent((all) => [...all, { mine: true, text }]);
    setDraft('');
    setTyping(true);
    const replies = sent.filter((m) => !m.mine).length;
    setTimeout(() => {
      setTyping(false);
      setSent((all) => [...all, { mine: false, text: REPLIES[replies % REPLIES.length] }]);
    }, 1200);
  };
  return (
    <div className="flex h-full">
      <Sidebar product={product} active={3} />
      <div className="flex w-[340px] shrink-0 flex-col gap-1 border-e border-border-button-default p-4">
        <span className="mb-2 px-2 text-title-3-semibold text-text-primary">Messages</span>
        {threads.map((entry, i) => {
          const [name, avatar] = person(seed + i + 2);
          return (
            <div
              key={entry.title}
              className={cx(
                'flex gap-3 rounded-xl p-3',
                i === 0 && 'bg-accent-50 dark:bg-accent-950',
              )}
            >
              <Avatar size="sm" src={avatar} alt={name} />
              <div className="flex min-w-0 flex-col">
                <span className="text-body-2-medium text-text-primary">{name}</span>
                <span className="truncate text-caption-1-regular text-text-tertiary">
                  About {entry.title}
                </span>
              </div>
              {i < 2 && (
                <span className="ms-auto mt-1 size-2 shrink-0 rounded-full bg-accent-500" />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border-button-default px-6 py-4">
          <Avatar size="md" src={src} alt={name} />
          <span className="text-body-semibold text-text-primary">{name}</span>
          <MenuButton
            className="ms-auto"
            icon={RiMore2Line}
            aria-label="More"
            items={[
              ['Mark as unread', 'Marked as unread'],
              ['Mute conversation', 'Conversation muted'],
              ['Archive', 'Conversation archived'],
            ].map(([label, done]) => ({ label, onSelect: (target) => toast(target, done) }))}
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-end gap-3 overflow-hidden p-6">
          <div className="max-w-[60%] shrink-0 rounded-2xl rounded-bl-md bg-background-secondary-default px-4 py-3 text-body-regular text-text-primary">
            Hi, quick question about {threads[0].title}. Is it still{' '}
            {threads[0].status.toLowerCase()}?
          </div>
          <div className={cx(MINE, 'shrink-0')}>
            Yes, all set. I just shared the details with you.
          </div>
          <div className={cx(THEIRS, 'shrink-0')}>
            Perfect, thank you. {product.tagline}, indeed.
          </div>
          {sent.map((message, i) => (
            <div key={i} className={cx(message.mine ? MINE : THEIRS, 'shrink-0')}>
              {message.text}
            </div>
          ))}
          {typing && <Thinking label={`${name.split(' ')[0]} is typing`} />}
        </div>
        <div className="flex items-center gap-2 border-t border-border-button-default p-4">
          <div className="flex-1">
            <Input
              placeholder={`Message ${name.split(' ')[0]}`}
              value={draft}
              onChange={setDraft}
            />
          </div>
          <Button leadingIcon={RiSendPlaneFill} onClick={send}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
