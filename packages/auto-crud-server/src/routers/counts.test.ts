import { describe, expect, it, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { eq, sql } from 'drizzle-orm';
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { baseCountsInputSchema, createCrudRouter } from './_factory';
import type { CountsInput, CountsResult } from '../types/config';

const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  status: text('status').notNull(),
  deletedAt: timestamp('deleted_at'),
});
const schema = z.object({
  id: z.string(),
  organizationId: z.string(),
  status: z.string(),
});
const filter = (id: string, value: string) => ({
  id,
  value,
  variant: 'select',
  operator: 'eq',
  filterId: id,
});

function fixture(overrides: Record<string, unknown> = {}) {
  const execute = vi.fn(async (_query: string, _params: unknown[]) => ({
    rows: [[4, 2]],
  }));
  const raw = drizzle(execute);
  const db = Object.assign(raw, {
    $counts: async (table: typeof tasks, filters: Record<string, unknown>) => {
      const entries = Object.entries(filters);
      const selection = Object.fromEntries(
        entries.map(([, where], i) => [
          `c${i}`,
          sql<number>`count(*) filter (where ${where ?? sql`true`})::int`,
        ]),
      );
      const [row] = await raw.select(selection).from(table);
      return Object.fromEntries(entries.map(([key], i) => [key, row![`c${i}`]]));
    },
  });
  const guard = vi.fn(() => true);
  const enrichRows = vi.fn();
  const router = createCrudRouter({
    id: 'tasks',
    table: tasks,
    schema,
    selectSchema: schema,
    counts: true,
    softDelete: 'deletedAt',
    guard,
    scope: () => eq(tasks.organizationId, 'org-a'),
    ...overrides,
  });
  const ctx = { db, crudExtensions: { enrichRows } };
  const caller = router.createCaller(ctx) as unknown as {
    counts(input: CountsInput): Promise<CountsResult>;
  };
  return { caller, router, execute, guard, enrichRows, db };
}

describe('opt-in batch counts', () => {
  it('uses one SQL aggregate with list scope and soft deletion for every count, without fetching rows', async () => {
    const f = fixture();
    expect(
      await f.caller.counts({
        queries: [
          { key: 'total', joinOperator: 'and' },
          {
            key: 'status:done',
            filters: [filter('status', 'done')],
            joinOperator: 'and',
          },
        ],
      }),
    ).toEqual({ counts: { total: 4, 'status:done': 2 } });
    expect(f.execute).toHaveBeenCalledTimes(1);
    const [query, params] = f.execute.mock.calls[0] as unknown as [string, unknown[]];
    expect(query.match(/count\(\*\) filter/g)).toHaveLength(2);
    expect(query.match(/"deleted_at" is null/g)).toHaveLength(2);
    expect(params).toEqual(['org-a', 'org-a', 'done']);
    expect(query).not.toMatch(/order by|limit |offset |join /i);
    expect(f.guard).toHaveBeenCalledWith(expect.anything(), 'list');
    expect(f.enrichRows).not.toHaveBeenCalled();
    expect(f.router._def.procedures.counts.meta?.__crudOperation).toBe('list');
  });

  it('requires scoped batch support and never falls back to raw aggregation', async () => {
    const f = fixture();
    Reflect.deleteProperty(f.db, '$counts');
    await expect(
      f.caller.counts({ queries: [{ key: 'all', joinOperator: 'and' }] }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    expect(f.execute).not.toHaveBeenCalled();
  });

  it('rejects reserved object keys before querying', async () => {
    const f = fixture();
    for (const key of ['__proto__', 'constructor', 'prototype']) {
      await expect(
        f.caller.counts({ queries: [{ key, joinOperator: 'and' }] }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    }
    expect(f.execute).not.toHaveBeenCalled();
  });

  it('requires opt-in and rejects duplicate keys or excessive batches', () => {
    const router = createCrudRouter({ table: tasks, schema });
    expect(router._def.procedures).not.toHaveProperty('counts');
    const query = { key: 'same', joinOperator: 'and' };
    expect(baseCountsInputSchema.safeParse({ queries: [query, query] }).success).toBe(
      false,
    );
    expect(baseCountsInputSchema.safeParse({ queries: [] }).success).toBe(false);
    expect(
      baseCountsInputSchema.safeParse({
        queries: Array.from({ length: 101 }, (_, i) => ({ ...query, key: String(i) })),
      }).success,
    ).toBe(false);
  });

  it('does not access data when list access is denied', async () => {
    const f = fixture({ guard: () => false });
    await expect(
      f.caller.counts({ queries: [{ key: 'all', joinOperator: 'and' }] }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(f.execute).not.toHaveBeenCalled();
  });

  it('composes extension filters and server-side batch middleware without list enrichment', async () => {
    const buildConditions = vi.fn(async () => ({ filter: sql`false` }));
    const f = fixture({
      extensions: { buildConditions },
      middleware: {
        counts: async ({
          input,
          next,
        }: {
          input: CountsInput;
          next: (input: CountsInput) => Promise<CountsResult>;
        }) =>
          next({
            queries: input.queries.map((query) => ({
              ...query,
              filters: [filter('extension', 'missing')],
            })),
          }),
      },
    });
    await f.caller.counts({
      queries: [
        { key: 'a', joinOperator: 'and' },
        { key: 'b', joinOperator: 'and' },
      ],
    });
    expect(buildConditions).toHaveBeenCalledTimes(2);
    const query = f.execute.mock.calls[0]?.[0] as unknown as string;
    expect(query.match(/false/g)).toHaveLength(2);
    expect(f.execute).toHaveBeenCalledTimes(1);
  });

  it('fails closed if extension filters cannot be compiled', async () => {
    const f = fixture();
    await expect(
      f.caller.counts({
        queries: [
          { key: 'x', filters: [filter('extension', 'private')], joinOperator: 'or' },
        ],
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    expect(f.execute).not.toHaveBeenCalled();
  });
});
