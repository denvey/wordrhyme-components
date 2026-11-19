import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDate, setDateFormatter } from '@/lib/format';
import { DataTable } from './data-table';
import { DataTablePagination } from './data-table-pagination';

const DATE = '2026-01-01T00:30:00.000Z';

afterEach(() => {
  act(() => {
    setDateFormatter(undefined);
  });
  cleanup();
});

function makeTable(total: number | null = 394) {
  const column = {
    columnDef: {
      cell: () => formatDate(DATE),
    },
    getIsPinned: () => false,
    getIsLastColumn: () => false,
    getIsFirstColumn: () => false,
    getStart: () => 0,
    getAfter: () => 0,
    getSize: () => 120,
  };
  const cell = {
    id: 'created-at',
    column,
    getContext: () => ({}),
  };
  const row = {
    id: 'row-1',
    getIsSelected: () => false,
    getVisibleCells: () => [cell],
  };

  return {
    options: {
      manualPagination: true,
      ...(total !== null ? { rowCount: total } : {}),
    },
    getHeaderGroups: () => [],
    getRowModel: () => ({ rows: [row] }),
    getAllColumns: () => [column],
    getLeftVisibleLeafColumns: () => [],
    getCenterVisibleLeafColumns: () => [column],
    getRightVisibleLeafColumns: () => [],
    getFilteredSelectedRowModel: () => ({ rows: [] }),
    getFilteredRowModel: () => ({ rows: [row] }),
    getRowCount: () => total ?? 1,
    getState: () => ({ pagination: { pageSize: 10, pageIndex: 0 } }),
    getPageCount: () => 1,
    getCanPreviousPage: () => false,
    getCanNextPage: () => false,
    setPageSize: vi.fn(),
    setPageIndex: vi.fn(),
    previousPage: vi.fn(),
    nextPage: vi.fn(),
  };
}

describe('data table pagination with an unknown total', () => {
  function Pager({ rowCount }: { rowCount: number }) {
    const table = useReactTable({
      data: Array.from({ length: rowCount }, (_, id) => ({ id })),
      columns: [{ accessorKey: 'id' }],
      getCoreRowModel: getCoreRowModel(),
      manualPagination: true,
      pageCount: -1,
      initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
    });
    return <DataTablePagination table={table} />;
  }

  it('advances from a full page and stops on a short page', () => {
    const { rerender } = render(<Pager rowCount={10} />);
    const next = screen.getByRole<HTMLButtonElement>('button', {
      name: 'Go to next page',
    });
    const last = screen.getByRole<HTMLButtonElement>('button', {
      name: 'Go to last page',
    });

    expect(next.disabled).toBe(false);
    expect(last.disabled).toBe(true);
    fireEvent.click(next);
    expect(screen.getByText('2')).toBeTruthy();

    rerender(<Pager rowCount={1} />);
    expect(next.disabled).toBe(true);
    fireEvent.click(next);
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.queryByText('3')).toBeNull();
  });
});

describe('data table date formatter', () => {
  it('rerenders existing cells when the effective formatter changes', () => {
    const defaultValue = formatDate(DATE);
    render(<DataTable table={makeTable() as never} />);

    let disposeFirst: () => void = () => undefined;
    act(() => {
      disposeFirst = setDateFormatter(() => 'first');
    });
    expect(screen.getByText('first')).toBeTruthy();

    let disposeSecond: () => void = () => undefined;
    act(() => {
      disposeSecond = setDateFormatter(() => 'second');
    });
    expect(screen.getByText('second')).toBeTruthy();

    act(() => {
      disposeSecond();
    });
    expect(screen.getByText('first')).toBeTruthy();

    act(() => {
      disposeFirst();
    });
    expect(screen.getByText(defaultValue)).toBeTruthy();
  });

  it('shows the total number of rows matching the current query', () => {
    render(<DataTable table={makeTable() as never} />);

    expect(screen.getByText('Total: 394')).toBeTruthy();
  });

  it('does not label the current page size as the total for manual pagination', () => {
    render(<DataTable table={makeTable(null) as never} />);

    expect(screen.queryByText(/^Total:/)).toBeNull();
  });

  it('keeps the latest formatter when an older registration is released first', () => {
    const defaultValue = formatDate(DATE);
    render(<DataTable table={makeTable() as never} />);

    let disposeFirst: () => void = () => undefined;
    act(() => {
      disposeFirst = setDateFormatter(() => 'first');
    });

    let disposeSecond: () => void = () => undefined;
    act(() => {
      disposeSecond = setDateFormatter(() => 'second');
    });

    act(() => {
      disposeFirst();
    });
    expect(screen.getByText('second')).toBeTruthy();

    act(() => {
      disposeSecond();
    });
    expect(screen.getByText(defaultValue)).toBeTruthy();
  });
});
