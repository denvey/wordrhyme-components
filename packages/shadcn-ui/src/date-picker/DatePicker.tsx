'use client';

import type { ComponentProps } from 'react';
import {
  Button,
  Calendar,
  cn,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@wordrhyme/shadcn';

import { CalendarIcon, XIcon } from 'lucide-react';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import isoWeek from 'dayjs/plugin/isoWeek.js';
import localizedFormat from 'dayjs/plugin/localizedFormat.js';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';
import weekOfYear from 'dayjs/plugin/weekOfYear.js';
import weekYear from 'dayjs/plugin/weekYear.js';

import React, { useState } from 'react';

dayjs.extend(customParseFormat);
dayjs.extend(localizedFormat);
dayjs.extend(weekOfYear);
dayjs.extend(weekYear);
dayjs.extend(isoWeek);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);

type CalendarProps = Omit<
  ComponentProps<typeof Calendar>,
  'selected' | 'onSelect' | 'mode'
>;
const defaultPrimitives = { Button, Calendar, Popover, PopoverContent, PopoverTrigger };

type CommonProps = CalendarProps &
  Pick<ComponentProps<typeof Button>, 'aria-invalid' | 'aria-describedby'> & {
    id?: string;
    placeholder?: string;
    readOnly?: boolean;
    showClearButton?: boolean;
    formatValue?: (date: Date) => string;
    /** Use the same UI primitives as the containing modal. */
    primitives?: typeof defaultPrimitives;
  };

export type DatePickerProps = CommonProps &
  (
    | {
        valueFormat?: undefined;
        value?: Date | string | number | null;
        onChange?: (date: Date | undefined) => void;
      }
    | {
        /** Day.js format used for parsing and serializing the controlled value. */
        valueFormat: string;
        value?: string | Date | null;
        onChange?: (date: string) => void;
      }
  );

function formatDate(date: Date, format: string): string {
  // DayPicker can return TZDate: retain its calendar fields when Day.js clones it.
  return dayjs(date).utcOffset(-date.getTimezoneOffset()).format(format);
}

function parseValue(
  value: DatePickerProps['value'],
  valueFormat?: string,
): Date | undefined {
  if (value == null || value === '') return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  const format =
    valueFormat ??
    (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? 'YYYY-MM-DD'
      : undefined);
  if (format !== undefined) {
    if (typeof value !== 'string') return undefined;
    if (format === 'YYYY-MM-DD' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      // Native ISO parsing also retains years 0000–0099 without mapping them to 1900.
      const date = new Date(`${value}T00:00:00`);
      return !Number.isNaN(date.getTime()) && formatDate(date, format) === value
        ? date
        : undefined;
    }
    const date = dayjs(value, format, true);
    return date.isValid() ? date.toDate() : undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function DatePicker(props: DatePickerProps) {
  const {
    id,
    value,
    valueFormat,
    onChange,
    placeholder = 'Pick a date',
    readOnly,
    showClearButton = true,
    formatValue,
    primitives = defaultPrimitives,
    'aria-invalid': ariaInvalid,
    'aria-describedby': ariaDescribedBy,
    ...calendarProps
  } = props;
  const [open, setOpen] = useState(false);
  if (valueFormat !== undefined && valueFormat.trim() === '') {
    throw new TypeError('valueFormat must be a non-empty Day.js format string.');
  }
  const selected = parseValue(value, valueFormat);
  const { Button, Calendar, Popover, PopoverContent, PopoverTrigger } = primitives;
  const change = (date: Date | undefined) => {
    if (props.valueFormat !== undefined) {
      props.onChange?.(date ? formatDate(date, props.valueFormat) : '');
    } else props.onChange?.(date);
    setOpen(false);
  };
  return (
    <div className="relative flex items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedBy}
            type="button"
            variant="outline"
            disabled={readOnly || calendarProps.disabled === true}
            className={cn(
              'w-full justify-start text-left font-normal aria-invalid:border-destructive aria-invalid:ring-destructive/20',
              !selected && 'text-muted-foreground',
              showClearButton && selected && 'pr-8',
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selected ? (
              (formatValue?.(selected) ??
              (valueFormat !== undefined
                ? formatDate(selected, valueFormat)
                : selected.toLocaleDateString()))
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={change}
            initialFocus
            {...calendarProps}
          />
        </PopoverContent>
      </Popover>
      {showClearButton && selected && (
        <button
          type="button"
          data-slot="clear-button"
          disabled={readOnly || calendarProps.disabled === true}
          onClick={() => change(undefined)}
          className="absolute right-2 text-muted-foreground hover:text-foreground"
          aria-label="Clear date"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

DatePicker.displayName = 'DatePicker';
