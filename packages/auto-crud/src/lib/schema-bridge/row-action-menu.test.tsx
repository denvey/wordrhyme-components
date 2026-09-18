import * as React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { DropdownMenuItem } from '@wordrhyme/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem as PrivateItem,
  DropdownMenuTrigger,
} from '@wordrhyme/shadcn';
import { createActionsColumn } from './zod-to-columns';

afterEach(cleanup);
const record = { id: 'product-1' };
function TableMenu({ onSelect }: { onSelect: (id: string) => void }) {
  const table = useReactTable({
    data: [record],
    columns: [
      createActionsColumn<typeof record>([
        { label: 'Edit', onClick: (row) => onSelect(`edit:${row.id}`) },
        {
          separator: true,
          getContext: (row) => row,
          // The Host resource permission action uses this shared Item.
          component: (row: typeof record) => (
            <DropdownMenuItem onSelect={() => onSelect(row.id)}>
              Resource access
            </DropdownMenuItem>
          ),
        },
      ]),
    ],
    getCoreRowModel: getCoreRowModel(),
  });
  const cell = table.getRowModel().rows[0]!.getVisibleCells()[0]!;
  return <>{flexRender(cell.column.columnDef.cell, cell.getContext())}</>;
}
it('composes a table menu with a Host UI permission item and preserves built-in actions', async () => {
  const select = vi.fn();
  render(<TableMenu onSelect={select} />);
  fireEvent.keyDown(screen.getByRole('button', { name: 'Open menu' }), {
    key: 'ArrowDown',
  });
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Resource access' }));
  expect(select).toHaveBeenLastCalledWith('product-1');
  await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  fireEvent.keyDown(screen.getByRole('button', { name: 'Open menu' }), {
    key: 'ArrowDown',
  });
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }));
  expect(select).toHaveBeenLastCalledWith('edit:product-1');
});
it('keeps a plugin-owned menu usable when its context-dependent components stay together', async () => {
  const select = vi.fn();
  render(
    <DropdownMenu>
      <DropdownMenuTrigger>Private menu</DropdownMenuTrigger>
      <DropdownMenuContent>
        <PrivateItem onSelect={select}>Private action</PrivateItem>
      </DropdownMenuContent>
    </DropdownMenu>,
  );
  fireEvent.keyDown(screen.getByRole('button', { name: 'Private menu' }), {
    key: 'ArrowDown',
  });
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Private action' }));
  expect(select).toHaveBeenCalledOnce();
});
