import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { setDateFormatter } from '@/lib/format';
import { DateOnlyPicker } from './date-only-picker';

afterEach(() => {
  cleanup();
  setDateFormatter(undefined);
});

it('can navigate past December and select a date next year', () => {
  setDateFormatter(undefined, { locale: 'en-US' });
  const year = new Date().getFullYear();
  const onChange = vi.fn();
  render(<DateOnlyPicker value={`${year}-12-15`} onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: `${year}-12-15` }));
  const next = screen.getByRole('button', { name: 'Go to the Next Month' });
  expect(next.getAttribute('aria-disabled')).not.toBe('true');
  fireEvent.click(next);
  fireEvent.click(screen.getByRole('button', {
    name: new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    }).format(new Date(year + 1, 0, 15)),
  }));
  expect(onChange).toHaveBeenCalledWith(`${year + 1}-01-15`);
});

it.each(['Asia/Shanghai', 'America/Los_Angeles', 'Pacific/Kiritimati'])(
  'emits a calendar day in %s',
  (timeZone) => {
    setDateFormatter(() => 'wrong previous day', { locale: 'zh-CN', timeZone });
    const onChange = vi.fn();
    const { rerender } = render(
      <DateOnlyPicker value="2026-09-26" onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '2026-09-26' }));
    expect(screen.getByRole('combobox', { name: '选择月份' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '2026年9月27日星期日' }));
    expect(onChange).toHaveBeenCalledWith('2026-09-27');
    rerender(<DateOnlyPicker value="2026-09-27" onChange={onChange} />);
    expect(screen.getByRole('button', { name: '2026-09-27' })).toBeTruthy();
    act(() => {
      setDateFormatter(() => 'unused', { locale: 'en-US', timeZone });
    });
    expect(screen.getByRole('button', { name: '2026-09-27' })).toBeTruthy();
  },
);

it('supports empty values and disabled fields', () => {
  setDateFormatter(() => '', { locale: 'zh-CN', timeZone: 'Asia/Shanghai' });
  const { rerender } = render(<DateOnlyPicker value={null} disabled />);
  expect(
    (screen.getByRole('button', { name: '选择日期' }) as HTMLButtonElement).disabled,
  ).toBe(true);
  rerender(<DateOnlyPicker value="2026-02-30" />);
  expect(screen.getByRole('button', { name: '选择日期' })).toBeTruthy();
});

it.each(['2026-09-27T00:00:00.000Z', new Date('2026-09-27T00:00:00.000Z')])(
  'displays host date projections without shifting their day: %s',
  (value) => {
    setDateFormatter(() => 'wrong day', {
      locale: 'zh-CN',
      timeZone: 'America/Los_Angeles',
    });
    render(<DateOnlyPicker value={value} dateInput="utc-projection" />);
    expect(screen.getByRole('button', { name: '2026-09-27' })).toBeTruthy();
  },
);
