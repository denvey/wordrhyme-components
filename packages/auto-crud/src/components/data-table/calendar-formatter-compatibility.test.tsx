import type { Column } from '@tanstack/react-table';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { setDateFormatter } from '@/lib/format';
import { SimpleDateFilter } from '../auto-crud/auto-table-simple-filters';
import { DataTableDateFilter } from './data-table-date-filter';

afterEach(() => {
  cleanup();
  setDateFormatter(undefined);
});

it.each([
  ['table', 'calendar'],
  ['table', 'timestamp'],
  ['simple', 'calendar'],
  ['simple', 'timestamp'],
])('preserves formatter-only labels in %s filters with %s values', (mode, encoding) => {
  setDateFormatter((date, options) =>
    new Intl.DateTimeFormat('zh-CN', options).format(date),
  );
  const value =
    encoding === 'calendar' ? '2026-09-14' : String(new Date(2026, 8, 14).getTime());
  const column = {
    getFilterValue: () => value,
    setFilterValue: vi.fn(),
  } as unknown as Column<object, unknown>;
  render(
    mode === 'table' ? (
      <DataTableDateFilter column={column} title="Created" />
    ) : (
      <SimpleDateFilter title="Created" value={value} onChange={vi.fn()} />
    ),
  );
  expect(screen.getByText('2026年9月14日')).toBeTruthy();
});

it('updates mounted labels when opting into and cleaning up calendar presentation', () => {
  const formatter = vi.fn(() => 'Custom host date');
  const disposeLegacy = setDateFormatter(formatter);
  const column = {
    getFilterValue: () => '2026-09-14',
    setFilterValue: vi.fn(),
  } as unknown as Column<object, unknown>;
  render(<DataTableDateFilter column={column} title="Created" />);
  expect(screen.getByText('Custom host date')).toBeTruthy();
  formatter.mockClear();

  let disposeCalendar: () => void = () => {};
  act(() => {
    disposeCalendar = setDateFormatter(formatter, {
      locale: 'zh-CN',
      timeZone: 'America/Los_Angeles',
    });
  });
  expect(screen.getByText('2026年9月14日')).toBeTruthy();
  expect(formatter).not.toHaveBeenCalled();

  act(() => disposeCalendar());
  expect(screen.getByText('Custom host date')).toBeTruthy();
  act(() => disposeLegacy());
  expect(screen.getByText('September 14, 2026')).toBeTruthy();
});
