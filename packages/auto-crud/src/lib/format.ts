import { useSyncExternalStore } from 'react';

export type DateFormatPreset = 'date' | 'datetime';

export type DateFormatter = (
  date: Date,
  options: Intl.DateTimeFormatOptions,
  preset?: DateFormatPreset,
) => string;

interface DateFormatterRegistration {
  formatter: DateFormatter;
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

function isValidCanonicalDate(value: string): boolean {
  const match = canonicalDatePattern.exec(value);
  if (!match) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() + 1 === Number(match[2]) &&
    date.getUTCDate() === Number(match[3])
  );
}

/**
 * Register the host's process-wide date presentation policy without coupling
 * AutoCrud to locale or timezone selection. The returned cleanup removes only
 * this registration, so overlapping registrations may be disposed out of order.
 * Passing undefined clears every registration.
 */
export function setDateFormatter(formatter?: DateFormatter): () => void {
  if (formatter === undefined) {
    const hadFormatter = hostDateFormatters.length > 0;
    hostDateFormatters = [];
    if (hadFormatter) notifyDateFormatterChange();
    return () => undefined;
  }

  const registration = { formatter, token: Symbol('date-formatter') };
  hostDateFormatters.push(registration);
  notifyDateFormatterChange();

  return () => {
    const currentFormatter = getHostDateFormatter();
    const previousLength = hostDateFormatters.length;
    hostDateFormatters = hostDateFormatters.filter(
      ({ token }) => token !== registration.token,
    );
    if (
      hostDateFormatters.length !== previousLength &&
      getHostDateFormatter() !== currentFormatter
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

  try {
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return '';
    const options = {
      month: opts.month ?? 'long',
      day: opts.day ?? 'numeric',
      year: opts.year ?? 'numeric',
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
