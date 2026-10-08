import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import {
  calendarMaxDate,
  serializeCalendarDate,
  useCalendarToday,
} from './calendar-date';
import { setDateFormatter } from './format';

afterEach(() => {
  cleanup();
  setDateFormatter(undefined);
  vi.useRealTimers();
});

it('resolves today in the Host time zone and preserves fixed calendar bounds', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-14T23:30:00Z'));
  setDateFormatter(() => '', { locale: 'en-US', timeZone: 'Pacific/Kiritimati' });
  expect(serializeCalendarDate(calendarMaxDate('today')!)).toBe('2026-09-15');
  expect(serializeCalendarDate(calendarMaxDate('2026-09-14')!)).toBe('2026-09-14');
  expect(calendarMaxDate(undefined)).toBeUndefined();
});

it.each([
  ['2026-03-08T05:00:00Z', '2026-03-08', '2026-03-09', 23],
  ['2026-11-01T04:00:00Z', '2026-11-01', '2026-11-02', 25],
] as const)(
  'updates at Host midnight across DST starting %s',
  (instant, before, after, hours) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(instant));
    setDateFormatter(() => '', { locale: 'en-US', timeZone: 'America/New_York' });
    const { result, unmount } = renderHook(() => useCalendarToday());
    act(() => {
      vi.advanceTimersByTime(hours * 60 * 60 * 1000 - 1);
    });
    expect(serializeCalendarDate(result.current)).toBe(before);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(serializeCalendarDate(result.current)).toBe(after);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  },
);

it.each(['focus', 'visibilitychange'])(
  'refreshes after a suspended page resumes via %s',
  (event) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-14T15:00:00Z'));
    setDateFormatter(() => '', { locale: 'en-US', timeZone: 'Asia/Shanghai' });
    const { result } = renderHook(() => useCalendarToday());
    vi.setSystemTime(new Date('2026-09-15T01:00:00Z'));
    act(() => {
      (event === 'focus' ? window : document).dispatchEvent(new Event(event));
    });
    expect(serializeCalendarDate(result.current)).toBe('2026-09-15');
    expect(vi.getTimerCount()).toBe(1);
  },
);

it('updates when the Host time zone changes and cancels the old timer', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-14T23:30:00Z'));
  setDateFormatter(() => '', { locale: 'en-US', timeZone: 'America/Los_Angeles' });
  const { result } = renderHook(() => useCalendarToday());
  expect(serializeCalendarDate(result.current)).toBe('2026-09-14');
  act(() => {
    setDateFormatter(() => '', { locale: 'en-US', timeZone: 'Pacific/Kiritimati' });
  });
  expect(serializeCalendarDate(result.current)).toBe('2026-09-15');
  expect(vi.getTimerCount()).toBe(1);
});
