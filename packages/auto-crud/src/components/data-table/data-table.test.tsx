import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDate, setDateFormatter } from '@/lib/format';
import { DataTable } from './data-table';

const DATE = '2026-01-01T00:30:00.000Z';

afterEach(() => {
  act(() => {
    setDateFormatter(undefined);
  });
  cleanup();
});

function makeTable() {
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
    getHeaderGroups: () => [],
    getRowModel: () => ({ rows: [row] }),
    getAllColumns: () => [column],
    getFilteredSelectedRowModel: () => ({ rows: [] }),
    getFilteredRowModel: () => ({ rows: [row] }),
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
