import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { setDateFormatter } from '@/lib/format';
import { SimpleDateFilter } from './auto-table-simple-filters';

afterEach(() => {
  cleanup();
  setDateFormatter(undefined);
});

it.each([2, 14])('keeps selected September %s in the simple range filter', (day) => {
  setDateFormatter(() => 'wrong previous day', {
    locale: 'zh-CN',
    timeZone: 'America/Los_Angeles',
  });
  const date = `2026-09-${String(day).padStart(2, '0')}`;
  function Filter() {
    const [value, setValue] = useState<string | string[] | undefined>([date]);
    return (
      <>
        <SimpleDateFilter title="创建时间" multiple value={value} onChange={setValue} />
        <output>{JSON.stringify(value)}</output>
      </>
    );
  }
  render(<Filter />);
  fireEvent.click(screen.getByRole('button', { name: /创建时间.*2026/ }));
  fireEvent.click(
    screen.getByRole('button', { name: new RegExp(`2026年9月${day}日星期`) }),
  );
  expect(screen.getByText(`2026年9月${day}日 - 2026年9月${day}日`)).toBeTruthy();
  expect(screen.getByText(JSON.stringify([date, date]))).toBeTruthy();
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /创建时间.*2026/ }));
  expect(screen.getByRole('dialog')).toBeTruthy();
  act(() => {
    setDateFormatter(() => 'wrong', { locale: 'en-US', timeZone: 'Pacific/Kiritimati' });
  });
  expect(
    screen.getByText(`September ${day}, 2026 - September ${day}, 2026`),
  ).toBeTruthy();
});

it('keeps the range picker open until the second date is selected', () => {
  setDateFormatter(() => '', { locale: 'zh-CN', timeZone: 'Asia/Shanghai' });
  render(
    <SimpleDateFilter title="创建时间" multiple value={undefined} onChange={() => {}} />,
  );
  fireEvent.click(screen.getByRole('button', { name: '创建时间' }));
  const days = () =>
    screen
      .getAllByRole('button')
      .filter(
        (button) =>
          /日星期/.test(button.getAttribute('aria-label') ?? '') &&
          !button.closest('[data-outside]'),
      );
  fireEvent.click(days()[10]!);
  expect(screen.getByRole('dialog')).toBeTruthy();
  fireEvent.click(days()[11]!);
  expect(screen.queryByRole('dialog')).toBeNull();
});
