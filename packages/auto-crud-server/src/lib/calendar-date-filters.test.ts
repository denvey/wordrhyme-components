import { PgDialect, pgTable, timestamp } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { serializeCalendarDate } from '../../../auto-crud/src/lib/calendar-date';
import { filterColumns } from './filter-columns';

const records = pgTable('calendar_records', {
  createdAt: timestamp('created_at', { withTimezone: true }),
});

function query(value: unknown, operator: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'isBetween', variant: 'date' | 'dateRange' = 'date') {
  const condition = filterColumns({
    table: records,
    filters: [{ id: 'createdAt', value, variant, operator }],
    joinOperator: 'and',
  });
  if (!condition) return undefined;
  const compiled = new PgDialect().sqlToQuery(condition);
  return {
    ...compiled,
    // Assert boundary instants independently of the driver's parameter encoding.
    params: compiled.params.map((value) => value instanceof Date ? value : new Date(String(value))),
  };
}

describe('calendar filter serialization without a host date resolver', () => {
  const selected = new Date(2026, 8, 14);
  const start = new Date(2026, 8, 14, 0, 0, 0, 0);
  const end = new Date(2026, 8, 14, 23, 59, 59, 999);

  it.each([
    ['eq', [start, end]], ['ne', [start, end]], ['lt', [end]],
    ['lte', [end]], ['gt', [start]], ['gte', [start]],
  ] as const)('keeps the selected calendar day in %s SQL conditions', (operator, boundaries) => {
    const result = query(serializeCalendarDate(selected), operator);
    expect(result?.sql).toContain('"calendar_records"."created_at"');
    expect(result?.params).toEqual(boundaries);
  });

  it.each(['eq', 'isBetween'] as const)('uses serialized calendar ranges with %s', (operator) => {
    const last = new Date(2026, 8, 16);
    const result = query([serializeCalendarDate(selected), serializeCalendarDate(last)], operator, 'dateRange');
    expect(result?.sql).toContain(' >= $1');
    expect(result?.sql).toContain(' <= $2');
    expect(result?.params).toEqual([start, new Date(2026, 8, 16, 23, 59, 59, 999)]);
  });

  it.each(['2026-02-30', '2026-13-01', '2026-00-01', '2026-09-00', '2026-02-29'])('rejects invalid calendar date %s', (value) => {
    expect(query(value, 'eq')).toBeUndefined();
  });

  it('accepts a valid leap day', () => {
    expect(query('2028-02-29', 'eq')?.params).toEqual([
      new Date(2028, 1, 29), new Date(2028, 1, 29, 23, 59, 59, 999),
    ]);
  });

  it('preserves legacy numeric timestamp ranges', () => {
    expect(query([selected.getTime(), selected.getTime()], 'isBetween', 'dateRange')?.params).toEqual([start, end]);
  });
});
