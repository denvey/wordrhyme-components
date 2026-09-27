import type { RowActionDialogProps } from '../row-action-dialog';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem as PrivateItem,
} from '@wordrhyme/shadcn';
import { Dialog, DialogContent, DialogTitle, DropdownMenuItem } from '@wordrhyme/ui';
import * as React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { resolveActions } from '@/components/auto-crud/auto-crud-table';
import { useRowActionDialog } from '../row-action-dialog';
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

const released = vi.fn();
function TestDialog({ open, onOpenChange, onDismiss }: RowActionDialogProps) {
  const [draft, setDraft] = React.useState('');
  React.useEffect(() => () => released(), []);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>Row details</DialogTitle>
        <input
          aria-label="Draft note"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button onClick={() => onOpenChange(false)}>Close details</button>
        <button onClick={onDismiss}>Dismiss details</button>
      </DialogContent>
    </Dialog>
  );
}

function MenuRow({
  actions,
}: {
  actions: ReturnType<typeof resolveActions<typeof record>>;
}) {
  const table = useReactTable({
    data: [record],
    columns: [createActionsColumn(actions)],
    getCoreRowModel: getCoreRowModel(),
  });
  const cell = table.getRowModel().rows[0]!.getVisibleCells()[0]!;
  return <>{flexRender(cell.column.columnDef.cell, cell.getContext())}</>;
}

function DialogMenu({ showRow = true }: { showRow?: boolean }) {
  const { showDialog, dialog } = useRowActionDialog();
  const actions = resolveActions<typeof record>(
    [
      {
        type: 'custom',
        component: ({ MenuItem, showDialog: openDialog }) => (
          <MenuItem
            onSelect={() =>
              openDialog(<TestDialog open={false} onOpenChange={() => {}} />)
            }
          >
            Show details
          </MenuItem>
        ),
      },
    ],
    {
      openView: () => {},
      openEdit: undefined,
      copyRow: undefined,
      openDelete: undefined,
    },
    { view: 'View', edit: 'Edit', copy: 'Copy', delete: 'Delete' },
    {
      crudId: 'products',
      idKey: 'id',
      showDialog,
    },
  );
  return (
    <>
      {showRow && <MenuRow actions={actions} />}
      {dialog}
    </>
  );
}

async function openDetails() {
  fireEvent.keyDown(screen.getByRole('button', { name: 'Open menu' }), {
    key: 'ArrowDown',
  });
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Show details' }));
  await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  expect(screen.getByRole('dialog', { name: 'Row details' })).toBeTruthy();
  await waitFor(() =>
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true),
  );
}

it('keeps a real dialog after menu dismissal and releases its state on close and reopen', async () => {
  released.mockClear();
  render(<DialogMenu />);
  await openDetails();
  fireEvent.change(screen.getByRole('textbox', { name: 'Draft note' }), {
    target: { value: 'abandoned' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(released).toHaveBeenCalledOnce();
  await openDetails();
  expect(
    screen.getByRole<HTMLInputElement>('textbox', { name: 'Draft note' }).value,
  ).toBe('');
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss details' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(released).toHaveBeenCalledTimes(2);
});

it('preserves the dialog and unsaved input when columns are regenerated or the row unmounts', async () => {
  const { rerender } = render(<DialogMenu />);
  await openDetails();
  const input = screen.getByRole('textbox', { name: 'Draft note' });
  fireEvent.change(input, { target: { value: 'unsaved draft' } });
  rerender(<DialogMenu />);
  expect(screen.getByRole('textbox', { name: 'Draft note' })).toBe(input);
  rerender(<DialogMenu showRow={false} />);
  expect(screen.queryByRole('button', { name: 'Open menu' })).toBeNull();
  expect(screen.getByRole('textbox', { name: 'Draft note' })).toBe(input);
  expect((input as HTMLInputElement).value).toBe('unsaved draft');
  fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('closes with Escape and removes the modal pointer lock', async () => {
  render(<DialogMenu />);
  await openDetails();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(document.body.style.pointerEvents).not.toBe('none');
});
