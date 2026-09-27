import { createForm } from '@formily/core';
import { Field, FormProvider } from '@formily/react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DatePicker } from '../../src/components/DatePicker';

const selected = new Date(2026, 8, 27);
vi.mock('@wordrhyme/shadcn-ui', () => ({
  DatePicker: ({ value, onChange }: { value?: Date; onChange?: (date?: Date) => void }) => (
    <>
      <button type="button" onClick={() => onChange?.(selected)}>
        {value ? `${value.getFullYear()}-${value.getMonth() + 1}-${value.getDate()}` : 'Pick a date'}
      </button>
      <button type="button" onClick={() => onChange?.(undefined)}>Clear</button>
    </>
  ),
}));
afterEach(cleanup);

function mount(value: unknown) {
  const form = createForm({ initialValues: { inquiryDate: value } });
  render(<FormProvider form={form}><Field name="inquiryDate" component={[DatePicker]} /></FormProvider>);
  return form;
}

describe('formily DatePicker serialized values', () => {
  it.each(['2026-09-26', new Date(2026, 8, 26), new Date(2026, 8, 26).getTime()])(
    'renders a persisted date without changing the form on mount: %s', (value) => {
      const form = mount(value);
      expect(screen.getByText('2026-9-26')).toBeTruthy();
      expect(form.values.inquiryDate).toEqual(value);
    },
  );

  it.each([
    '2026-09-26T00:00:00.000Z',
    '2026-09-26T12:00:00.000Z',
    Date.UTC(2026, 8, 26, 12),
  ])('renders an instant as its local calendar day: %s', (value) => {
    const form = mount(value);
    // Instants can fall on the previous or next day in the runner's timezone.
    const localDate = new Date(value);
    const expected = `${localDate.getFullYear()}-${localDate.getMonth() + 1}-${localDate.getDate()}`;
    expect(screen.getByText(expected)).toBeTruthy();
    expect(form.values.inquiryDate).toEqual(value);
  });

  it.each([undefined, null, '', 'invalid', '2026-02-30', new Date(Number.NaN)])(
    'renders empty and invalid values safely: %s', (value) => {
      mount(value);
      expect(screen.getByText('Pick a date')).toBeTruthy();
    },
  );

  it('preserves Date selection and clearing callbacks after string hydration', () => {
    const form = mount('2026-09-26');
    fireEvent.click(screen.getByText('2026-9-26'));
    expect(form.values.inquiryDate).toEqual(selected);
    fireEvent.click(screen.getByText('Clear'));
    expect(form.values.inquiryDate).toBeUndefined();
  });
});
