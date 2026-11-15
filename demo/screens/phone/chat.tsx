import { useState } from 'react';
import { RiArrowUpLine } from '@remixicon/react';
import { IconButton, Input, Thinking } from '../../ui';
import type { Props } from '../parts';
import { Phone } from './shell';

export function PhoneChat({ product, seed }: Props) {
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState<string[]>([]);
  const entry = product.entries[seed % product.entries.length];
  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setSent((all) => [...all, text]);
    setDraft('');
  };
  return (
    <Phone title={`${product.name} assistant`} back>
      <div className="ms-auto max-w-[80%] rounded-2xl rounded-br-md bg-accent-500 px-4 py-2.5 text-body-regular text-white">
        What changed with {entry.title}?
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-background-secondary-default px-4 py-2.5 text-body-regular text-text-primary">
        It is {entry.status.toLowerCase()} now. {entry.sub}, {entry.value}. Want me to set a
        reminder?
      </div>
      <div className="ms-auto max-w-[80%] rounded-2xl rounded-br-md bg-accent-500 px-4 py-2.5 text-body-regular text-white">
        Yes, and show me similar {product.things.toLowerCase()}
      </div>
      <Thinking label={`Looking through your ${product.things.toLowerCase()}`} />
      {sent.map((text, i) => (
        <div
          key={i}
          className="ms-auto max-w-[80%] shrink-0 rounded-2xl rounded-br-md bg-accent-500 px-4 py-2.5 text-body-regular text-white"
        >
          {text}
        </div>
      ))}
      <div className="mt-auto flex items-center gap-2">
        <div className="flex-1">
          <Input placeholder="Ask anything" value={draft} onChange={setDraft} onEnter={send} />
        </div>
        <IconButton icon={RiArrowUpLine} aria-label="Send" onClick={send} />
      </div>
    </Phone>
  );
}
