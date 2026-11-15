import { useState } from 'react';
import { RiAddLine } from '@remixicon/react';
import { Avatar, Badge, Button, Chip, cx } from '../../ui';
import { person } from '../../products';
import { Cover, type Props, rotate, Status } from '../parts';
import { AppPage } from './shell';

const COLUMNS = ['To do', 'In progress', 'Review', 'Done'];

/** Cards "Add card" puts in To do, in order. */
const NEW_CARDS = [
  'Polish onboarding',
  'Fix sync on resume',
  'Ship release notes',
  'Audit contrast',
];

/** A board whose cards move on a click: each click takes a card one column to the right. */
export function Board({ product, seed }: Props) {
  const [cards, setCards] = useState(() => {
    const entries = rotate(product.entries, seed);
    return COLUMNS.flatMap((_, c) =>
      entries.slice(c, c + 1 + ((seed + c) % 3)).map((entry, i) => ({
        id: `${c}-${i}`,
        title: entry.title,
        sub: entry.sub,
        entry,
        column: c,
        cover: (c + i + seed) % 4 === 0,
        person: person(c * 3 + i + seed),
      })),
    );
  });
  const advance = (id: string) =>
    setCards((all) => {
      const card = all.find((c) => c.id === id)!;
      if (card.column === COLUMNS.length - 1) return all;
      // A moved card lands on top of its next column.
      return [{ ...card, column: card.column + 1 }, ...all.filter((c) => c !== card)];
    });
  const add = () =>
    setCards((all) => {
      const added = all.filter((c) => c.id.startsWith('new')).length;
      const title = NEW_CARDS[added % NEW_CARDS.length];
      return [
        {
          ...all[0],
          id: `new-${added}`,
          title,
          sub: `Added just now`,
          column: 0,
          cover: false,
          person: person(seed + added),
        },
        ...all,
      ];
    });
  return (
    <AppPage
      product={product}
      active={2}
      title={`${product.things} board`}
      actions={
        <Button leadingIcon={RiAddLine} onClick={add}>
          Add card
        </Button>
      }
    >
      <div className="grid flex-1 grid-cols-4 gap-4 overflow-hidden">
        {COLUMNS.map((column, c) => {
          const here = cards.filter((card) => card.column === c);
          return (
            <div
              key={column}
              className="flex flex-col gap-3 overflow-hidden rounded-2xl bg-background-secondary-default p-3"
            >
              <div className="flex items-center gap-2 px-1">
                <span className="text-body-semibold text-text-primary">{column}</span>
                <Badge>{here.length}</Badge>
              </div>
              {here.map((card) => (
                <button
                  key={card.id}
                  data-act={`card ${card.id}`}
                  onClick={() => advance(card.id)}
                  className={cx(
                    'flex shrink-0 flex-col gap-3 rounded-xl bg-background-primary-default p-4 text-start shadow-card ring-1 ring-black/5 dark:ring-white/10',
                    card.id.startsWith('new') && 'ring-2 ring-accent-500',
                  )}
                >
                  {card.cover && (
                    <Cover
                      product={product}
                      seed={seed + Number(card.id.split('-')[0]) + Number(card.id.split('-')[1])}
                      className="h-24 w-full rounded-lg"
                    />
                  )}
                  <span className="text-body-medium text-text-primary">{card.title}</span>
                  <span className="text-body-2-regular text-text-tertiary">{card.sub}</span>
                  <div className="flex items-center justify-between">
                    {c === COLUMNS.length - 1 ? (
                      <Chip color="lime" variant="subtle">
                        Done
                      </Chip>
                    ) : (
                      <Status entry={card.entry} />
                    )}
                    <Avatar size="xs" src={card.person[1]} alt={card.person[0]} />
                  </div>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </AppPage>
  );
}
