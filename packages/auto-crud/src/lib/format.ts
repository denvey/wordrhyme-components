export type DateFormatter = (date: Date, options: Intl.DateTimeFormatOptions) => string;

interface DateFormatterRegistration {
  formatter: DateFormatter;
  token: symbol;
}

let hostDateFormatters: DateFormatterRegistration[] = [];

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
    hostDateFormatters = [];
    return () => undefined;
  }

  const registration = { formatter, token: Symbol('date-formatter') };
  hostDateFormatters.push(registration);

  return () => {
    hostDateFormatters = hostDateFormatters.filter(
      ({ token }) => token !== registration.token,
    );
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
