import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import {
  baseExportInputSchema,
  baseGetInputSchema,
  baseListInputSchema,
  createCrudRouter,
} from './_factory';
import type { CrudRouterConfig } from '../types/config';

// ============================================================
// Mock 数据和 Schema
// ============================================================

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['todo', 'done']),
  createdAt: z.date().optional(),
});

const insertTaskSchema = taskSchema.omit({ id: true, createdAt: true }).extend({
  id: z.string().optional(),
});

const updateTaskSchema = taskSchema.partial().omit({ id: true, createdAt: true });

type Task = z.infer<typeof taskSchema>;
type ListCaller = {
  list: (input: Record<string, unknown>) => Promise<any>;
};
type CrudCaller = {
  export: (input: Record<string, unknown>) => Promise<any>;
  get: (input: string | Record<string, unknown>) => Promise<any>;
  list: (input: Record<string, unknown>) => Promise<any>;
};
type MutationCaller = {
  create: (input: Record<string, unknown>) => Promise<any>;
  createMany: (input: Array<Record<string, unknown>>) => Promise<any>;
  import: (input: {
    rows: Array<Record<string, unknown>>;
    onConflict: string;
  }) => Promise<any>;
  upsert: (input: Record<string, unknown>) => Promise<any>;
  update: (input: { id: string; data: Record<string, unknown> }) => Promise<any>;
  updateMany: (input: { ids: string[]; data: Record<string, unknown> }) => Promise<any>;
};
type MetadataCaller = {
  meta: () => Promise<any>;
};

// Mock 数据库
function createMockDb() {
  const data: Task[] = [
    { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
    { id: '2', title: 'Task 2', status: 'done', createdAt: new Date() },
  ];

  return {
    data,
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() => ({
      then: (resolve: (value: Task[]) => void) => resolve([data[0]!]),
    })),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi
      .fn()
      .mockImplementation(() => [{ id: 'new-id', title: 'New Task', status: 'todo' }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    $dynamic: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  };
}

function createListMockDb(rows: Task[]) {
  const builders: any[] = [];

  const createSelectBuilder = (getRows: () => unknown[]) => {
    let limitValue: number | undefined;
    let offsetValue = 0;

    const builder = {
      from: vi.fn(() => builder),
      where: vi.fn(() => builder),
      $dynamic: vi.fn(() => builder),
      orderBy: vi.fn(() => builder),
      limit: vi.fn((value: number) => {
        limitValue = value;
        return builder;
      }),
      offset: vi.fn((value: number) => {
        offsetValue = value;
        return builder;
      }),
      then: (resolve: (value: unknown[]) => void, reject: (reason: unknown) => void) => {
        const result = getRows();
        const paged =
          limitValue === undefined
            ? result
            : result.slice(offsetValue, offsetValue + limitValue);
        return Promise.resolve(paged).then(resolve, reject);
      },
    };

    builders.push(builder);
    return builder;
  };

  return {
    builders,
    select: vi.fn((selection?: Record<string, unknown>) => {
      if (selection && 'count' in selection) {
        return createSelectBuilder(() => [{ count: rows.length }]);
      }
      return createSelectBuilder(() => rows);
    }),
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}

function createDeferredListMockDb(rows: Task[]) {
  const data = createDeferred<Task[]>();
  const count = createDeferred<Array<{ count: number }>>();
  const started: string[] = [];

  const createSelectBuilder = (
    kind: 'data' | 'count',
    result: Promise<Task[] | Array<{ count: number }>>,
  ) => {
    const builder = {
      from: vi.fn(() => builder),
      where: vi.fn(() => builder),
      $dynamic: vi.fn(() => builder),
      orderBy: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      offset: vi.fn(() => builder),
      then: (
        onFulfilled: (value: Task[] | Array<{ count: number }>) => unknown,
        onRejected: (reason: unknown) => unknown,
      ) => {
        started.push(kind);
        return result.then(onFulfilled, onRejected);
      },
    };

    return builder;
  };

  return {
    count,
    data,
    started,
    select: vi.fn((selection?: Record<string, unknown>) =>
      selection && 'count' in selection
        ? createSelectBuilder('count', count.promise)
        : createSelectBuilder('data', data.promise),
    ),
    rows,
  };
}

function createBatchWriteMockDb(rows: Task[]) {
  const tx = {
    insert: vi.fn(() => tx),
    values: vi.fn(() => tx),
    onConflictDoNothing: vi.fn(() => tx),
    returning: vi.fn(() => rows),
  };
  const db = {
    transaction: vi.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  };

  return { db, tx };
}

function collectSqlText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(collectSqlText).join('');
  if (typeof value !== 'object') return '';

  const object = value as { value?: unknown; queryChunks?: unknown };

  if (Array.isArray(object.value)) {
    return collectSqlText(object.value);
  }

  if (Array.isArray(object.queryChunks)) {
    return collectSqlText(object.queryChunks);
  }

  return '';
}

// Mock table
const mockTable = {
  id: { dataType: 'string', name: 'id' },
  title: { dataType: 'string', name: 'title' },
  status: { dataType: 'string', name: 'status' },
  deletedAt: { dataType: 'date', name: 'deletedAt' },
} as any;

// Mock procedure
const mockProcedure = {
  input: vi.fn().mockReturnThis(),
  output: vi.fn().mockReturnThis(),
  query: vi.fn().mockReturnThis(),
  mutation: vi.fn().mockReturnThis(),
};

const mockProcedureWithMeta = {
  ...mockProcedure,
  meta: vi.fn().mockReturnThis(),
};

function createProcedureMock() {
  return {
    input: vi.fn().mockReturnThis(),
    output: vi.fn().mockReturnThis(),
    query: vi.fn().mockReturnThis(),
    mutation: vi.fn().mockReturnThis(),
  };
}

// ============================================================
// 测试套件
// ============================================================

describe('createCrudRouter', () => {
  describe('基础配置', () => {
    it('should create router with all 8 CRUD procedures', () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
      };

      const router = createCrudRouter(config);

      // 验证返回的 router 有 procedures 属性
      expect(router).toHaveProperty('procedures');
      expect(router.procedures).toHaveProperty('list');
      expect(router.procedures).toHaveProperty('get');
      expect(router.procedures).toHaveProperty('create');
      expect(router.procedures).toHaveProperty('update');
      expect(router.procedures).toHaveProperty('delete');
      expect(router.procedures).toHaveProperty('deleteMany');
      expect(router.procedures).toHaveProperty('updateMany');
      expect(router.procedures).toHaveProperty('upsert');
    });

    it("should use default idField as 'id'", () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
      };

      // 不应抛出错误
      expect(() => createCrudRouter(config)).not.toThrow();
    });

    it('should accept custom idField', () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        idField: 'customId',
      };

      expect(() => createCrudRouter(config)).not.toThrow();
    });

    it('should omit default managed audit fields and custom omitFields from derived schemas', () => {
      const auditTable = pgTable('audit_items', {
        id: text('id').primaryKey(),
        title: text('title').notNull(),
        organizationId: text('organization_id'),
        createdAt: timestamp('created_at'),
        updatedAt: timestamp('updated_at'),
        createdBy: text('created_by'),
        createdByType: text('created_by_type'),
        updatedBy: text('updated_by'),
        updatedByType: text('updated_by_type'),
      });
      const createProcedure = createProcedureMock();
      const updateProcedure = createProcedureMock();

      createCrudRouter({
        table: auditTable,
        omitFields: ['organizationId'],
        procedure: {
          create: createProcedure as any,
          update: updateProcedure as any,
          default: createProcedureMock() as any,
        },
      });

      const createSchema = createProcedure.input.mock.calls[0]?.[0] as
        | z.ZodObject<z.ZodRawShape>
        | undefined;
      expect(createSchema?.shape).toHaveProperty('title');
      expect(createSchema?.shape).not.toHaveProperty('id');
      expect(createSchema?.shape).not.toHaveProperty('organizationId');
      expect(createSchema?.shape).not.toHaveProperty('createdAt');
      expect(createSchema?.shape).not.toHaveProperty('updatedAt');
      expect(createSchema?.shape).not.toHaveProperty('createdBy');
      expect(createSchema?.shape).not.toHaveProperty('createdByType');
      expect(createSchema?.shape).not.toHaveProperty('updatedBy');
      expect(createSchema?.shape).not.toHaveProperty('updatedByType');

      const updateInputSchema = updateProcedure.input.mock.calls[0]?.[0] as
        | z.ZodObject<z.ZodRawShape>
        | undefined;
      const updateDataSchema = updateInputSchema?.shape.data as
        | (z.ZodObject<z.ZodRawShape> & { shape: z.ZodRawShape })
        | undefined;
      expect(updateDataSchema?.shape).toHaveProperty('title');
      expect(updateDataSchema?.shape).not.toHaveProperty('createdBy');
      expect(updateDataSchema?.shape).not.toHaveProperty('createdByType');
      expect(updateDataSchema?.shape).not.toHaveProperty('updatedBy');
      expect(updateDataSchema?.shape).not.toHaveProperty('updatedByType');
    });

    it('should ignore default omit fields that are not present in derived schemas', () => {
      const minimalTable = pgTable('minimal_items', {
        id: text('id').primaryKey(),
        title: text('title').notNull(),
      });

      expect(() =>
        createCrudRouter({
          table: minimalTable,
          procedure: {
            default: createProcedureMock() as any,
          },
        }),
      ).not.toThrow();
    });

    it('should preserve optional id in auto-derived upsert schemas', () => {
      const upsertProcedure = createProcedureMock();
      const auditTable = pgTable('upsert_items', {
        id: text('id').primaryKey(),
        title: text('title').notNull(),
        createdAt: timestamp('created_at'),
      });

      createCrudRouter({
        table: auditTable,
        procedure: {
          upsert: upsertProcedure as any,
          default: createProcedureMock() as any,
        },
      });

      const upsertSchema = upsertProcedure.input.mock.calls[0]?.[0] as
        | z.ZodObject<z.ZodRawShape>
        | undefined;
      expect(upsertSchema?.shape).toHaveProperty('id');
      expect(upsertSchema?.shape).toHaveProperty('title');
      expect(upsertSchema?.shape).not.toHaveProperty('createdAt');
      expect(() => upsertSchema?.parse({ title: 'New item' })).not.toThrow();
      expect(() =>
        upsertSchema?.parse({ id: 'existing-id', title: 'Existing item' }),
      ).not.toThrow();
    });
  });

  describe('统一 procedure 配置（v2.0）', () => {
    it('should work without procedure config (default)', () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
      };

      const router = createCrudRouter(config);
      expect(router.procedures).toBeDefined();
    });

    it('should work with single procedure', () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        procedure: mockProcedure as any,
      };

      const router = createCrudRouter(config);
      expect(router.procedures).toBeDefined();
    });

    it('should treat a procedure builder with meta() as a single procedure', () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        procedure: mockProcedureWithMeta as any,
      };

      expect(() => createCrudRouter(config)).not.toThrow();
      expect(mockProcedureWithMeta.output).toHaveBeenCalled();
    });

    it('should work with procedure map', () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        procedure: {
          list: mockProcedure as any,
          get: mockProcedure as any,
          create: mockProcedure as any,
          default: mockProcedure as any,
        },
      };

      const router = createCrudRouter(config);
      expect(router.procedures).toBeDefined();
    });

    it('should work with procedure factory', () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        procedure: (op: string) => mockProcedure as any,
      };

      const router = createCrudRouter(config);
      expect(router.procedures).toBeDefined();
    });

    it('should combine procedure with guard/scope/authorize', () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        procedure: {
          list: mockProcedure as any,
          default: mockProcedure as any,
        },
        guard: (ctx, op) => true,
        scope: (ctx, table, op) => undefined,
        authorize: (ctx, resource, op) => true,
      };

      const router = createCrudRouter(config);
      expect(router.procedures).toBeDefined();
    });
  });

  describe('软删除配置', () => {
    it('should accept softDelete: true', () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        softDelete: true,
      };

      expect(() => createCrudRouter(config)).not.toThrow();
    });

    it('should accept softDelete as string (column name)', () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        softDelete: 'deletedAt',
      };

      expect(() => createCrudRouter(config)).not.toThrow();
    });

    it('should accept softDelete as full config', () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        softDelete: {
          column: 'isDeleted',
          value: () => true,
        },
      };

      expect(() => createCrudRouter(config)).not.toThrow();
    });
  });

  describe('Middleware 配置', () => {
    it('should accept middleware config', () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        middleware: {
          create: async ({ ctx, input, next }) => next(input),
        },
      };

      expect(() => createCrudRouter(config)).not.toThrow();
    });

    it('should accept all middleware hooks', () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        middleware: {
          list: async ({ next }) => next(),
          get: async ({ next }) => next(),
          create: async ({ next }) => next(),
          update: async ({ next }) => next(),
          delete: async ({ next }) => next(),
          deleteMany: async ({ next }) => next(),
          updateMany: async ({ next }) => next(),
          upsert: async ({ next }) => next(),
        },
      };

      expect(() => createCrudRouter(config)).not.toThrow();
    });
  });

  describe('可扩展 list 输入', () => {
    it('should keep default list input behavior without custom listInputSchema', async () => {
      const db = createListMockDb([
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
        { id: '2', title: 'Task 2', status: 'done', createdAt: new Date() },
      ]);
      const crudRouter = createCrudRouter({
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
      });

      const caller = crudRouter.createCaller({ db } as any) as ListCaller;
      const result = await caller.list({ page: 1, perPage: 1 });

      expect(result).toMatchObject({
        total: 2,
        page: 1,
        perPage: 1,
        pageCount: 2,
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.id).toBe('1');
    });

    it('should start list data and count queries concurrently', async () => {
      const rows: Task[] = [
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
      ];
      const db = createDeferredListMockDb(rows);
      const crudRouter = createCrudRouter({
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
      });

      const caller = crudRouter.createCaller({ db } as any) as ListCaller;
      const resultPromise = caller.list({ page: 1, perPage: 10 });

      await vi.waitFor(() => {
        expect(db.started).toEqual(expect.arrayContaining(['data', 'count']));
      });
      db.count.resolve([{ count: 1 }]);
      db.data.resolve(rows);

      await expect(resultPromise).resolves.toMatchObject({
        data: rows,
        total: 1,
        pageCount: 1,
      });
    });

    it('should pass extended list input into list middleware', async () => {
      const db = createListMockDb([
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
      ]);
      const productListInputSchema = baseListInputSchema.extend({
        include: z
          .object({
            skus: z.boolean().optional(),
          })
          .optional(),
      });
      type ProductListInput = z.infer<typeof productListInputSchema>;
      let middlewareInput: ProductListInput | undefined;

      const crudRouter = createCrudRouter<
        typeof mockTable,
        { db: any },
        Task,
        z.infer<typeof insertTaskSchema>,
        z.infer<typeof updateTaskSchema>,
        ProductListInput
      >({
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
        listInputSchema: productListInputSchema,
        middleware: {
          list: async ({ input, next }) => {
            middlewareInput = input;
            return next(input);
          },
        },
      });

      const caller = crudRouter.createCaller({ db } as any) as ListCaller;
      await caller.list({ page: 1, perPage: 10, include: { skus: true } });

      expect(middlewareInput?.include?.skus).toBe(true);
    });

    it('should let next(input) reuse default pagination and count logic', async () => {
      const db = createListMockDb([
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
        { id: '2', title: 'Task 2', status: 'done', createdAt: new Date() },
        { id: '3', title: 'Task 3', status: 'todo', createdAt: new Date() },
      ]);
      const productListInputSchema = baseListInputSchema.extend({
        include: z.object({ skus: z.boolean().optional() }).optional(),
      });

      const crudRouter = createCrudRouter({
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
        listInputSchema: productListInputSchema,
        middleware: {
          list: async ({ input, next }) => {
            if (input.include?.skus) {
              return next(input);
            }
            return next(input);
          },
        },
      });

      const caller = crudRouter.createCaller({ db } as any) as ListCaller;
      const result = await caller.list({
        page: 2,
        perPage: 1,
        include: { skus: true },
      });

      expect(result).toMatchObject({
        total: 3,
        page: 2,
        perPage: 1,
        pageCount: 3,
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.id).toBe('2');
    });

    it('should ignore extended fields in the default list query', async () => {
      const rows: Task[] = [
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
        { id: '2', title: 'Task 2', status: 'done', createdAt: new Date() },
      ];
      const productListInputSchema = baseListInputSchema.extend({
        include: z.object({ skus: z.boolean().optional() }).optional(),
      });
      const createRouter = () =>
        createCrudRouter({
          table: mockTable,
          schema: insertTaskSchema,
          updateSchema: updateTaskSchema,
          selectSchema: taskSchema,
          listInputSchema: productListInputSchema,
        });

      const withIncludeCaller = createRouter().createCaller({
        db: createListMockDb(rows),
      } as any) as ListCaller;
      const withoutIncludeCaller = createRouter().createCaller({
        db: createListMockDb(rows),
      } as any) as ListCaller;

      const withInclude = await withIncludeCaller.list({
        page: 1,
        perPage: 2,
        include: { skus: true },
      });
      const withoutInclude = await withoutIncludeCaller.list({
        page: 1,
        perPage: 2,
      });

      expect(withInclude).toEqual(withoutInclude);
    });
  });

  describe('可扩展 get 输入', () => {
    it('should keep string id get input behavior without custom getInputSchema', async () => {
      const db = createListMockDb([
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
      ]);
      const crudRouter = createCrudRouter({
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
      });

      const caller = crudRouter.createCaller({ db } as any) as CrudCaller;
      const result = await caller.get('1');

      expect(result).toMatchObject({ id: '1', title: 'Task 1' });
    });

    it('should pass extended get input into get middleware', async () => {
      const db = createListMockDb([
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
      ]);
      const productGetInputSchema = baseGetInputSchema.extend({
        include: z.object({ skus: z.boolean().optional() }).optional(),
      });
      type ProductGetInput = string | z.infer<typeof productGetInputSchema>;
      let middlewareInput: ProductGetInput | undefined;

      const crudRouter = createCrudRouter<
        typeof mockTable,
        { db: any },
        Task,
        z.infer<typeof insertTaskSchema>,
        z.infer<typeof updateTaskSchema>,
        z.infer<typeof baseListInputSchema>,
        ProductGetInput
      >({
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
        getInputSchema: productGetInputSchema,
        middleware: {
          get: async ({ id, input, next }) => {
            expect(id).toBe('1');
            middlewareInput = input;
            return next(input);
          },
        },
      });

      const caller = crudRouter.createCaller({ db } as any) as CrudCaller;
      const stringResult = await caller.get('1');
      const result = await caller.get({ id: '1', include: { skus: true } });

      expect(stringResult).toMatchObject({ id: '1' });
      expect(result).toMatchObject({ id: '1' });
      expect(
        typeof middlewareInput === 'string' ? undefined : middlewareInput?.include?.skus,
      ).toBe(true);
    });
  });

  describe('可扩展 export 输入', () => {
    it('should keep default export input behavior without custom exportInputSchema', async () => {
      const db = createListMockDb([
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
        { id: '2', title: 'Task 2', status: 'done', createdAt: new Date() },
      ]);
      const crudRouter = createCrudRouter({
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
      });

      const caller = crudRouter.createCaller({ db } as any) as CrudCaller;
      const result = await caller.export({ limit: 1 });

      expect(result).toMatchObject({
        total: 2,
        hasMore: true,
      });
      expect(result.data).toHaveLength(1);
    });

    it('should start export data and count queries concurrently', async () => {
      const rows: Task[] = [
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
      ];
      const db = createDeferredListMockDb(rows);
      const crudRouter = createCrudRouter({
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
      });

      const caller = crudRouter.createCaller({ db } as any) as CrudCaller;
      const resultPromise = caller.export({ limit: 1 });

      await vi.waitFor(() => {
        expect(db.started).toEqual(expect.arrayContaining(['data', 'count']));
      });
      db.data.resolve(rows);
      db.count.resolve([{ count: 2 }]);

      await expect(resultPromise).resolves.toMatchObject({
        data: rows,
        total: 2,
        hasMore: true,
      });
    });

    it('should pass extended export input into export middleware', async () => {
      const db = createListMockDb([
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
      ]);
      const productExportInputSchema = baseExportInputSchema.extend({
        format: z.enum(['csv', 'xlsx']).optional(),
      });
      type ProductExportInput = z.infer<typeof productExportInputSchema>;
      let middlewareInput: ProductExportInput | undefined;

      const crudRouter = createCrudRouter<
        typeof mockTable,
        { db: any },
        Task,
        z.infer<typeof insertTaskSchema>,
        z.infer<typeof updateTaskSchema>,
        z.infer<typeof baseListInputSchema>,
        string,
        ProductExportInput
      >({
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
        exportInputSchema: productExportInputSchema,
        middleware: {
          export: async ({ input, next }) => {
            middlewareInput = input;
            return next(input);
          },
        },
      });

      const caller = crudRouter.createCaller({ db } as any) as CrudCaller;
      const result = await caller.export({ limit: 10, format: 'xlsx' });

      expect(result).toMatchObject({ total: 1, hasMore: false });
      expect(middlewareInput?.format).toBe('xlsx');
    });

    it('should ignore extended fields in the default export query', async () => {
      const rows: Task[] = [
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
        { id: '2', title: 'Task 2', status: 'done', createdAt: new Date() },
      ];
      const productExportInputSchema = baseExportInputSchema.extend({
        format: z.enum(['csv', 'xlsx']).optional(),
      });
      const createRouter = () =>
        createCrudRouter({
          table: mockTable,
          schema: insertTaskSchema,
          updateSchema: updateTaskSchema,
          selectSchema: taskSchema,
          exportInputSchema: productExportInputSchema,
        });

      const withFormatCaller = createRouter().createCaller({
        db: createListMockDb(rows),
      } as any) as CrudCaller;
      const withoutFormatCaller = createRouter().createCaller({
        db: createListMockDb(rows),
      } as any) as CrudCaller;

      const withFormat = await withFormatCaller.export({
        limit: 1,
        format: 'csv',
      });
      const withoutFormat = await withoutFormatCaller.export({ limit: 1 });

      expect(withFormat).toEqual(withoutFormat);
    });
  });

  describe('批量操作配置', () => {
    it('should accept maxBatchSize config', () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        maxBatchSize: 50,
      };

      expect(() => createCrudRouter(config)).not.toThrow();
    });

    it('should use default maxBatchSize of 100', () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
      };

      // 默认值 100，不应报错
      expect(() => createCrudRouter(config)).not.toThrow();
    });
  });

  describe('列白名单配置', () => {
    it('should accept filterableColumns config', () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        filterableColumns: ['title', 'status'],
      };

      expect(() => createCrudRouter(config)).not.toThrow();
    });

    it('should accept sortableColumns config', () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        sortableColumns: ['title', 'createdAt'],
      };

      expect(() => createCrudRouter(config)).not.toThrow();
    });

    it('should expose default query capabilities through metadata', async () => {
      const crudRouter = createCrudRouter({
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
      });

      const caller = crudRouter.createCaller({
        db: createMockDb(),
      } as any) as MetadataCaller;
      const result = await caller.meta();

      expect(result.capabilities).toEqual({
        search: { enabled: false, fields: [] },
        filters: { enabled: true, fields: null },
        sort: { enabled: true, fields: null },
      });
    });

    it('should apply global search through search config and expose metadata', async () => {
      const db = createListMockDb([
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
      ]);
      const crudRouter = createCrudRouter({
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
        search: ['title'],
      });

      const caller = crudRouter.createCaller({ db } as any) as ListCaller &
        MetadataCaller;
      await caller.list({
        page: 1,
        perPage: 10,
        search: 'Task',
        joinOperator: 'and',
      });
      const meta = await caller.meta();

      const whereArg = db.builders[0]?.where.mock.calls[0]?.[0];
      const sqlText = collectSqlText(whereArg);

      expect(db.builders[0]?.where).toHaveBeenCalledTimes(1);
      expect(sqlText).toContain('ilike');
      expect(sqlText).not.toContain('::text');
      expect(meta.capabilities.search).toEqual({
        enabled: true,
        fields: ['title'],
      });
    });

    it('should merge provider query capabilities into metadata', async () => {
      const getMetadata = vi.fn().mockResolvedValue({
        capabilities: {
          search: { enabled: true, fields: ['owner'] },
          filters: { enabled: true, fields: ['owner'] },
          sort: { enabled: true, fields: ['owner'] },
        },
      });
      const crudRouter = createCrudRouter({
        id: 'com.example.tasks',
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
        search: ['title'],
        filters: ['status'],
        sort: ['createdAt'],
      });

      const caller = crudRouter.createCaller({
        db: createMockDb(),
        crudExtensions: {
          getMetadata,
        },
      } as any) as MetadataCaller;
      const meta = await caller.meta();

      expect(meta.capabilities).toEqual({
        search: { enabled: true, fields: ['title', 'owner'] },
        filters: { enabled: true, fields: ['status', 'owner'] },
        sort: { enabled: true, fields: ['createdAt', 'owner'] },
      });
    });

    it('should restrict filters and sort through new capability config', async () => {
      const db = createListMockDb([
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
      ]);
      const crudRouter = createCrudRouter({
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
        filters: ['status'],
        sort: ['title'],
      });

      const caller = crudRouter.createCaller({ db } as any) as ListCaller &
        MetadataCaller;
      await caller.list({
        page: 1,
        perPage: 10,
        filters: [
          {
            id: 'title',
            value: 'Task',
            operator: 'iLike',
            variant: 'text',
            filterId: 'title',
          },
        ],
        sort: [{ id: 'status', desc: false }],
        joinOperator: 'and',
      });
      const meta = await caller.meta();

      expect(db.builders[0]?.where).not.toHaveBeenCalled();
      expect(db.builders[1]?.where).not.toHaveBeenCalled();
      expect(db.builders[0]?.orderBy).not.toHaveBeenCalled();
      expect(meta.capabilities.filters).toEqual({
        enabled: true,
        fields: ['status'],
      });
      expect(meta.capabilities.sort).toEqual({
        enabled: true,
        fields: ['title'],
      });
    });

    it('should disable search filters and sort explicitly', async () => {
      const db = createListMockDb([
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
      ]);
      const crudRouter = createCrudRouter({
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
        search: false,
        filters: false,
        sort: false,
      });

      const caller = crudRouter.createCaller({ db } as any) as ListCaller &
        MetadataCaller;
      await caller.list({
        page: 1,
        perPage: 10,
        search: 'Task',
        filters: [
          {
            id: 'status',
            value: 'todo',
            operator: 'eq',
            variant: 'select',
            filterId: 'status',
          },
        ],
        sort: [{ id: 'title', desc: false }],
        joinOperator: 'and',
      });
      const meta = await caller.meta();

      expect(db.builders[0]?.where).not.toHaveBeenCalled();
      expect(db.builders[1]?.where).not.toHaveBeenCalled();
      expect(db.builders[0]?.orderBy).not.toHaveBeenCalled();
      expect(meta.capabilities).toEqual({
        search: { enabled: false, fields: [] },
        filters: { enabled: false, fields: [] },
        sort: { enabled: false, fields: [] },
      });
    });

    it('should not let provider query handlers bypass explicit disable config', async () => {
      const db = createListMockDb([
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
      ]);
      const getMetadata = vi.fn().mockResolvedValue({
        capabilities: {
          search: { enabled: true, fields: ['owner'] },
          filters: { enabled: true, fields: ['owner'] },
          sort: { enabled: true, fields: ['owner'] },
        },
      });
      const searchEntityIds = vi.fn().mockResolvedValue(['1']);
      const matchEntityIds = vi.fn().mockResolvedValue(['1']);
      const crudRouter = createCrudRouter({
        id: 'com.example.tasks',
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
        search: false,
        filters: false,
        sort: false,
      });

      const caller = crudRouter.createCaller({
        db,
        crudExtensions: {
          getMetadata,
          matchEntityIds,
          searchEntityIds,
        },
      } as any) as ListCaller & MetadataCaller;
      await caller.list({
        page: 1,
        perPage: 10,
        search: 'Owner',
        filters: [
          {
            id: 'owner',
            value: 'user-1',
            operator: 'eq',
            variant: 'text',
            filterId: 'owner',
          },
        ],
        sort: [{ id: 'owner', desc: false }],
        joinOperator: 'and',
      });
      const meta = await caller.meta();

      expect(searchEntityIds).not.toHaveBeenCalled();
      expect(matchEntityIds).not.toHaveBeenCalled();
      expect(db.builders[0]?.where).not.toHaveBeenCalled();
      expect(db.builders[1]?.where).not.toHaveBeenCalled();
      expect(db.builders[0]?.orderBy).not.toHaveBeenCalled();
      expect(meta.capabilities).toEqual({
        search: { enabled: false, fields: [] },
        filters: { enabled: false, fields: [] },
        sort: { enabled: false, fields: [] },
      });
    });

    it('should reject conflicting new and legacy query capability config', () => {
      expect(() =>
        createCrudRouter({
          table: mockTable,
          schema: insertTaskSchema,
          updateSchema: updateTaskSchema,
          search: ['title'],
          searchColumns: ['title'],
        }),
      ).toThrow('"search" and "searchColumns"');

      expect(() =>
        createCrudRouter({
          table: mockTable,
          schema: insertTaskSchema,
          updateSchema: updateTaskSchema,
          filters: ['status'],
          filterableColumns: ['status'],
        }),
      ).toThrow('"filters" and "filterableColumns"');

      expect(() =>
        createCrudRouter({
          table: mockTable,
          schema: insertTaskSchema,
          updateSchema: updateTaskSchema,
          sort: ['title'],
          sortableColumns: ['title'],
        }),
      ).toThrow('"sort" and "sortableColumns"');
    });

    it('should apply ordinary text filters through the table column', async () => {
      const db = createListMockDb([
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
      ]);
      const crudRouter = createCrudRouter({
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
        filterableColumns: ['title'],
      });

      const caller = crudRouter.createCaller({ db } as any) as ListCaller;
      await caller.list({
        page: 1,
        perPage: 10,
        filters: [
          {
            id: 'title',
            value: 'Task',
            operator: 'iLike',
            variant: 'text',
            filterId: 'title',
          },
        ],
        joinOperator: 'and',
      });

      const whereArg = db.builders[0]?.where.mock.calls[0]?.[0];
      const sqlText = collectSqlText(whereArg);

      expect(db.builders[0]?.where).toHaveBeenCalledTimes(1);
      expect(sqlText).toContain('ilike');
      expect(sqlText).not.toContain('jsonb_typeof');
    });

    it('should apply jsonField filters as a jsonb text expression', async () => {
      const db = createListMockDb([
        { id: '1', title: '任务 1', status: 'todo', createdAt: new Date() },
      ]);
      const crudRouter = createCrudRouter({
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
        filterableColumns: [{ id: 'title', jsonField: ['zh-CN', 'en-US', 'en', 'zh'] }],
      });

      const caller = crudRouter.createCaller({ db } as any) as ListCaller;
      await caller.list({
        page: 1,
        perPage: 10,
        filters: [
          {
            id: 'title',
            value: '任务',
            operator: 'iLike',
            variant: 'text',
            filterId: 'title',
          },
        ],
        joinOperator: 'and',
      });

      const whereArg = db.builders[0]?.where.mock.calls[0]?.[0];
      const sqlText = collectSqlText(whereArg);

      expect(sqlText).toContain('jsonb_typeof');
      expect(sqlText).toContain('->>');
      expect(sqlText).toContain('zh-CN');
      expect(sqlText).toContain('ilike');
    });

    it('should apply jsonField sortable columns as orderBy expressions', async () => {
      const db = createListMockDb([
        { id: '1', title: '任务 1', status: 'todo', createdAt: new Date() },
      ]);
      const crudRouter = createCrudRouter({
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
        sortableColumns: [{ id: 'title', jsonField: ['zh-CN', 'en-US'] }],
      });

      const caller = crudRouter.createCaller({ db } as any) as ListCaller;
      await caller.list({
        page: 1,
        perPage: 10,
        sort: [{ id: 'title', desc: false }],
      });

      const orderByArg = db.builders[0]?.orderBy.mock.calls[0]?.[0];
      const sqlText = collectSqlText(orderByArg);

      expect(sqlText).toContain('jsonb_typeof');
      expect(sqlText).toContain('->>');
      expect(sqlText).toContain('zh-CN');
      expect(sqlText).toContain(' asc');
    });

    it('should apply createdAt descending as the default list order when available', async () => {
      const db = createListMockDb([
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
      ]);
      const crudRouter = createCrudRouter({
        table: {
          ...mockTable,
          createdAt: { name: 'createdAt' },
        } as any,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
      });

      const caller = crudRouter.createCaller({ db } as any) as ListCaller;
      await caller.list({
        page: 1,
        perPage: 10,
      });

      expect(db.builders[0]?.orderBy).toHaveBeenCalledTimes(1);
      expect(collectSqlText(db.builders[0]?.orderBy.mock.calls[0]?.[0])).toContain(
        ' desc',
      );
      expect(db.builders[0]?.orderBy.mock.calls[0]).toHaveLength(2);
    });

    it('should apply every requested sort and append a stable id tie-breaker', async () => {
      const db = createListMockDb([
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
      ]);
      const crudRouter = createCrudRouter({
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
        sortableColumns: ['title', 'status'],
      });

      const caller = crudRouter.createCaller({ db } as any) as ListCaller;
      await caller.list({
        page: 1,
        perPage: 10,
        sort: [
          { id: 'title', desc: false },
          { id: 'status', desc: true },
        ],
      });

      const orderByArgs = db.builders[0]?.orderBy.mock.calls[0] ?? [];
      expect(orderByArgs).toHaveLength(3);
      expect(collectSqlText(orderByArgs[0])).toContain(' asc');
      expect(collectSqlText(orderByArgs[1])).toContain(' desc');
      expect(collectSqlText(orderByArgs[2])).toContain(' asc');
    });

    it('should not append the id tie-breaker twice', async () => {
      const db = createListMockDb([
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
      ]);
      const crudRouter = createCrudRouter({
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
        sortableColumns: ['id'],
      });

      const caller = crudRouter.createCaller({ db } as any) as ListCaller;
      await caller.list({
        page: 1,
        perPage: 10,
        sort: [{ id: 'id', desc: true }],
      });

      expect(db.builders[0]?.orderBy.mock.calls[0]).toHaveLength(1);
    });

    it('should not apply default createdAt ordering when sortableColumns excludes it', async () => {
      const db = createListMockDb([
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
      ]);
      const crudRouter = createCrudRouter({
        table: {
          ...mockTable,
          createdAt: { name: 'createdAt' },
        } as any,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
        sortableColumns: ['title'],
      });

      const caller = crudRouter.createCaller({ db } as any) as ListCaller;
      await caller.list({
        page: 1,
        perPage: 10,
      });

      expect(db.builders[0]?.orderBy).not.toHaveBeenCalled();
    });

    it('should apply custom expression columns for advanced orderBy cases', async () => {
      const db = createListMockDb([
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
      ]);
      const crudRouter = createCrudRouter({
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
        sortableColumns: [
          {
            id: 'title',
            expression: ({ table }) => sql<string>`lower(${table.title})`,
          },
        ],
      });

      const caller = crudRouter.createCaller({ db } as any) as ListCaller;
      await caller.list({
        page: 1,
        perPage: 10,
        sort: [{ id: 'title', desc: true }],
      });

      const orderByArg = db.builders[0]?.orderBy.mock.calls[0]?.[0];
      const sqlText = collectSqlText(orderByArg);

      expect(sqlText).toContain('lower(');
      expect(sqlText).toContain(' desc');
    });

    it('should preserve id from imported rows for auto-derived upsert writes', async () => {
      const importTable = pgTable('import_items', {
        id: text('id').primaryKey(),
        title: text('title').notNull(),
        createdAt: timestamp('created_at'),
      });
      const selectBuilder = {
        from: vi.fn(() => selectBuilder),
        where: vi.fn(() => [{ id: 'row-1' }]),
      };
      const insertBuilder = {
        values: vi.fn(() => insertBuilder),
        onConflictDoUpdate: vi.fn(() => insertBuilder),
        returning: vi.fn(() => [{ id: 'row-1' }]),
      };
      const db = {
        select: vi.fn(() => selectBuilder),
        insert: vi.fn(() => insertBuilder),
      };
      const crudRouter = createCrudRouter({
        table: importTable,
      });

      const caller = crudRouter.createCaller({ db } as any) as MutationCaller;
      const result = await caller.import({
        rows: [{ id: 'row-1', title: 'Imported item' }],
        onConflict: 'upsert',
      });

      expect(insertBuilder.values).toHaveBeenCalledWith([
        { id: 'row-1', title: 'Imported item' },
      ]);
      expect(result).toEqual({ success: 0, updated: 1, skipped: 0, failed: [] });
    });

    it('should not filter expression columns that are not allowed', async () => {
      const db = createListMockDb([
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
      ]);
      const crudRouter = createCrudRouter({
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
        filterableColumns: ['status'],
      });

      const caller = crudRouter.createCaller({ db } as any) as ListCaller;
      await caller.list({
        page: 1,
        perPage: 10,
        filters: [
          {
            id: 'title',
            value: 'Task',
            operator: 'iLike',
            variant: 'text',
            filterId: 'title',
          },
        ],
        joinOperator: 'and',
      });

      expect(db.builders[0]?.where).not.toHaveBeenCalled();
      expect(db.builders[1]?.where).not.toHaveBeenCalled();
    });

    it('should not treat disallowed table filters as extension filters', async () => {
      const db = createListMockDb([
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
      ]);
      const crudRouter = createCrudRouter({
        id: 'com.example.tasks',
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
        filterableColumns: ['status'],
      });

      const caller = crudRouter.createCaller({ db } as any) as ListCaller;
      await expect(
        caller.list({
          page: 1,
          perPage: 10,
          filters: [
            {
              id: 'title',
              value: 'Task',
              operator: 'iLike',
              variant: 'text',
              filterId: 'title',
            },
          ],
          joinOperator: 'and',
        }),
      ).resolves.toMatchObject({ total: 1 });

      expect(db.builders[0]?.where).not.toHaveBeenCalled();
      expect(db.builders[1]?.where).not.toHaveBeenCalled();
    });

    it('should apply global search through configured searchColumns', async () => {
      const db = createListMockDb([
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
      ]);
      const crudRouter = createCrudRouter({
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
        searchColumns: ['title'],
      });

      const caller = crudRouter.createCaller({ db } as any) as ListCaller;
      await caller.list({
        page: 1,
        perPage: 10,
        search: 'Task',
        joinOperator: 'and',
      });

      const whereArg = db.builders[0]?.where.mock.calls[0]?.[0];
      const sqlText = collectSqlText(whereArg);

      expect(db.builders[0]?.where).toHaveBeenCalledTimes(1);
      expect(sqlText).toContain('ilike');
      expect(sqlText).not.toContain('::text');
    });

    it('should retain text casts for non-text search columns', async () => {
      const searchTable = pgTable('search_items', {
        id: text('id').primaryKey(),
        rank: integer('rank').notNull(),
      });
      const db = createListMockDb([{ id: '1', rank: 10 }] as any);
      const crudRouter = createCrudRouter({
        table: searchTable,
        search: ['rank'],
      });

      const caller = crudRouter.createCaller({ db } as any) as ListCaller;
      await caller.list({
        page: 1,
        perPage: 10,
        search: '10',
        joinOperator: 'and',
      });

      const whereArg = db.builders[0]?.where.mock.calls[0]?.[0];
      expect(collectSqlText(whereArg)).toContain('::text');
    });

    it('should retain text casts for arbitrary SQL search expressions', async () => {
      const searchTable = pgTable('search_expression_items', {
        id: text('id').primaryKey(),
        rank: integer('rank').notNull(),
      });
      const db = createListMockDb([{ id: '1', rank: 10 }] as any);
      const crudRouter = createCrudRouter({
        table: searchTable,
        search: [
          {
            id: 'rank',
            expression: ({ table }) => sql<number>`${table.rank} + 1`,
          },
        ],
      });

      const caller = crudRouter.createCaller({ db } as any) as ListCaller;
      await caller.list({
        page: 1,
        perPage: 10,
        search: '10',
        joinOperator: 'and',
      });

      const whereArg = db.builders[0]?.where.mock.calls[0]?.[0];
      expect(collectSqlText(whereArg)).toContain('::text');
    });
  });

  describe('CRUD extension writes', () => {
    it('should expose extension metadata from ctx.crudExtensions', async () => {
      const getMetadata = vi.fn().mockResolvedValue({
        schema: {
          type: 'object',
          properties: {
            owner: { type: 'string' },
          },
        },
        fields: {
          owner: { label: 'Owner', search: true },
        },
      });
      const crudRouter = createCrudRouter({
        id: 'com.example.tasks',
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
      });

      const caller = crudRouter.createCaller({
        db: createMockDb(),
        crudExtensions: {
          getMetadata,
        },
      } as any) as MetadataCaller;

      const result = await caller.meta();

      expect(getMetadata).toHaveBeenCalledWith({ id: 'com.example.tasks' });
      expect(result).toEqual({
        schema: {
          type: 'object',
          properties: {
            owner: { type: 'string' },
          },
        },
        fields: {
          owner: { label: 'Owner', search: true },
        },
        capabilities: {
          search: { enabled: false, fields: [] },
          filters: { enabled: true, fields: null },
          sort: { enabled: true, fields: null },
        },
      });
    });

    it('should merge projection values into list rows through ctx.crudExtensions', async () => {
      const db = createListMockDb([
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
      ]);
      const readProjection = vi.fn().mockResolvedValue({
        '1': {
          owner: {
            value: 'user-1',
            display: 'User One',
          },
        },
      });
      const crudRouter = createCrudRouter({
        id: 'com.example.tasks',
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
      });

      const caller = crudRouter.createCaller({
        db,
        crudExtensions: {
          readProjection,
        },
      } as any) as ListCaller;

      const result = await caller.list({
        page: 1,
        perPage: 10,
        joinOperator: 'and',
      });

      expect(readProjection).toHaveBeenCalledWith({
        id: 'com.example.tasks',
        entityIds: ['1'],
      });
      expect(result.data[0]).toMatchObject({
        id: '1',
        owner: 'User One',
      });
    });

    it('should keep extension id filters when filterableColumns are restricted', async () => {
      const db = createListMockDb([
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
      ]);
      const matchEntityIds = vi.fn().mockResolvedValue(['1']);
      const crudRouter = createCrudRouter({
        id: 'com.example.tasks',
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
        filterableColumns: ['status'],
      });

      const caller = crudRouter.createCaller({
        db,
        crudExtensions: {
          matchEntityIds,
        },
      } as any) as ListCaller;

      await caller.list({
        page: 1,
        perPage: 10,
        filters: [
          {
            id: 'owner',
            value: 'user-1',
            operator: 'inArray',
            variant: 'multiSelect',
            filterId: 'owner',
          },
        ],
        joinOperator: 'and',
      });

      expect(matchEntityIds).toHaveBeenCalledWith({
        id: 'com.example.tasks',
        filters: [
          {
            id: 'owner',
            value: 'user-1',
            operator: 'inArray',
            variant: 'multiSelect',
            filterId: 'owner',
          },
        ],
        joinOperator: 'and',
        limit: 5000,
      });
      expect(db.builders[0]?.where).toHaveBeenCalled();
      expect(db.builders[1]?.where).toHaveBeenCalled();
    });

    it('should resolve extension filters and search concurrently', async () => {
      const db = createListMockDb([
        { id: '2', title: 'Task 2', status: 'todo', createdAt: new Date() },
      ]);
      const filterMatches = createDeferred<string[]>();
      const searchMatches = createDeferred<string[]>();
      const matchEntityIds = vi.fn(() => filterMatches.promise);
      const searchEntityIds = vi.fn(() => searchMatches.promise);
      const crudRouter = createCrudRouter({
        id: 'com.example.tasks',
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
        filterableColumns: ['status'],
        searchColumns: ['title'],
      });

      const caller = crudRouter.createCaller({
        db,
        crudExtensions: { matchEntityIds, searchEntityIds },
      } as any) as ListCaller;
      const resultPromise = caller.list({
        page: 1,
        perPage: 10,
        search: 'Task',
        filters: [
          {
            id: 'owner',
            value: 'user-1',
            operator: 'inArray',
            variant: 'multiSelect',
            filterId: 'owner',
          },
        ],
        joinOperator: 'and',
      });

      await vi.waitFor(() => {
        expect(matchEntityIds).toHaveBeenCalledTimes(1);
        expect(searchEntityIds).toHaveBeenCalledTimes(1);
      });
      searchMatches.resolve(['2', '3']);
      filterMatches.resolve(['1', '2']);

      await expect(resultPromise).resolves.toMatchObject({ total: 1 });
      expect(db.builders[0]?.where).toHaveBeenCalledTimes(1);
      expect(db.builders[1]?.where).toHaveBeenCalledTimes(1);
    });

    it('should strip direct extra fields from upsert table writes and persist them separately', async () => {
      const db = createMockDb();
      const saveExtraValues = vi.fn().mockResolvedValue(undefined);
      const crudRouter = createCrudRouter({
        id: 'com.example.tasks',
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
      });

      const caller = crudRouter.createCaller({
        db,
        crudExtensions: {
          saveExtraValues,
        },
      } as any) as MutationCaller;

      await caller.upsert({
        id: 'new-id',
        title: 'New Task',
        status: 'todo',
        owner: 'user-1',
      });

      expect(db.values).toHaveBeenCalledWith({
        id: 'new-id',
        title: 'New Task',
        status: 'todo',
      });
      expect(db.onConflictDoUpdate.mock.calls[0]?.[0].set).toEqual({
        id: 'new-id',
        title: 'New Task',
        status: 'todo',
      });
      expect(saveExtraValues).toHaveBeenCalledWith({
        id: 'com.example.tasks',
        entityId: 'new-id',
        rawValues: {
          id: 'new-id',
          title: 'New Task',
          status: 'todo',
          owner: 'user-1',
        },
        baseValues: {
          id: 'new-id',
          title: 'New Task',
          status: 'todo',
        },
        extraValues: {
          owner: 'user-1',
        },
        tx: undefined,
      });
    });

    it('should keep legacy ext payload compatibility', async () => {
      const db = createMockDb();
      const saveExtraValues = vi.fn().mockResolvedValue(undefined);
      const crudRouter = createCrudRouter({
        id: 'com.example.tasks',
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
      });

      const caller = crudRouter.createCaller({
        db,
        crudExtensions: {
          saveExtraValues,
        },
      } as any) as MutationCaller;

      await caller.upsert({
        id: 'new-id',
        title: 'New Task',
        status: 'todo',
        ext: {
          owner: 'user-1',
        },
      });

      expect(db.values).toHaveBeenCalledWith({
        id: 'new-id',
        title: 'New Task',
        status: 'todo',
      });
      expect(saveExtraValues).toHaveBeenCalledWith(
        expect.objectContaining({
          extraValues: {
            owner: 'user-1',
          },
        }),
      );
    });

    it('should persist createMany extension values through one bulk provider call', async () => {
      const rows: Task[] = [
        { id: '2', title: 'Task 2', status: 'done' },
        { id: '1', title: 'Task 1', status: 'todo' },
      ];
      const { db, tx } = createBatchWriteMockDb(rows);
      const saveExtraValues = vi.fn().mockResolvedValue(undefined);
      const saveExtraValuesMany = vi.fn().mockResolvedValue(undefined);
      const crudRouter = createCrudRouter({
        id: 'com.example.tasks',
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
      });

      const caller = crudRouter.createCaller({
        db,
        crudExtensions: { saveExtraValues, saveExtraValuesMany },
      } as any) as MutationCaller;
      const result = await caller.createMany([
        { id: '1', title: 'Task 1', status: 'todo', owner: 'user-1' },
        { id: '2', title: 'Task 2', status: 'done', owner: 'user-2' },
      ]);

      expect(result.count).toBe(2);
      expect(saveExtraValues).not.toHaveBeenCalled();
      expect(saveExtraValuesMany).toHaveBeenCalledTimes(1);
      expect(saveExtraValuesMany).toHaveBeenCalledWith({
        id: 'com.example.tasks',
        rows: [
          {
            entityId: '2',
            rawValues: {
              id: '2',
              title: 'Task 2',
              status: 'done',
              owner: 'user-2',
            },
            baseValues: { id: '2', title: 'Task 2', status: 'done' },
            extraValues: { owner: 'user-2' },
          },
          {
            entityId: '1',
            rawValues: {
              id: '1',
              title: 'Task 1',
              status: 'todo',
              owner: 'user-1',
            },
            baseValues: { id: '1', title: 'Task 1', status: 'todo' },
            extraValues: { owner: 'user-1' },
          },
        ],
        tx,
      });
    });

    it('should support bulk-only providers for single-row writes', async () => {
      const db = createMockDb();
      const saveExtraValuesMany = vi.fn().mockResolvedValue(undefined);
      const crudRouter = createCrudRouter({
        id: 'com.example.tasks',
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
      });

      const caller = crudRouter.createCaller({
        db,
        crudExtensions: { saveExtraValuesMany },
      } as any) as MutationCaller;
      await caller.create({
        title: 'New Task',
        status: 'todo',
        owner: 'user-1',
      });

      expect(saveExtraValuesMany).toHaveBeenCalledWith({
        id: 'com.example.tasks',
        rows: [
          expect.objectContaining({
            entityId: 'new-id',
            extraValues: { owner: 'user-1' },
          }),
        ],
        tx: undefined,
      });
    });

    it('should retain per-row createMany persistence for legacy providers', async () => {
      const rows: Task[] = [
        { id: '1', title: 'Task 1', status: 'todo' },
        { id: '2', title: 'Task 2', status: 'done' },
      ];
      const { db } = createBatchWriteMockDb(rows);
      const saveExtraValues = vi.fn().mockResolvedValue(undefined);
      const crudRouter = createCrudRouter({
        id: 'com.example.tasks',
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
      });

      const caller = crudRouter.createCaller({
        db,
        crudExtensions: { saveExtraValues },
      } as any) as MutationCaller;
      await caller.createMany([
        { id: '1', title: 'Task 1', status: 'todo', owner: 'user-1' },
        { id: '2', title: 'Task 2', status: 'done', owner: 'user-2' },
      ]);

      expect(saveExtraValues).toHaveBeenCalledTimes(2);
    });

    it('should save create extra values inside a shared transaction', async () => {
      const tx = createMockDb();
      const db = {
        transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
          callback(tx),
        ),
      };
      const saveExtraValues = vi.fn().mockResolvedValue(undefined);
      const crudRouter = createCrudRouter({
        id: 'com.example.tasks',
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
      });

      const caller = crudRouter.createCaller({
        db,
        crudExtensions: {
          saveExtraValues,
        },
      } as any) as MutationCaller;

      await caller.create({
        title: 'New Task',
        status: 'todo',
        owner: 'user-1',
      });

      expect(db.transaction).toHaveBeenCalledTimes(1);
      expect(tx.values).toHaveBeenCalledWith({
        title: 'New Task',
        status: 'todo',
      });
      expect(saveExtraValues).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: 'new-id',
          extraValues: {
            owner: 'user-1',
          },
          tx,
        }),
      );
    });

    it('should roll back create base write when extra value persistence fails', async () => {
      const committedRows: unknown[] = [];
      const pendingRows: unknown[] = [];
      const tx = createMockDb();
      tx.values.mockImplementation((row: unknown) => {
        pendingRows.push(row);
        return tx;
      });
      const db = {
        transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
          try {
            const result = await callback(tx);
            committedRows.push(...pendingRows);
            return result;
          } finally {
            pendingRows.length = 0;
          }
        }),
      };
      const saveExtraValues = vi.fn().mockRejectedValue(new Error('plugin save failed'));
      const crudRouter = createCrudRouter({
        id: 'com.example.tasks',
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
      });

      const caller = crudRouter.createCaller({
        db,
        crudExtensions: {
          saveExtraValues,
        },
      } as any) as MutationCaller;

      await expect(
        caller.create({
          title: 'New Task',
          status: 'todo',
          owner: 'user-1',
        }),
      ).rejects.toThrow('plugin save failed');

      expect(committedRows).toEqual([]);
      expect(pendingRows).toEqual([]);
    });

    it('should emit create lifecycle hook inside the shared transaction', async () => {
      const tx = createMockDb();
      const db = {
        transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
          callback(tx),
        ),
      };
      const hooks = {
        emit: vi.fn().mockResolvedValue(undefined),
      };
      const crudRouter = createCrudRouter({
        id: 'com.wordrhyme.shop.stores',
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
      });

      const caller = crudRouter.createCaller({
        db,
        hooks,
      } as any) as MutationCaller;

      await caller.create({
        title: 'New Task',
        status: 'todo',
      });

      expect(db.transaction).toHaveBeenCalledTimes(1);
      expect(hooks.emit).toHaveBeenCalledWith(
        'com.wordrhyme.shop.stores.create',
        expect.objectContaining({
          entityId: 'new-id',
          extraValues: {},
          row: expect.objectContaining({ id: 'new-id' }),
        }),
        {
          dispatch: 'hook',
          mode: 'effect',
          tx,
        },
      );
    });

    it.each([
      {
        id: 'com.wordrhyme.shop.stores',
        pluginId: 'com.wordrhyme.shop',
        hookId: 'shop.stores.create',
      },
      {
        id: 'com.example.catalog.products',
        pluginId: 'com.example.catalog',
        hookId: 'com-example-catalog.products.create',
      },
    ])(
      'should derive lifecycle hook id from plugin context for $pluginId',
      async ({ id, pluginId, hookId }) => {
        const tx = createMockDb();
        const db = {
          transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
            callback(tx),
          ),
        };
        const hooks = {
          emit: vi.fn().mockResolvedValue(undefined),
        };
        const crudRouter = createCrudRouter({
          id,
          table: mockTable,
          schema: insertTaskSchema,
          updateSchema: updateTaskSchema,
          selectSchema: taskSchema,
        });

        const caller = crudRouter.createCaller({
          db,
          hooks,
          pluginId,
        } as any) as MutationCaller;

        await caller.create({
          title: 'New Task',
          status: 'todo',
        });

        expect(hooks.emit).toHaveBeenCalledWith(
          hookId,
          expect.objectContaining({
            entityId: 'new-id',
          }),
          expect.objectContaining({
            tx,
          }),
        );
      },
    );

    it('should roll back create base write when lifecycle hook fails', async () => {
      const committedRows: unknown[] = [];
      const pendingRows: unknown[] = [];
      const tx = createMockDb();
      tx.values.mockImplementation((row: unknown) => {
        pendingRows.push(row);
        return tx;
      });
      const db = {
        transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
          try {
            const result = await callback(tx);
            committedRows.push(...pendingRows);
            return result;
          } finally {
            pendingRows.length = 0;
          }
        }),
      };
      const hooks = {
        emit: vi.fn().mockRejectedValue(new Error('lifecycle failed')),
      };
      const crudRouter = createCrudRouter({
        id: 'com.wordrhyme.shop.stores',
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
      });

      const caller = crudRouter.createCaller({
        db,
        hooks,
      } as any) as MutationCaller;

      await expect(
        caller.create({
          title: 'New Task',
          status: 'todo',
        }),
      ).rejects.toThrow('lifecycle failed');

      expect(committedRows).toEqual([]);
      expect(pendingRows).toEqual([]);
    });

    it('should emit lifecycle hooks for custom non-dotted crud ids', async () => {
      const tx = createMockDb();
      const db = {
        transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
          callback(tx),
        ),
      };
      const hooks = {
        emit: vi.fn().mockResolvedValue(undefined),
      };
      const crudRouter = createCrudRouter({
        id: 'customStore',
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
      });

      const caller = crudRouter.createCaller({
        db,
        hooks,
      } as any) as MutationCaller;

      await caller.create({
        title: 'New Task',
        status: 'todo',
      });

      expect(hooks.emit).toHaveBeenCalledWith(
        'customStore.create',
        expect.objectContaining({
          entityId: 'new-id',
        }),
        expect.objectContaining({
          tx,
        }),
      );
    });

    it('should scope extension-only updateMany before saving extra values', async () => {
      const selectBuilder = {
        from: vi.fn(() => selectBuilder),
        where: vi.fn(() => [{ id: '1' }]),
      };
      const db = {
        select: vi.fn(() => selectBuilder),
        update: vi.fn(),
      };
      const saveExtraValues = vi.fn().mockResolvedValue(undefined);
      const crudRouter = createCrudRouter({
        id: 'com.example.tasks',
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
      });

      const caller = crudRouter.createCaller({
        db,
        crudExtensions: {
          saveExtraValues,
        },
      } as any) as MutationCaller;

      const result = await caller.updateMany({
        ids: ['1', '2'],
        data: {
          owner: 'user-1',
        },
      });

      expect(result).toEqual({ updated: 1 });
      expect(db.update).not.toHaveBeenCalled();
      expect(selectBuilder.where).toHaveBeenCalledTimes(1);
      expect(saveExtraValues).toHaveBeenCalledTimes(1);
      expect(saveExtraValues).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: '1',
          extraValues: {
            owner: 'user-1',
          },
        }),
      );
    });

    it('should persist updateMany extension values through one bulk provider call', async () => {
      const selectBuilder = {
        from: vi.fn(() => selectBuilder),
        where: vi.fn(() => [{ id: '1' }, { id: '2' }]),
      };
      const db = {
        select: vi.fn(() => selectBuilder),
        update: vi.fn(),
      };
      const saveExtraValuesMany = vi.fn().mockResolvedValue(undefined);
      const crudRouter = createCrudRouter({
        id: 'com.example.tasks',
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
      });

      const caller = crudRouter.createCaller({
        db,
        crudExtensions: { saveExtraValuesMany },
      } as any) as MutationCaller;
      const result = await caller.updateMany({
        ids: ['1', '2'],
        data: { owner: 'user-1' },
      });

      expect(result).toEqual({ updated: 2 });
      expect(saveExtraValuesMany).toHaveBeenCalledTimes(1);
      expect(saveExtraValuesMany).toHaveBeenCalledWith({
        id: 'com.example.tasks',
        rows: [
          expect.objectContaining({ entityId: '1', extraValues: { owner: 'user-1' } }),
          expect.objectContaining({ entityId: '2', extraValues: { owner: 'user-1' } }),
        ],
        tx: undefined,
      });
    });

    it('should reject unmappable createMany extension values before writing', async () => {
      const committedRows: unknown[] = [];
      const pendingRows: unknown[] = [];
      const tx = {
        insert: vi.fn(() => tx),
        values: vi.fn((rows: unknown[]) => {
          pendingRows.push(...rows);
          return tx;
        }),
        onConflictDoNothing: vi.fn(() => tx),
        returning: vi.fn(() => [
          { id: 'created-id', title: 'Created Task', status: 'todo' },
        ]),
      };
      const db = {
        transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
          try {
            const result = await callback(tx);
            committedRows.push(...pendingRows);
            return result;
          } finally {
            pendingRows.length = 0;
          }
        }),
      };
      const saveExtraValues = vi.fn().mockResolvedValue(undefined);
      const crudRouter = createCrudRouter({
        id: 'com.example.tasks',
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
      });

      const caller = crudRouter.createCaller({
        db,
        crudExtensions: {
          saveExtraValues,
        },
      } as any) as MutationCaller;

      await expect(
        caller.createMany([
          {
            title: 'Skipped Task',
            status: 'todo',
            owner: 'skipped-owner',
          },
          {
            title: 'Created Task',
            status: 'todo',
            owner: 'created-owner',
          },
        ]),
      ).rejects.toThrow('provide a stable id');

      expect(db.transaction).not.toHaveBeenCalled();
      expect(tx.values).not.toHaveBeenCalled();
      expect(saveExtraValues).not.toHaveBeenCalled();
      expect(committedRows).toEqual([]);
      expect(pendingRows).toEqual([]);
    });

    it('should reject duplicate createMany ids when extension values are present', async () => {
      const { db, tx } = createBatchWriteMockDb([]);
      const saveExtraValuesMany = vi.fn().mockResolvedValue(undefined);
      const crudRouter = createCrudRouter({
        id: 'com.example.tasks',
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
      });

      const caller = crudRouter.createCaller({
        db,
        crudExtensions: { saveExtraValuesMany },
      } as any) as MutationCaller;

      await expect(
        caller.createMany([
          { id: 'duplicate', title: 'Task 1', status: 'todo', owner: 'user-1' },
          { id: 'duplicate', title: 'Task 2', status: 'done' },
        ]),
      ).rejects.toThrow('require unique ids');

      expect(db.transaction).not.toHaveBeenCalled();
      expect(tx.values).not.toHaveBeenCalled();
      expect(saveExtraValuesMany).not.toHaveBeenCalled();
    });

    it('should reject extra fields before writing when no provider is available', async () => {
      const db = createMockDb();
      const crudRouter = createCrudRouter({
        id: 'com.example.tasks',
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
      });

      const caller = crudRouter.createCaller({ db } as any) as MutationCaller;

      await expect(
        caller.upsert({
          id: 'new-id',
          title: 'New Task',
          status: 'todo',
          owner: 'user-1',
        }),
      ).rejects.toThrow('CRUD extension persistence is not available');
      expect(db.values).not.toHaveBeenCalled();
    });

    it('should reject search when neither base nor extension search is available', async () => {
      const db = createListMockDb([
        { id: '1', title: 'Task 1', status: 'todo', createdAt: new Date() },
      ]);
      const crudRouter = createCrudRouter({
        id: 'com.example.tasks',
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        selectSchema: taskSchema,
      });

      const caller = crudRouter.createCaller({ db } as any) as ListCaller;

      await expect(
        caller.list({
          page: 1,
          perPage: 10,
          search: 'Task',
          joinOperator: 'and',
        }),
      ).rejects.toThrow('CRUD search is not available');
      expect(db.builders).toHaveLength(0);
    });
  });
});
