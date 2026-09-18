import { useSyncExternalStore } from 'react';

export type DateFormatPreset = 'date' | 'datetime';

export type DateFormatter = (
  date: Date,
  options: Intl.DateTimeFormatOptions,
  preset?: DateFormatPreset,
) => string;

export interface DateLocaleOptions {
  locale: string;
  /** Host policy metadata; calendar days are not shifted into this zone.
   * Configure the server's resolveDateRange separately for query boundaries.
   */
  timeZone: string;
}

interface DateFormatterRegistration {
  formatter: DateFormatter;
  options?: DateLocaleOptions;
  token: symbol;
}

let hostDateFormatters: DateFormatterRegistration[] = [];
let dateFormatterVersion = 0;
const dateFormatterListeners = new Set<() => void>();

function notifyDateFormatterChange(): void {
  dateFormatterVersion += 1;
  dateFormatterListeners.forEach((listener) => listener());
}

function subscribeDateFormatter(listener: () => void): () => void {
  dateFormatterListeners.add(listener);
  return () => {
    dateFormatterListeners.delete(listener);
  };
}

function getDateFormatterVersion(): number {
  return dateFormatterVersion;
}

export function useDateFormatterVersion(): number {
  return useSyncExternalStore(
    subscribeDateFormatter,
    getDateFormatterVersion,
    getDateFormatterVersion,
  );
}

function getHostDateFormatter(): DateFormatter | undefined {
  return hostDateFormatters[hostDateFormatters.length - 1]?.formatter;
}

const canonicalDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const canonicalDateTimePrefixPattern = /^(\d{4})-(\d{2})-(\d{2})(?=[T ])/;

function isValidCalendarDate(
  year: string | undefined,
  month: string | undefined,
  day: string | undefined,
): boolean {
  if (!year || !month || !day) return false;

  const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() + 1 === Number(month) &&
    date.getUTCDate() === Number(day)
  );
}

function isValidCanonicalDate(value: string): boolean {
  const match = canonicalDatePattern.exec(value);
  return !!match && isValidCalendarDate(match[1], match[2], match[3]);
}

function hasValidCanonicalDateTimePrefix(value: string): boolean {
  const match = canonicalDateTimePrefixPattern.exec(value);
  return !match || isValidCalendarDate(match[1], match[2], match[3]);
}

export function getDateLocaleOptions(): DateLocaleOptions | undefined {
  return hostDateFormatters[hostDateFormatters.length - 1]?.options;
}

/**
 * Register the host's date formatter and optional calendar locale policy.
 * Cleanup removes only this registration, including out-of-order cleanup.
 * Passing undefined clears every registration.
 */
export function setDateFormatter(
  formatter?: DateFormatter,
  options?: DateLocaleOptions,
): () => void {
  if (formatter === undefined) {
    const hadFormatter = hostDateFormatters.length > 0;
    hostDateFormatters = [];
    if (hadFormatter) notifyDateFormatterChange();
    return () => undefined;
  }

  const registration = {
    formatter,
    ...(options ? { options } : {}),
    token: Symbol('date-formatter'),
  };
  hostDateFormatters.push(registration);
  notifyDateFormatterChange();

  return () => {
    const currentRegistration = hostDateFormatters[hostDateFormatters.length - 1];
    const previousLength = hostDateFormatters.length;
    hostDateFormatters = hostDateFormatters.filter(
      ({ token }) => token !== registration.token,
    );
    if (
      hostDateFormatters.length !== previousLength &&
      hostDateFormatters[hostDateFormatters.length - 1] !== currentRegistration
    ) {
      notifyDateFormatterChange();
    }
  };
}

export function formatDate(
  date: Date | string | number | undefined,
  opts: Intl.DateTimeFormatOptions = {},
  preset?: DateFormatPreset,
): string {
  if (date === undefined) return '';
  if (preset === 'date' && typeof date === 'string' && canonicalDatePattern.test(date)) {
    return isValidCanonicalDate(date) ? date : '';
  }
  if (
    preset === 'datetime' &&
    typeof date === 'string' &&
    !hasValidCanonicalDateTimePrefix(date)
  ) {
    return '';
  }

  try {
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return '';
    const options = {
      month: opts.month ?? (preset ? '2-digit' : 'long'),
      day: opts.day ?? (preset ? '2-digit' : 'numeric'),
      year: opts.year ?? 'numeric',
      ...(preset === 'datetime'
        ? {
            hour: opts.hour ?? ('2-digit' as const),
            minute: opts.minute ?? ('2-digit' as const),
            second: opts.second ?? ('2-digit' as const),
            hourCycle: opts.hourCycle ?? ('h23' as const),
          }
        : {}),
      ...opts,
    } satisfies Intl.DateTimeFormatOptions;
    const hostDateFormatter = getHostDateFormatter();

    if (hostDateFormatter) {
      return preset
        ? hostDateFormatter(value, options, preset)
        : hostDateFormatter(value, options);
    }

    if (preset) {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: opts.timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        ...(preset === 'datetime'
          ? {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hourCycle: 'h23' as const,
            }
          : {}),
      }).formatToParts(value);
      const read = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((part) => part.type === type)?.value ?? '';
      const formattedDate = `${read('year')}-${read('month')}-${read('day')}`;

      return preset === 'datetime'
        ? `${formattedDate} ${read('hour')}:${read('minute')}:${read('second')}`
        : formattedDate;
    }

    return new Intl.DateTimeFormat('en-US', options).format(value);
  } catch {
    return '';
  }
}
