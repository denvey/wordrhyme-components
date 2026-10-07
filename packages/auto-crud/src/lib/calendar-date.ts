import { useEffect, useState } from 'react';
import {
  formatDate as formatLegacyDate,
  getDateLocaleOptions,
  useDateFormatterVersion,
} from './format';

/** Calendar days are wall dates, never instants in the host's time zone. */
export function serializeCalendarDate(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseCalendarDate(value: string | number | undefined): Date | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00`);
    return !Number.isNaN(date.getTime()) && serializeCalendarDate(date) === value
      ? date
      : undefined;
  }
  const date = new Date(Number(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Resolve bounds and the calendar's today marker in the Host's configured time zone. */
export function calendarMaxDate(value: string | undefined): Date | undefined {
  if (value !== 'today') return parseCalendarDate(value);
  return parseCalendarDate(calendarDay(new Date(), calendarDayFormatter()));
}

function calendarDayFormatter() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: getDateLocaleOptions()?.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function calendarDay(date: Date, formatter: Intl.DateTimeFormat): string {
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Keep both the today marker and relative bounds current while a filter stays mounted. */
export function useCalendarToday(): Date {
  useDateFormatterVersion();
  const timeZone = getDateLocaleOptions()?.timeZone;
  const [today, setToday] = useState(() => calendarMaxDate('today')!);

  useEffect(() => {
    const formatter = calendarDayFormatter();
    let timer: ReturnType<typeof setTimeout>;

    const refresh = () => {
      clearTimeout(timer);
      const now = Date.now();
      const day = calendarDay(new Date(now), formatter);
      setToday((previous) =>
        serializeCalendarDate(previous) === day ? previous : parseCalendarDate(day)!,
      );

      // Locate the next Host midnight without assuming a day is 24 hours (DST).
      let before = now;
      let after = now + 48 * 60 * 60 * 1000;
      while (after - before > 1) {
        const middle = Math.floor((before + after) / 2);
        if (calendarDay(new Date(middle), formatter) === day) before = middle;
        else after = middle;
      }
      timer = setTimeout(refresh, Math.max(1, after - Date.now()));
    };
    const onVisibilityChange = () => {
      if (!document.hidden) refresh();
    };

    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [timeZone]);

  return today;
}

export function calendarPresentation() {
  const localeOptions = getDateLocaleOptions();
  const locale = localeOptions?.locale ?? 'en-US';
  const chinese = locale.toLowerCase().startsWith('zh');
  const localeInfo = new Intl.Locale(locale) as Intl.Locale & {
    weekInfo?: { firstDay: number };
    getWeekInfo?: () => { firstDay: number };
  };
  const firstDay =
    localeInfo.getWeekInfo?.().firstDay ??
    localeInfo.weekInfo?.firstDay ??
    (chinese ? 1 : 7);
  const format = (date: Date, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(
      new Date(`${serializeCalendarDate(date)}T00:00:00Z`),
    );
  return {
    locale,
    weekStartsOn: (firstDay % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    formatDate: (date: Date | undefined) => {
      // Existing registrations own selected-date labels until the host opts into
      // calendar presentation. Calendar headings still use calendar-day formatting.
      if (!localeOptions) return formatLegacyDate(date);
      return date ? format(date, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    },
    clearLabel: (title: string | undefined) =>
      chinese ? `清除${title ?? ''}筛选` : `Clear ${title ?? ''} filter`,
    formatters: {
      formatCaption: (date: Date) => format(date, { year: 'numeric', month: 'long' }),
      formatMonthDropdown: (date: Date) => format(date, { month: 'long' }),
      formatWeekdayName: (date: Date) => format(date, { weekday: 'short' }),
    },
    labels: {
      labelNext: () => (chinese ? '下个月' : 'Go to the Next Month'),
      labelPrevious: () => (chinese ? '上个月' : 'Go to the Previous Month'),
      labelMonthDropdown: () => (chinese ? '选择月份' : 'Choose the Month'),
      labelYearDropdown: () => (chinese ? '选择年份' : 'Choose the Year'),
      labelGrid: (date: Date) => format(date, { year: 'numeric', month: 'long' }),
      labelWeekday: (date: Date) => format(date, { weekday: 'long' }),
      labelDayButton: (date: Date) =>
        format(date, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
    },
  };
}
