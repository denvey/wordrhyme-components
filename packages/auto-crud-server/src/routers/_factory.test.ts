import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
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

    return builder;
  };

  return {
    select: vi.fn((selection?: Record<string, unknown>) => {
      if (selection && 'count' in selection) {
        return createSelectBuilder(() => [{ count: rows.length }]);
      }
      return createSelectBuilder(() => rows);
    }),
  };
}

// Mock table
const mockTable = {
  id: { name: 'id' },
  title: { name: 'title' },
  status: { name: 'status' },
  deletedAt: { name: 'deletedAt' },
} as any;

// Mock procedure
const mockProcedure = {
  input: vi.fn().mockReturnThis(),
  output: vi.fn().mockReturnThis(),
  query: vi.fn().mockReturnThis(),
  mutation: vi.fn().mockReturnThis(),
};

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
  });
});
