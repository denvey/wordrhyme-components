import { getDateLocaleOptions } from './format';

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

export function calendarPresentation() {
  const locale = getDateLocaleOptions()?.locale ?? 'en-US';
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
    formatDate: (date: Date | undefined) =>
      date ? format(date, { year: 'numeric', month: 'long', day: 'numeric' }) : '',
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
