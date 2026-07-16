import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDate, setDateFormatter } from './format';

afterEach(() => {
  setDateFormatter(undefined);
});

describe('formatDate host adapter', () => {
  it('delegates date presentation to the configured host formatter', () => {
    const formatter = vi.fn(() => 'host-formatted');
    setDateFormatter(formatter);

    expect(formatDate('2026-07-15T00:00:00.000Z')).toBe('host-formatted');
    expect(formatter).toHaveBeenCalledWith(
      new Date('2026-07-15T00:00:00.000Z'),
      expect.objectContaining({ month: 'long', day: 'numeric', year: 'numeric' }),
    );
  });

  it('restores the previous formatter through the cleanup callback', () => {
    setDateFormatter(() => 'first');
    const restore = setDateFormatter(() => 'second');

    expect(formatDate('2026-07-15T00:00:00.000Z')).toBe('second');
    restore();
    expect(formatDate('2026-07-15T00:00:00.000Z')).toBe('first');
  });

  it('supports disposing overlapping formatters out of order', () => {
    const restoreFirst = setDateFormatter(() => 'first');
    const restoreSecond = setDateFormatter(() => 'second');

    restoreFirst();
    expect(formatDate('2026-07-15T00:00:00.000Z')).toBe('second');

    restoreSecond();
    expect(formatDate('2026-07-15T00:00:00.000Z')).not.toBe('first');
    expect(formatDate('2026-07-15T00:00:00.000Z')).not.toBe('second');
  });

  it('formats the Unix epoch instead of treating zero as empty', () => {
    expect(formatDate(0)).not.toBe('');
  });
});
