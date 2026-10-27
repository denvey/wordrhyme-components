import { describe, expect, it, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { sql, type SQL } from 'drizzle-orm';
import { pgTable, text } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { createCrudRouter } from './_factory';
import type { CrudExtensionMetadata } from '../types/config';

const records = pgTable('records', {
  id: text('id').primaryKey(),
  title: text('title'),
  reference: text('reference'),
  email: text('email'),
  phone: text('phone'),
});
const schema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  reference: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
});
type Caller = {
  meta(): Promise<{ capabilities: { search: { enabled: boolean; fields: string[] } } }>;
  list(input: { search?: string }): Promise<unknown>;
  export(input: { search?: string }): Promise<unknown>;
  counts(input: { queries: Array<{ key: string; search: string }> }): Promise<unknown>;
};

function fixture(metadata: CrudExtensionMetadata = {}, disabled = false) {
  const execute = vi.fn(async (query: string, _params: unknown[]) => ({
    rows: query.includes('count(') ? [[0]] : [],
  }));
  const raw = drizzle(execute);
  const db = Object.assign(raw, {
    $counts: async (table: typeof records, conditions: Record<string, unknown>) => {
      const entries = Object.entries(conditions);
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
  const getMetadata = vi.fn(async () => metadata);
  const buildConditions = vi.fn(
    async (): Promise<{ search?: SQL }> => ({ search: sql`false` }),
  );
  const router = createCrudRouter({
    id: 'com.example.records',
    table: records,
    schema,
    selectSchema: schema,
    counts: true,
    search: disabled ? false : ['title', 'reference', 'email', 'phone'],
  });
  const context = {
    db,
    crudExtensions: { getMetadata, buildConditions },
  };
  const caller = router.createCaller(context) as unknown as Caller;
  return { caller, router, db, execute, getMetadata, buildConditions };
}

describe('trusted field search overrides', () => {
  it.each(['list', 'export', 'counts'] as const)(
    'excludes disabled base fields from %s predicates',
    async (operation) => {
      const f = fixture({
        fields: {
          reference: { search: false },
          email: { search: false },
          phone: { search: false },
        },
      });
      if (operation === 'counts') {
        await f.caller.counts({ queries: [{ key: 'all', search: ' 2244 ' }] });
      } else {
        await f.caller[operation]({ search: ' 2244 ' });
      }
      for (const [query, params] of f.execute.mock.calls) {
        expect(query).toContain('"title" ilike');
        for (const field of ['reference', 'email', 'phone']) {
          expect(query).not.toContain(`"${field}" ilike`);
        }
        expect(params).toContain('%2244%');
      }
      expect(f.execute).toHaveBeenCalled();
      expect((await f.caller.meta()).capabilities.search).toEqual({
        enabled: true,
        fields: ['title'],
      });
    },
  );

  it('preserves base search when no override exists and does not expand the whitelist', async () => {
    const f = fixture({ fields: { id: { search: true } } });
    await f.caller.list({ search: '2244' });
    const query = f.execute.mock.calls[0]![0];
    for (const field of ['title', 'reference', 'email', 'phone']) {
      expect(query).toContain(`"${field}" ilike`);
    }
    expect(query).not.toContain('"id" ilike');
    expect((await f.caller.meta()).capabilities.search.fields).toEqual([
      'title',
      'reference',
      'email',
      'phone',
    ]);
  });

  it.each(['list', 'export', 'counts'] as const)(
    'fails closed in %s when every field is disabled',
    async (operation) => {
      const f = fixture({
        fields: Object.fromEntries(
          ['title', 'reference', 'email', 'phone'].map((id) => [id, { search: false }]),
        ),
      });
      f.buildConditions.mockResolvedValueOnce({});
      const request =
        operation === 'counts'
          ? f.caller.counts({ queries: [{ key: 'all', search: '2244' }] })
          : f.caller[operation]({ search: '2244' });
      await expect(request).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
      expect(f.execute).not.toHaveBeenCalled();
      expect((await f.caller.meta()).capabilities.search).toEqual({
        enabled: false,
        fields: [],
      });
    },
  );

  it('preserves extension-only search without enumerated capability fields', async () => {
    const f = fixture({
      fields: Object.fromEntries(
        ['title', 'reference', 'email', 'phone'].map((id) => [id, { search: false }]),
      ),
      capabilities: {
        search: { enabled: true, fields: [] },
        filters: { enabled: false, fields: [] },
        sort: { enabled: false, fields: [] },
      },
    });
    f.buildConditions.mockResolvedValue({
      search: sql`exists (select 1 where ${'extension'} = ${'2244'})`,
    });
    await f.caller.list({ search: '2244' });
    expect(f.execute.mock.calls[0]![0]).toContain('exists');
    expect((await f.caller.meta()).capabilities.search).toEqual({
      enabled: true,
      fields: [],
    });
  });

  it('keeps the router-wide search disable above provider capabilities', async () => {
    const f = fixture(
      {
        capabilities: {
          search: { enabled: true, fields: ['reference'] },
          filters: { enabled: false, fields: [] },
          sort: { enabled: false, fields: [] },
        },
      },
      true,
    );
    expect((await f.caller.meta()).capabilities.search).toEqual({
      enabled: false,
      fields: [],
    });
  });

  it('does not load metadata for requests without a search term', async () => {
    const f = fixture();
    await f.caller.list({});
    await f.caller.export({});
    expect(f.getMetadata).not.toHaveBeenCalled();
  });

  it('preserves compatibility with providers without getMetadata', async () => {
    const f = fixture();
    const context = {
      db: f.db,
      crudExtensions: { buildConditions: f.buildConditions },
    };
    const caller = f.router.createCaller(context) as unknown as Caller;
    await caller.list({ search: '2244' });
    expect(f.execute.mock.calls[0]![0]).toContain('"email" ilike');
    expect(f.getMetadata).not.toHaveBeenCalled();
  });
});
