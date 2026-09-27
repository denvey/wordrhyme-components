'use client';

import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import {
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@wordrhyme/shadcn';
import {
  calendarPresentation,
  parseCalendarDate,
  serializeCalendarDate,
} from '@/lib/calendar-date';
import { useDateFormatterVersion } from '@/lib/format';

export interface DateOnlyPickerProps {
  value?: string | Date | null;
  onChange?: (value: string) => void;
  id?: string;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
}

/** A calendar day is stored as YYYY-MM-DD, never as a UTC instant. */
export function DateOnlyPicker({
  value,
  onChange,
  id,
  disabled,
  readOnly,
  placeholder,
  className,
}: DateOnlyPickerProps) {
  useDateFormatterVersion();
  const presentation = calendarPresentation();
  // Host date projections arrive as UTC timestamps; retain their encoded day.
  const day =
    value instanceof Date
      ? Number.isNaN(value.getTime())
        ? undefined
        : value.toISOString().slice(0, 10)
      : typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)
        ? value.slice(0, 10)
        : undefined;
  const selected = day ? parseCalendarDate(day) : undefined;
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled || readOnly}
          className={cn(
            'w-full justify-start text-left font-normal',
            !selected && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {selected
            ? serializeCalendarDate(selected)
            : (placeholder ??
              (presentation.locale.toLowerCase().startsWith('zh')
                ? '选择日期'
                : 'Pick a date'))}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          // A year dropdown implicitly caps navigation at the current year.
          captionLayout="dropdown-months"
          formatters={presentation.formatters}
          labels={presentation.labels}
          weekStartsOn={presentation.weekStartsOn}
          onSelect={(date) => {
            onChange?.(date ? serializeCalendarDate(date) : '');
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
