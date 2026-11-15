import { useState } from 'react';
import { RiAddLine, RiDownloadLine, RiFilter3Line, RiSearchLine } from '@remixicon/react';
import {
  Avatar,
  Button,
  Input,
  MenuButton,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  TabList,
  Tabs,
  toast,
} from '../../ui';
import { person } from '../../products';
import { downloadCsv, type Props, rotate, Status } from '../parts';
import { AppPage } from './shell';

export function ListPage({ product, seed }: Props) {
  const [entries, setEntries] = useState(() => rotate(product.entries, seed));
  const [status, setStatus] = useState<string | null>(null);
  const statuses = [...new Set(entries.map((entry) => entry.status))];
  const shown = status ? entries.filter((entry) => entry.status === status) : entries;
  return (
    <AppPage
      product={product}
      active={1}
      title={product.things}
      actions={
        <>
          <Button
            variant="secondary"
            leadingIcon={RiDownloadLine}
            onClick={(event) => {
              downloadCsv(product.things, shown);
              toast(event.currentTarget, `Exported ${shown.length} rows`);
            }}
          >
            Export
          </Button>
          <Button
            leadingIcon={RiAddLine}
            onClick={() => {
              setStatus(null);
              setEntries((all) => [
                {
                  title: `Untitled ${all.length - product.entries.length + 1}`,
                  sub: 'Just now',
                  value: '-',
                  status: 'Draft',
                  tone: 'gray',
                },
                ...all,
              ]);
            }}
          >
            New
          </Button>
        </>
      }
    >
      <div className="flex items-center justify-between">
        <Tabs defaultSelectedKey="all">
          <TabList aria-label={product.things}>
            <Tab id="all" count={entries.length * 6 + (seed % 9)}>
              All
            </Tab>
            <Tab id="mine" count={entries.length}>
              Mine
            </Tab>
            <Tab id="archived">Archived</Tab>
          </TabList>
        </Tabs>
        <div className="flex shrink-0 gap-2">
          <Input
            placeholder={`Search ${product.things.toLowerCase()}`}
            leadingIcon={RiSearchLine}
          />
          <MenuButton
            icon={RiFilter3Line}
            aria-label="Filter by status"
            items={[null, ...statuses].map((value) => ({
              label: value ?? 'All statuses',
              selected: value === status,
              onSelect: () => setStatus(value),
            }))}
          />
        </div>
      </div>
      <Table aria-label={product.things}>
        <TableHeader>
          <TableColumn>Name</TableColumn>
          <TableColumn>Details</TableColumn>
          <TableColumn>Owner</TableColumn>
          <TableColumn>Status</TableColumn>
          <TableColumn>Value</TableColumn>
        </TableHeader>
        <TableBody>
          {shown.map((entry, index) => {
            const [name, src] = person(seed + index);
            return (
              <TableRow key={entry.title}>
                <TableCell>
                  <span className="text-body-medium text-text-primary">{entry.title}</span>
                </TableCell>
                <TableCell>{entry.sub}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <Avatar size="xs" src={src} alt={name} />
                    {name}
                  </span>
                </TableCell>
                <TableCell>
                  <Status entry={entry} />
                </TableCell>
                <TableCell>{entry.value}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </AppPage>
  );
}
