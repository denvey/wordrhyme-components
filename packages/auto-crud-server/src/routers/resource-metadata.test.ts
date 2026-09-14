import type { CrudOperation, CrudResourceMetadata } from '../types/config';
import { initTRPC } from '@trpc/server';
import { pgTable, text } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createCrudRouter } from './_factory';

const t = initTRPC
  .meta<Partial<CrudResourceMetadata> & { permission?: string; billing?: string }>()
  .create();
const table = pgTable('records', {
  key: text('key').primaryKey(),
  title: text('title'),
}).enableRLS();
const schema = z.object({ title: z.string() });
const procedure = t.procedure.meta({ permission: 'records', billing: 'records' });

describe('server-side CRUD resource metadata', () => {
  it.each([
    ['single', procedure],
    [
      'map',
      {
        default: procedure,
        meta: t.procedure.meta({ permission: 'schema' }),
        update: t.procedure.meta({ permission: 'edit' }),
      },
    ],
    [
      'factory',
      (operation: CrudOperation) => t.procedure.meta({ permission: operation }),
    ],
  ] as const)('preserves table identity and operation for %s procedures', (_, config) => {
    const crud = createCrudRouter({ table, idField: 'key', schema, procedure: config });
    for (const [operation, route] of Object.entries(crud.procedures)) {
      const metadata = route._def.meta as CrudResourceMetadata;
      expect(metadata.__crudResource.table).toBe(table);
      expect(metadata.__crudResource.idField).toBe('key');
      expect(Object.isFrozen(metadata.__crudResource)).toBe(true);
      expect(metadata.__crudOperation).toBe(operation === 'meta' ? 'list' : operation);
    }
    expect(procedure._def.meta).toEqual({ permission: 'records', billing: 'records' });
  });

  it('preserves caller metadata and custom meta/read/write procedures', () => {
    const crud = createCrudRouter({
      table,
      idField: 'key',
      schema,
      procedure: {
        default: procedure,
        meta: t.procedure.meta({ permission: 'schema' }),
        list: t.procedure.meta({ permission: 'read' }),
        update: t.procedure.meta({ permission: 'edit' }),
      },
    });
    expect(crud.procedures.meta._def.meta.permission).toBe('schema');
    expect(crud.procedures.list._def.meta.permission).toBe('read');
    expect(crud.procedures.update._def.meta.permission).toBe('edit');
    expect(crud.procedures.upsert._def.meta).toMatchObject({
      permission: 'records',
      billing: 'records',
    });
  });

  it('uses actual bindings over reserved caller metadata and defaults the key to id', () => {
    const crud = createCrudRouter({
      table,
      schema,
      procedure: procedure.meta({
        __crudResource: {
          table: pgTable('wrong', { id: text('id') }).enableRLS(),
          idField: 'wrong',
        },
        __crudOperation: 'delete',
      }),
    });
    const router = t.router({ records: t.router({ ...crud.procedures }) });
    const routes = router._def.procedures as Record<string, typeof crud.procedures.list>;
    const { meta } = routes['records.list']._def;
    expect(meta.__crudResource.table).toBe(table);
    expect(meta.__crudResource.idField).toBe('id');
    expect(meta.__crudOperation).toBe('list');
    expect(meta.permission).toBe('records');
  });

  it('also supplies metadata with the default public procedure', () => {
    const crud = createCrudRouter({ table, schema });
    expect(crud.procedures.list._def.meta.__crudResource.table).toBe(table);
  });
});
