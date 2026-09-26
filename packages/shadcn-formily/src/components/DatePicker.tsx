'use client';

import type { DatePickerProps as ShadcnDatePickerProps } from '@wordrhyme/shadcn-ui';
import { connect, mapProps } from '@formily/react';
import { DatePicker as ShadcnDatePicker } from '@wordrhyme/shadcn-ui';

type BaseDatePickerProps = {
  value?: Date | string | number | null;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
} & Omit<ShadcnDatePickerProps, 'value' | 'selected' | 'onSelect' | 'mode'>;

function toDate(value: BaseDatePickerProps['value']): Date | undefined {
  if (value == null || value === '') return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;

  // Date-only fields represent a local calendar day, not UTC midnight.
  const parts = typeof value === 'string'
    ? /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/u.exec(value)
    : null;
  const date = parts
    ? new Date(Number(parts.groups?.year), Number(parts.groups?.month) - 1, Number(parts.groups?.day))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  if (parts && (date.getFullYear() !== Number(parts.groups?.year)
    || date.getMonth() !== Number(parts.groups?.month) - 1
    || date.getDate() !== Number(parts.groups?.day))) return undefined;
  return date;
}

/**
 * Formily-connected Date Picker component
 * Displays a date picker with calendar popup
 */
function BaseDatePicker(props: BaseDatePickerProps) {
  return <ShadcnDatePicker {...props} value={toDate(props.value)} />;
}

export const DatePicker = connect(BaseDatePicker, mapProps());
