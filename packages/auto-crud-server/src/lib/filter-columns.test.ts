import type { DateRangeResolver } from './filter-columns';
import { PgDialect, pgTable, timestamp } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';
import { filterColumns } from './filter-columns';

const records = pgTable('records', {
  createdAt: timestamp('created_at', { withTimezone: true }),
}).enableRLS();

function compile(condition: ReturnType<typeof filterColumns>) {
  if (!condition) throw new Error('Expected a SQL condition');
  return new PgDialect().sqlToQuery(condition);
}

describe('filterColumns date range resolver', () => {
  it('uses host UTC boundaries as a half-open range', () => {
    const start = new Date('2026-03-08T05:00:00.000Z');
    const endExclusive = new Date('2026-03-09T04:00:00.000Z');
    const resolveDateRange: DateRangeResolver<typeof records> = vi.fn(() => ({
      start,
      endExclusive,
    }));

    const query = compile(
      filterColumns({
        table: records,
        filters: [
          {
            id: 'createdAt',
            value: '1772946000000',
            variant: 'date',
            operator: 'eq',
          },
        ],
        joinOperator: 'and',
        resolveDateRange,
      }),
    );

    expect(resolveDateRange).toHaveBeenCalledOnce();
    expect(query.sql).toContain('"records"."created_at" >= $1');
    expect(query.sql).toContain('"records"."created_at" < $2');
    expect(query.params).toEqual([start, endExclusive]);
  });

  it('uses the exclusive end for inclusive date comparisons', () => {
    const endExclusive = new Date('2026-07-16T00:00:00.000Z');

    const query = compile(
      filterColumns({
        table: records,
        filters: [
          {
            id: 'createdAt',
            value: '1784073600000',
            variant: 'date',
            operator: 'lte',
          },
        ],
        joinOperator: 'and',
        resolveDateRange: () => ({ endExclusive }),
      }),
    );

    expect(query.sql).toContain('"records"."created_at" < $1');
    expect(query.params).toEqual([endExclusive]);
  });

  it.each([
    ['lt', '"records"."created_at" < $1', new Date('2026-07-15T00:00:00.000Z')],
    ['lte', '"records"."created_at" < $1', new Date('2026-07-16T00:00:00.000Z')],
    ['gt', '"records"."created_at" >= $1', new Date('2026-07-16T00:00:00.000Z')],
    ['gte', '"records"."created_at" >= $1', new Date('2026-07-15T00:00:00.000Z')],
  ] as const)('uses natural-day boundaries for %s', (operator, sqlFragment, boundary) => {
    const start = new Date('2026-07-15T00:00:00.000Z');
    const endExclusive = new Date('2026-07-16T00:00:00.000Z');
    const query = compile(
      filterColumns({
        table: records,
        filters: [
          {
            id: 'createdAt',
            value: '2026-07-15',
            variant: 'date',
            operator,
          },
        ],
        joinOperator: 'and',
        resolveDateRange: () => ({ start, endExclusive }),
      }),
    );

    expect(query.sql).toContain(sqlFragment);
    expect(query.params).toEqual([boundary]);
  });

  it('preserves legacy local parsing when the host resolver is absent', () => {
    const selected = new Date(2026, 6, 15);
    const expectedStart = new Date(selected);
    expectedStart.setHours(0, 0, 0, 0);
    const expectedEnd = new Date(selected);
    expectedEnd.setHours(23, 59, 59, 999);

    const query = compile(
      filterColumns({
        table: records,
        filters: [
          {
            id: 'createdAt',
            value: String(selected.getTime()),
            variant: 'date',
            operator: 'eq',
          },
        ],
        joinOperator: 'and',
      }),
    );

    expect(query.sql).toContain('"records"."created_at" >= $1');
    expect(query.sql).toContain('"records"."created_at" <= $2');
    expect(query.params).toEqual([expectedStart, expectedEnd]);
  });

  it('rejects invalid host boundaries instead of widening the filter', () => {
    expect(() =>
      filterColumns({
        table: records,
        filters: [
          {
            id: 'createdAt',
            value: '1784073600000',
            variant: 'date',
            operator: 'eq',
          },
        ],
        joinOperator: 'and',
        resolveDateRange: () => ({
          start: new Date(Number.NaN),
          endExclusive: new Date('2026-07-16T00:00:00.000Z'),
        }),
      }),
    ).toThrow('invalid start boundary');
  });

  it('rejects incomplete boundaries instead of falling back to local parsing', () => {
    expect(() =>
      filterColumns({
        table: records,
        filters: [
          {
            id: 'createdAt',
            value: '1784073600000',
            variant: 'date',
            operator: 'lte',
          },
        ],
        joinOperator: 'and',
        resolveDateRange: () => ({
          start: new Date('2026-07-15T00:00:00.000Z'),
        }),
      }),
    ).toThrow('endExclusive for operator lte');
  });

  it('rejects reversed host boundaries', () => {
    expect(() =>
      filterColumns({
        table: records,
        filters: [
          {
            id: 'createdAt',
            value: '1784073600000',
            variant: 'date',
            operator: 'eq',
          },
        ],
        joinOperator: 'and',
        resolveDateRange: () => ({
          start: new Date('2026-07-16T00:00:00.000Z'),
          endExclusive: new Date('2026-07-15T00:00:00.000Z'),
        }),
      }),
    ).toThrow('start to be before endExclusive');
  });
});
