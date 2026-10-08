'use client';

import type { DatePickerProps } from '@wordrhyme/shadcn-ui';
import { DatePicker as FormilyDatePicker } from '@wordrhyme/formily-shadcn';
import { Button, Calendar, Popover, PopoverContent, PopoverTrigger } from '@wordrhyme/ui';
import { calendarPresentation } from '@/lib/calendar-date';
import { useDateFormatterVersion } from '@/lib/format';

const primitives = { Button, Calendar, Popover, PopoverContent, PopoverTrigger };

type FormDatePickerProps = DatePickerProps & {
  /** Only Host-projected UTC dates opt into retaining the encoded UTC day. */
  dateInput?: 'utc-projection';
};

export function DatePicker({ dateInput, ...props }: FormDatePickerProps) {
  if (props.valueFormat === 'YYYY-MM-DD' && dateInput === 'utc-projection') {
    const value = props.value;
    props = {
      ...props,
      value:
        value instanceof Date
          ? Number.isNaN(value.getTime())
            ? ''
            : value.toISOString().slice(0, 10)
          : typeof value === 'string' &&
              /^\d{4}-\d{2}-\d{2}T/.test(value) &&
              !Number.isNaN(Date.parse(value))
            ? value.slice(0, 10)
            : value,
    };
  }
  useDateFormatterVersion();
  const presentation = calendarPresentation();
  return (
    <FormilyDatePicker
      primitives={primitives}
      {...(props.valueFormat === 'YYYY-MM-DD'
        ? {
            captionLayout: 'dropdown-months' as const,
            formatters: presentation.formatters,
            labels: presentation.labels,
            weekStartsOn: presentation.weekStartsOn,
            placeholder: 'YYYY-MM-DD',
          }
        : {})}
      {...props}
    />
  );
}

/** @deprecated Use DatePicker with valueFormat="YYYY-MM-DD". */
export function DateOnlyPicker(
  props: Omit<
    Extract<DatePickerProps, { valueFormat: 'YYYY-MM-DD' }> &
      Pick<FormDatePickerProps, 'dateInput'>,
    'valueFormat'
  >,
) {
  return <DatePicker {...props} valueFormat="YYYY-MM-DD" />;
}
