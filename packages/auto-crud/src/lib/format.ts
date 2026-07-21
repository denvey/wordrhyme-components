import { useSyncExternalStore } from 'react';

export type DateFormatter = (date: Date, options: Intl.DateTimeFormatOptions) => string;

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
): string {
  if (date === undefined) return '';

  try {
    const value = new Date(date);
    const options = {
      month: opts.month ?? 'long',
      day: opts.day ?? 'numeric',
      year: opts.year ?? 'numeric',
      ...opts,
    } satisfies Intl.DateTimeFormatOptions;
    const hostDateFormatter = getHostDateFormatter();

    return hostDateFormatter
      ? hostDateFormatter(value, options)
      : new Intl.DateTimeFormat('en-US', options).format(value);
  } catch {
    return '';
  }
}
