import { describe, expect, it, vi } from 'vitest';
import { eq, type SQL } from 'drizzle-orm';
import { PgDialect, pgTable, text } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { createCrudRouter } from './_factory';

const table = pgTable('items', {
  key: text('key').primaryKey(),
  tenant: text('tenant').notNull(),
  deletedAt: text('deleted_at'),
});
const schema = z.object({
  key: z.string(),
  tenant: z.string(),
  deletedAt: z.string().nullable(),
});
const rows = [
  { key: 'one', tenant: 'allowed', deletedAt: null },
  { key: 'two', tenant: 'allowed', deletedAt: null },
  { key: 'denied', tenant: 'other', deletedAt: null },
];
type Row = z.infer<typeof schema>;
type Caller = {
  deleteMany: (ids: string[]) => Promise<{ deleted: number }>;
  delete: (id: string) => Promise<Row>;
};

// A transactional fake: only successful callbacks publish base and hook writes.
// Query results are controlled independently of input to model scope/concurrent misses.
function database(returnedIds = ['one', 'two']) {
  const state = { rows: structuredClone(rows) as Row[], effects: [] as string[] };
  const queries: Array<{ kind: string; where: SQL; selection: unknown[] }> = [];
  function connection(data: typeof state) {
    function query(kind: string) {
      let where: SQL;
      let values: Partial<Row> = {};
      const builder = {
        from: vi.fn(() => builder),
        where: vi.fn((value: SQL) => {
          where = value;
          return builder;
        }),
        set: vi.fn((value: Partial<Row>) => {
          values = value;
          return builder;
        }),
        then: (resolve: (result: Row[]) => unknown) => {
          queries.push({ kind, where, selection: [] });
          return Promise.resolve(
            data.rows
              .filter((row) => row.tenant === 'allowed')
              .map((row) => ({ ...row })),
          ).then(resolve);
        },
        returning: vi.fn((...selection: unknown[]) => {
          queries.push({ kind, where, selection });
          const affected = data.rows.filter((row) => returnedIds.includes(row.key));
          if (kind === 'delete')
            data.rows = data.rows.filter((row) => !returnedIds.includes(row.key));
          else affected.forEach((row) => Object.assign(row, values));
          return affected.map((row) => (selection.length ? { id: row.key } : { ...row }));
        }),
      };
      return builder;
    }
    return {
      data,
      select: vi.fn(() => query('select')),
      delete: vi.fn(() => query('delete')),
      update: vi.fn(() => query('update')),
      transaction: vi.fn(
        async (
          callback: (tx: ReturnType<typeof connection>) => Promise<unknown>,
        ): Promise<unknown> => {
          const pending = structuredClone(data);
          const result = await callback(connection(pending));
          Object.assign(data, pending);
          return result;
        },
      ),
    };
  }
  return { db: connection(state), state, queries };
}

function caller(
  db: unknown,
  hooks?: unknown,
  options: { soft?: boolean; tx?: unknown; id?: string | false } = {},
) {
  const router = createCrudRouter({
    id: options.id === false ? undefined : (options.id ?? 'com.wordrhyme.shop.items'),
    table,
    idField: 'key',
    schema,
    selectSchema: schema,
    scope: () => eq(table.tenant, 'allowed'),
    softDelete: options.soft ? { column: 'deletedAt', value: () => 'deleted' } : false,
  });
  return router.createCaller({
    db,
    hooks,
    pluginId: 'com.wordrhyme.shop',
    tx: options.tx,
  } as any) as unknown as Caller;
}

function expectScope(queries: ReturnType<typeof database>['queries'], ids: string[]) {
  for (const query of queries) {
    const sql = new PgDialect().sqlToQuery(query.where);
    expect(sql.sql).toContain('"items"."tenant" =');
    expect(sql.sql).toContain('"items"."key" in');
    expect(sql.params).toEqual(expect.arrayContaining([...ids, 'allowed']));
  }
}

describe('delete lifecycle', () => {
  it('emits full rows only for actual RETURNING hits, with custom ids and the scoped where', async () => {
    const { db, state, queries } = database(['one']);
    const emit = vi.fn().mockResolvedValue(undefined);
    const ids = ['one', 'denied', 'missing', 'one'];
    expect(await caller(db, { emit }).deleteMany(ids)).toEqual({ deleted: 1 });
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith(
      'shop.items.delete',
      {
        id: 'one',
        entityId: 'one',
        row: rows[0],
        existing: rows[0],
      },
      { dispatch: 'hook', mode: 'effect', tx: expect.objectContaining({ data: state }) },
    );
    expect(queries).toHaveLength(1);
    expect(queries[0]?.selection).toEqual([]);
    expectScope(queries, ids);
    expect(state.rows.map((row) => row.key)).toEqual(['two', 'denied']);
  });

  it.each([false, true])(
    'rolls back base and previous hook writes on failure (soft=%s)',
    async (soft) => {
      const { db, state } = database();
      const emit = vi.fn(async (_name, payload, { tx }) => {
        tx.data.effects.push(payload.id);
        if (payload.id === 'two') throw new Error('cleanup failed');
      });
      await expect(
        caller(db, { emit }, { soft }).deleteMany(['one', 'two']),
      ).rejects.toThrow('cleanup failed');
      expect(emit).toHaveBeenCalledTimes(2);
      expect(emit.mock.calls[0]?.[2].tx).toBe(emit.mock.calls[1]?.[2].tx);
      expect(state).toEqual({ rows, effects: [] });
    },
  );

  it('reuses an existing transaction for soft deletion and preserves before/after rows', async () => {
    const { db, queries } = database(['one']);
    const emit = vi.fn().mockResolvedValue(undefined);
    expect(
      await caller(db, { emit }, { soft: true, tx: db }).deleteMany(['one', 'missing']),
    ).toEqual({ deleted: 1 });
    expect(db.transaction).not.toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledExactlyOnceWith(
      'shop.items.delete',
      {
        id: 'one',
        entityId: 'one',
        existing: rows[0],
        row: { ...rows[0], deletedAt: 'deleted' },
      },
      { dispatch: 'hook', mode: 'effect', tx: db },
    );
    expectScope(queries, ['one', 'missing']);
  });

  it.each([false, true])(
    'keeps the id-only, nontransactional path without hooks (soft=%s)',
    async (soft) => {
      const { db, queries } = database(['one']);
      expect(await caller(db, undefined, { soft }).deleteMany(['one'])).toEqual({
        deleted: 1,
      });
      expect(db.transaction).not.toHaveBeenCalled();
      expect(db.select).not.toHaveBeenCalled();
      expect(queries[0]?.selection).toEqual([{ id: table.key }]);
    },
  );

  it('does not wrap or emit when the resource id is unconfigured', async () => {
    const { db } = database(['one']);
    const emit = vi.fn();
    expect(await caller(db, { emit }, { id: false }).deleteMany(['one'])).toEqual({
      deleted: 1,
    });
    expect(db.transaction).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it.each([{ ids: [] }, { ids: ['missing'] }])(
    'does not emit when no rows are returned for $ids',
    async ({ ids }) => {
      const { db } = database([]);
      const emit = vi.fn();
      expect(await caller(db, { emit }).deleteMany(ids)).toEqual({ deleted: 0 });
      expect(emit).not.toHaveBeenCalled();
    },
  );

  it.each([false, true])(
    'does not emit a phantom single delete after a concurrent miss (soft=%s)',
    async (soft) => {
      const { db, state } = database([]);
      const emit = vi.fn();
      await expect(caller(db, { emit }, { soft }).delete('one')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
      expect(emit).not.toHaveBeenCalled();
      expect(state.rows).toEqual(rows);
    },
  );
});
