import type { Column } from '@tanstack/react-table';
import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setDateFormatter } from '@/lib/format';
import {
  calendarPresentation,
  parseCalendarDate,
  serializeCalendarDate,
} from '@/lib/calendar-date';
import { applyReadableFilters, parseReadableFilters } from '@/lib/readable-filters';
import { DataTableDateFilter } from './data-table-date-filter';

afterEach(() => {
  cleanup();
  setDateFormatter(undefined);
});

function column(value: unknown) {
  return { getFilterValue: () => value, setFilterValue: vi.fn() } as unknown as Column<
    object,
    unknown
  >;
}

describe('localized calendar filters', () => {
  it('keeps September 14 in the label after selecting a same-day range', () => {
    setDateFormatter(() => '2026年9月13日', {
      locale: 'zh-CN',
      timeZone: 'America/Los_Angeles',
    });
    function RangeFilter() {
      const [value, setValue] = useState<unknown>(['2026-09-14']);
      const field = {
        getFilterValue: () => value,
        setFilterValue: setValue,
      } as unknown as Column<object, unknown>;
      return <DataTableDateFilter column={field} title="创建时间" multiple />;
    }
    render(<RangeFilter />);
    fireEvent.click(screen.getByRole('button', { name: /创建时间.*2026/ }));
    fireEvent.click(screen.getByRole('button', { name: '2026年9月14日星期一' }));
    expect(screen.getByText('2026年9月14日 - 2026年9月14日')).toBeTruthy();
    expect(screen.queryByText('2026年9月13日 - 2026年9月13日')).toBeNull();
  });

  it('updates selected labels, month names, weekdays and week start when host locale changes', () => {
    const formatter = () => 'must not format a calendar day as an instant';
    setDateFormatter(formatter, { locale: 'zh-CN', timeZone: 'America/Los_Angeles' });
    render(<DataTableDateFilter column={column('2026-09-14')} title="Created" />);
    expect(screen.getByText('2026年9月14日')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Created.*2026/ }));
    expect(screen.getByRole('combobox', { name: '选择月份' })).toBeTruthy();
    expect(
      calendarPresentation().formatters.formatMonthDropdown(new Date(2026, 8, 14)),
    ).toBe('九月');
    expect(calendarPresentation().weekStartsOn).toBe(1);
    act(() => {
      setDateFormatter(formatter, { locale: 'en-US', timeZone: 'Pacific/Kiritimati' });
    });
    expect(screen.getByText('September 14, 2026')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Choose the Month' })).toBeTruthy();
    expect(
      calendarPresentation().formatters.formatWeekdayName(new Date(2026, 8, 14)),
    ).toBe('Mon');
    expect(calendarPresentation().weekStartsOn).toBe(0);
  });

  it('writes calendar dates for single selections', () => {
    const field = column('2026-09-14');
    render(<DataTableDateFilter column={field} title="Created" />);
    fireEvent.click(screen.getByRole('button', { name: /Created.*September/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Tuesday, September 15, 2026' }));
    expect(field.setFilterValue).toHaveBeenCalledWith('2026-09-15');
  });

  it('writes a full range as calendar dates', () => {
    const field = column(['2026-09-14', '2026-09-15']);
    render(<DataTableDateFilter column={field} title="Created" multiple />);
    fireEvent.click(screen.getByRole('button', { name: /Created.*September/ }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Wednesday, September 16, 2026' }),
    );
    expect(field.setFilterValue).toHaveBeenCalledWith(['2026-09-14', '2026-09-16']);
  });

  it.each(['America/Los_Angeles', 'Pacific/Kiritimati'])(
    'keeps dates stable in %s and through URL serialization',
    (timeZone) => {
      setDateFormatter(() => 'unused', { locale: 'en-US', timeZone });
      const day = parseCalendarDate('2026-09-14')!;
      expect(serializeCalendarDate(day)).toBe('2026-09-14');
      expect(calendarPresentation().formatDate(day)).toBe('September 14, 2026');
      const columns = [{ id: 'createdAt', meta: { variant: 'dateRange' as const } }];
      const params = applyReadableFilters(new URLSearchParams(), columns, [
        {
          id: 'createdAt',
          value: ['2026-09-14', '2026-09-15'],
          variant: 'dateRange',
          operator: 'isBetween',
          filterId: 'createdAt',
        },
      ]);
      expect(parseReadableFilters(params, columns)[0]?.value).toEqual([
        '2026-09-14',
        '2026-09-15',
      ]);
    },
  );
});
