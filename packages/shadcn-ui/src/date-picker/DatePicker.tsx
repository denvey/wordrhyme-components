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

import React, { useState } from 'react';

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
        valueFormat?: 'date';
        value?: Date | string | number | null;
        onChange?: (date: Date | undefined) => void;
      }
    | {
        valueFormat: 'date-only';
        value?: string | Date | null;
        onChange?: (date: string) => void;
      }
  );

function dateOnly(value: string | Date | null | undefined): Date | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setFullYear(year!, month! - 1, day!);
  date.setHours(0, 0, 0, 0);
  return serialize(date) === value ? date : undefined;
}

function serialize(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
  const selected =
    valueFormat === 'date-only'
      ? dateOnly(value as string | Date | null | undefined)
      : value == null || value === ''
        ? undefined
        : value instanceof Date
          ? Number.isNaN(value.getTime())
            ? undefined
            : value
          : typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
            ? dateOnly(value)
            : Number.isNaN(new Date(value).getTime())
              ? undefined
              : new Date(value);
  const { Button, Calendar, Popover, PopoverContent, PopoverTrigger } = primitives;
  const change = (date: Date | undefined) => {
    if (props.valueFormat === 'date-only') props.onChange?.(date ? serialize(date) : '');
    else props.onChange?.(date);
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
              (valueFormat === 'date-only'
                ? serialize(selected)
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
