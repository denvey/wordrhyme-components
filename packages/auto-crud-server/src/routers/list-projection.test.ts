import { describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { z } from 'zod';
import { baseListInputSchema, createCrudRouter } from './_factory';

const table = pgTable('projection_orders', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  organizationId: text('organization_id').notNull(),
  lineItems: jsonb('line_items').notNull(),
});
const lineItems = [{ sku: 'sku-1', quantity: 3, details: { raw: ['keep', 7] } }];
const row = { id: 'order-1', title: 'Order', organizationId: 'org-1', lineItems };
const schema = z.object({
  id: z.string(),
  title: z.string(),
  organizationId: z.string(),
  lineItems: z.array(z.record(z.string(), z.unknown())),
});
const projectionSchema = schema.pick({ id: true, lineItems: true }).strict();
const select = { id: table.id, lineItems: table.lineItems };
const inputSchema = baseListInputSchema.extend({
  fields: z.tuple([z.literal('id'), z.literal('lineItems')]).optional(),
  total: z.boolean().optional(),
});
const config = {
  id: 'example.orders',
  table,
  schema: schema.omit({ id: true }),
  selectSchema: schema,
  listSelectSchema: projectionSchema,
  listInputSchema: inputSchema,
};
type Caller = {
  list: (input: Record<string, unknown>) => Promise<any>;
  get: (id: string) => Promise<any>;
  export: (input: Record<string, unknown>) => Promise<any>;
};

const projectionInput = { fields: ['id', 'lineItems'], total: false };

function database(projected = lineItems, title: unknown = row.title) {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const db = drizzle(async (sql, params) => {
    queries.push({ sql, params });
    if (sql.includes('count(*)')) return { rows: [[1]] };
    if (sql.startsWith('select "id", "line_items"')) {
      return { rows: [[row.id, projected]] };
    }
    return { rows: [[row.id, title, row.organizationId, row.lineItems]] };
  });
  return { db, queries };
}

function extensions() {
  return {
    readProjection: vi.fn().mockResolvedValue({
      [row.id]: { owner: { type: 'ref', refId: 'user-1', display: 'Owner' } },
    }),
  };
}

function project({ input, operation }: { input: object; operation: string }) {
  return operation === 'list' && 'fields' in input && input.fields
    ? { select, enrich: false }
    : {};
}

describe('list SQL projections', () => {
  it('preserves full rows, extension values and metadata by default', async () => {
    const { db, queries } = database();
    const crudExtensions = extensions();
    const caller = createCrudRouter({ ...config, query: project }).createCaller({
      db,
      crudExtensions,
    } as any) as Caller;

    const result = await caller.list({});

    expect(result.data).toEqual([
      {
        ...row,
        owner: 'user-1',
        __crudExtensionProjection: { owner: { refId: 'user-1', display: 'Owner' } },
      },
    ]);
    expect(result.total).toBe(1);
    expect(queries[0]?.sql).toContain(
      'select "id", "title", "organization_id", "line_items"',
    );
    expect(crudExtensions.readProjection).toHaveBeenCalledOnce();
  });

  it('selects only two columns and preserves the complete JSON value without enrichment', async () => {
    const { db, queries } = database();
    const crudExtensions = extensions();
    const caller = createCrudRouter({ ...config, query: project }).createCaller({
      db,
      crudExtensions,
    } as any) as Caller;

    const result = await caller.list(projectionInput);

    expect(result.data).toEqual([{ id: row.id, lineItems }]);
    expect(Object.keys(result.data[0])).toEqual(['id', 'lineItems']);
    expect(result).toMatchObject({ page: 1, perPage: 10, pageCount: -1 });
    expect(result).not.toHaveProperty('total');
    expect(queries).toHaveLength(1);
    expect(queries[0]?.sql).toMatch(/^select "id", "line_items" from/);
    expect(crudExtensions.readProjection).not.toHaveBeenCalled();
  });

  it('keeps guard, scope, extra conditions, filters, ordering and pagination on the same db', async () => {
    const { db, queries } = database();
    const guard = vi.fn((_ctx: unknown, _operation: string) => true);
    const scope = vi.fn((_ctx: unknown, _table: unknown, _operation: string) =>
      eq(table.organizationId, 'org-1'),
    );
    const middleware = vi.fn(
      async ({ ctx, next }: { ctx: any; next: () => Promise<any> }) => {
        expect(ctx.db).toBe(db);
        return next();
      },
    );
    const caller = createCrudRouter({
      ...config,
      guard,
      scope,
      query: (params) => ({ ...project(params), where: eq(table.id, row.id) }),
      middleware: { list: middleware },
    }).createCaller({ db } as any) as Caller;

    await caller.list({
      ...projectionInput,
      page: 2,
      perPage: 1,
      sort: [{ id: 'title', desc: true }],
      filters: [
        {
          filterId: 'title-filter',
          id: 'title',
          value: 'Order',
          operator: 'eq',
          variant: 'text',
        },
      ],
    });

    expect(guard.mock.calls[0]?.[1]).toBe('list');
    expect(scope.mock.calls[0]?.[2]).toBe('list');
    expect(middleware).toHaveBeenCalledOnce();
    expect(queries).toHaveLength(1);
    expect(queries[0]?.sql).toContain('"projection_orders"."organization_id" =');
    expect(queries[0]?.sql).toContain('"projection_orders"."title" =');
    expect(queries[0]?.sql).toContain('"projection_orders"."id" =');
    expect(queries[0]?.sql).toContain('order by "projection_orders"."title" desc');
    expect(queries[0]?.sql).toContain('limit');
    expect(queries[0]?.sql).toContain('offset');
    expect(queries[0]?.params).toEqual(
      expect.arrayContaining(['org-1', 'Order', row.id, 1]),
    );
    expect(queries[0]?.params.slice(-2)).toEqual([1, 1]);
  });

  it('rejects denied projected reads before querying', async () => {
    const { db, queries } = database();
    const caller = createCrudRouter({
      ...config,
      guard: () => false,
      query: project,
    }).createCaller({ db } as any) as Caller;
    await expect(caller.list(projectionInput)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(queries).toHaveLength(0);
  });

  it.each([null, 'invalid', [42]])(
    'rejects invalid projected output %j',
    async (invalid) => {
      const { db } = database(invalid as never);
      const caller = createCrudRouter({ ...config, query: project }).createCaller({
        db,
      } as any) as Caller;
      await expect(caller.list(projectionInput)).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
      });
    },
  );

  it('rejects malformed full rows instead of falling back to the projection shape', async () => {
    const { db } = database(lineItems, 42);
    const caller = createCrudRouter({ ...config, query: project }).createCaller({
      db,
    } as any) as Caller;

    await expect(caller.list({})).rejects.toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
    });
  });

  it('requires an explicit projection output schema', async () => {
    const { db } = database();
    const caller = createCrudRouter({
      ...config,
      listSelectSchema: undefined,
      query: project,
    }).createCaller({ db } as any) as Caller;
    await expect(caller.list(projectionInput)).rejects.toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
    });
  });

  it('keeps get and export full output and enrichment even if query returns list-only options', async () => {
    const { db, queries } = database();
    const crudExtensions = extensions();
    const caller = createCrudRouter({
      ...config,
      query: () => ({ select, enrich: false }),
    }).createCaller({ db, crudExtensions } as any) as Caller;

    const item = await caller.get(row.id);
    const exported = await caller.export({});

    expect(item).toMatchObject({ ...row, owner: 'user-1' });
    expect(exported.data).toEqual([item]);
    expect(crudExtensions.readProjection).toHaveBeenCalledTimes(2);
    expect(
      queries
        .filter(({ sql }) => !sql.includes('count(*)'))
        .every(({ sql }) =>
          sql.startsWith('select "id", "title", "organization_id", "line_items"'),
        ),
    ).toBe(true);
  });
});
