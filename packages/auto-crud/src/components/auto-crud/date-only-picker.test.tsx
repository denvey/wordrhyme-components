import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { setDateFormatter } from '@/lib/format';
import { DateOnlyPicker } from './date-only-picker';

afterEach(() => {
  cleanup();
  setDateFormatter(undefined);
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
    render(<DateOnlyPicker value={value} />);
    expect(screen.getByRole('button', { name: '2026-09-27' })).toBeTruthy();
  },
);
