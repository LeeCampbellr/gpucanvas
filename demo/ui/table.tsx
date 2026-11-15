import type { ReactNode } from 'react';

export const Table = ({ children }: { 'aria-label'?: string; children: ReactNode }) => (
  <table className="w-full text-start text-body-2-regular">{children}</table>
);

export const TableHeader = ({ children }: { children: ReactNode }) => (
  <thead>
    <tr className="border-b border-border-button-default">{children}</tr>
  </thead>
);

export const TableColumn = ({
  children,
}: {
  id?: string;
  isRowHeader?: boolean;
  children: ReactNode;
}) => <th className="h-10 px-3 text-start text-caption-1-medium text-text-tertiary">{children}</th>;

export const TableBody = ({ children }: { children: ReactNode }) => <tbody>{children}</tbody>;

export const TableRow = ({ children }: { id?: string; children: ReactNode }) => (
  <tr className="border-b border-border-button-default last:border-0">{children}</tr>
);

export const TableCell = ({ children }: { children: ReactNode }) => (
  <td className="h-14 px-3 text-text-primary">{children}</td>
);
