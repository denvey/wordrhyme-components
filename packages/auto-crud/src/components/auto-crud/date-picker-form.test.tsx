import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { setDateFormatter } from '@/lib/format';
import { AutoForm, type AutoFormRef } from './auto-form';
import { createRef } from 'react';

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});
afterEach(() => {
  cleanup();
  setDateFormatter(undefined);
});

it.each(['date-only', 'date'] as const)(
  'selects, clears and submits %s through AutoForm',
  async (valueFormat) => {
    setDateFormatter(undefined, { locale: 'en-US', timeZone: 'Asia/Shanghai' });
    const date = new Date(2026, 8, 27);
    const onSubmit = vi.fn();
    render(
      <AutoForm
        schema={z.object({ inquiry: z.union([z.string(), z.date()]).optional() })}
        initialValues={{ inquiry: valueFormat === 'date-only' ? '2026-09-27' : date }}
        overrides={{
          inquiry: {
            'x-component': 'DatePicker',
            'x-component-props': valueFormat === 'date-only' ? { valueFormat } : {},
          },
        }}
        onSubmit={onSubmit}
      />,
    );
    const label = (day: number) =>
      valueFormat === 'date-only'
        ? `2026-09-${day}`
        : new Date(2026, 8, day).toLocaleDateString();
    fireEvent.click(screen.getByText(label(27)).closest('button') as HTMLButtonElement);
    fireEvent.click(
      screen.getByRole('button', { name: /Monday, September 28(?:th)?, 2026/ }),
    );
    expect(
      screen.getByText(label(28)).closest('button') as HTMLButtonElement,
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '创建' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]?.[0].inquiry).toEqual(
      valueFormat === 'date-only' ? '2026-09-28' : new Date(2026, 8, 28),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear date' }));
    expect(
      screen
        .getByText(valueFormat === 'date-only' ? 'YYYY-MM-DD' : 'Pick a date')
        .closest('button') as HTMLButtonElement,
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '创建' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onSubmit.mock.calls[1]?.[0].inquiry).toEqual(
      valueFormat === 'date-only' ? '' : undefined,
    );
  },
);

it('treats an ordinary Date as its local calendar day', () => {
  render(
    <AutoForm
      schema={z.object({ inquiry: z.string().optional() })}
      initialValues={{ inquiry: new Date(2026, 8, 27) as unknown as string }}
      overrides={{
        inquiry: {
          'x-component': 'DatePicker',
          'x-component-props': { valueFormat: 'date-only' },
        },
      }}
      onSubmit={vi.fn()}
    />,
  );
  expect(
    screen.getByText('2026-09-27').closest('button') as HTMLButtonElement,
  ).toBeTruthy();
});

it.each(['2026-09-27T00:00:00.000Z', new Date('2026-09-27T00:00:00.000Z')])(
  'adapts an explicitly declared Host UTC projection in AutoForm: %s',
  (value) => {
    render(
      <AutoForm
        schema={z.object({ inquiry: z.string().optional() })}
        initialValues={{ inquiry: value as unknown as string }}
        overrides={{
          inquiry: {
            'x-component': 'DatePicker',
            'x-component-props': {
              valueFormat: 'date-only',
              dateInput: 'utc-projection',
            },
          },
        }}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText('2026-09-27')).toBeTruthy();
  },
);

it('marks the required date trigger invalid and clears its feedback after selecting', async () => {
  setDateFormatter(undefined, { locale: 'en-US', timeZone: 'Asia/Shanghai' });
  const ref = createRef<AutoFormRef>();
  render(
    <AutoForm
      ref={ref}
      schema={z.object({ inquiry: z.string() })}
      overrides={{
        inquiry: {
          required: true,
          'x-component': 'DatePicker',
          'x-component-props': { valueFormat: 'date-only' },
        },
      }}
      onSubmit={vi.fn()}
    />,
  );
  await expect(ref.current!.submit()).rejects.toBeDefined();
  const trigger = screen.getByText('YYYY-MM-DD').closest('button')!;
  await waitFor(() => expect(trigger.getAttribute('aria-invalid')).toBe('true'));
  expect(trigger.getAttribute('aria-describedby')).toBeTruthy();
  fireEvent.click(trigger);
  const day = document.querySelector<HTMLButtonElement>(
    '[data-slot="popover-content"] button[data-day]:not([disabled])',
  )!;
  fireEvent.click(day);
  await waitFor(() => expect(trigger.getAttribute('aria-invalid')).not.toBe('true'));
  expect(trigger.textContent).not.toContain('YYYY-MM-DD');
});
