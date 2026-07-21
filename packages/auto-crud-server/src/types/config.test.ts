import { describe, it, expectTypeOf } from 'vitest';
import { z } from 'zod';
import type { PgTable } from 'drizzle-orm/pg-core';
import type {
  CrudRouterConfig,
  CrudExtensionsProvider,
  CrudExtensionValueWrite,
  CrudMiddleware,
  CrudProcedures,
  ListMiddlewareParams,
  CreateMiddlewareParams,
  UpdateMiddlewareParams,
  DeleteMiddlewareParams,
  ExportInput,
  ExportMiddlewareParams,
  GetInput,
  GetMiddlewareParams,
  ListInput,
  ListResult,
  ProcedureConfig,
  ProcedureMap,
  ProcedureFactory,
} from './config';

// ============================================================
// 测试用 Schema 和类型
// ============================================================

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['todo', 'done']),
});

const insertTaskSchema = taskSchema.omit({ id: true });
const updateTaskSchema = taskSchema.partial().omit({ id: true });

type Task = z.infer<typeof taskSchema>;
type InsertTask = z.infer<typeof insertTaskSchema>;
type UpdateTask = z.infer<typeof updateTaskSchema>;
type ProductListInput = ListInput & {
  include?: {
    skus?: boolean;
  };
};
type ProductGetInput =
  | string
  | (Extract<GetInput, { id: string }> & {
      include?: {
        skus?: boolean;
      };
    });
type ProductExportInput = ExportInput & {
  format?: 'csv' | 'xlsx';
};

interface AppContext {
  db: any;
  user: { id: string; role: string };
}

// Mock PgTable type for testing
type MockPgTable = PgTable & {
  id: any;
  title: any;
  status: any;
};

// ============================================================
// 类型测试
// ============================================================

describe('Type Definitions', () => {
  describe('CrudMiddleware', () => {
    it('should have correct generic type parameters', () => {
      type TestMiddleware = CrudMiddleware<AppContext, Task, InsertTask, UpdateTask>;

      // 验证 list middleware 参数类型
      expectTypeOf<TestMiddleware['list']>().toMatchTypeOf<
        | ((params: ListMiddlewareParams<AppContext, Task>) => Promise<ListResult<Task>>)
        | undefined
      >();
    });

    it('should infer correct input types for create middleware', () => {
      type CreateParams = CreateMiddlewareParams<AppContext, Task, InsertTask>;

      expectTypeOf<CreateParams['ctx']>().toMatchTypeOf<AppContext>();
      expectTypeOf<CreateParams['input']>().toMatchTypeOf<InsertTask>();
    });

    it('should allow custom list input types for list middleware', () => {
      type TestMiddleware = CrudMiddleware<
        AppContext,
        Task,
        InsertTask,
        UpdateTask,
        ProductListInput
      >;

      expectTypeOf<TestMiddleware['list']>().toMatchTypeOf<
        | ((
            params: ListMiddlewareParams<AppContext, Task, ProductListInput>,
          ) => Promise<ListResult<Task>>)
        | undefined
      >();
    });

    it('should allow custom get and export input types for middleware', () => {
      type TestMiddleware = CrudMiddleware<
        AppContext,
        Task,
        InsertTask,
        UpdateTask,
        ProductListInput,
        ProductGetInput,
        ProductExportInput
      >;

      expectTypeOf<TestMiddleware['get']>().toMatchTypeOf<
        | ((
            params: GetMiddlewareParams<AppContext, Task, ProductGetInput>,
          ) => Promise<Task | null>)
        | undefined
      >();
      expectTypeOf<TestMiddleware['export']>().toMatchTypeOf<
        | ((
            params: ExportMiddlewareParams<AppContext, Task, ProductExportInput>,
          ) => Promise<{ data: Task[]; total: number; hasMore: boolean }>)
        | undefined
      >();
    });

    it('should infer correct types for update middleware', () => {
      type UpdateParams = UpdateMiddlewareParams<AppContext, Task, UpdateTask>;

      expectTypeOf<UpdateParams['ctx']>().toMatchTypeOf<AppContext>();
      expectTypeOf<UpdateParams['data']>().toMatchTypeOf<UpdateTask>();
      expectTypeOf<UpdateParams['existing']>().toMatchTypeOf<Task>();
    });

    it('should infer correct types for delete middleware', () => {
      type DeleteParams = DeleteMiddlewareParams<AppContext, Task>;

      expectTypeOf<DeleteParams['ctx']>().toMatchTypeOf<AppContext>();
      expectTypeOf<DeleteParams['existing']>().toMatchTypeOf<Task>();
    });
  });

  describe('ProcedureConfig (v2.0 统一 API)', () => {
    it('should accept single procedure', () => {
      const singleProc: ProcedureConfig = {} as any;
      expectTypeOf(singleProc).toMatchTypeOf<ProcedureConfig>();
    });

    it('should accept procedure map with default', () => {
      const procedureMap: ProcedureMap = {
        list: {} as any,
        get: {} as any,
        default: {} as any,
      };
      expectTypeOf(procedureMap).toMatchTypeOf<ProcedureMap>();
      expectTypeOf(procedureMap.default).toMatchTypeOf<any>();
    });

    it('should accept procedure factory function', () => {
      const factory: ProcedureFactory = (op) => ({}) as any;
      expectTypeOf(factory).toBeFunction();
    });
  });

  describe('CrudRouterConfig (v2.0 统一 API)', () => {
    it('should support bulk-only CRUD extension persistence providers', () => {
      const write: CrudExtensionValueWrite = {
        entityId: 'task-1',
        rawValues: { owner: 'user-1' },
        baseValues: {},
        extraValues: { owner: 'user-1' },
      };
      const provider: CrudExtensionsProvider = {
        saveExtraValuesMany: async ({ rows }) => {
          expectTypeOf(rows).toEqualTypeOf<CrudExtensionValueWrite[]>();
        },
      };

      expectTypeOf(write.entityId).toBeString();
      expectTypeOf(provider).toMatchTypeOf<CrudExtensionsProvider>();
    });

    it('should allow procedure with guard combination', () => {
      // v2.0 核心：procedure 可与 guard/scope/authorize 组合
      // 泛型参数顺序: <TTable, TContext, TSelect, TInsert, TUpdate>
      const config: CrudRouterConfig<
        MockPgTable,
        AppContext,
        Task,
        InsertTask,
        UpdateTask
      > = {
        table: {} as any,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        // procedure 和 guard 可以同时使用！
        procedure: {
          list: {} as any,
          default: {} as any,
        },
        guard: (ctx, op) => ctx.user.role === 'admin',
        scope: (ctx, table, op) => undefined,
        authorize: (ctx, resource, op) => resource.id !== undefined,
      };

      expectTypeOf(config.guard).toMatchTypeOf<
        ((ctx: AppContext, op: any) => boolean | Promise<boolean>) | undefined
      >();
      expectTypeOf(config.procedure).toMatchTypeOf<ProcedureConfig | undefined>();
    });

    it('should accept factory function for procedure', () => {
      const config: CrudRouterConfig<
        MockPgTable,
        AppContext,
        Task,
        InsertTask,
        UpdateTask
      > = {
        table: {} as any,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        procedure: (op: string) => ({}) as any,
        // 同时可以使用 guard
        guard: (ctx, op) => true,
      };

      expectTypeOf(config.procedure).toMatchTypeOf<ProcedureConfig | undefined>();
    });

    it('should work with minimal config', () => {
      const config: CrudRouterConfig = {
        table: {} as any,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
      };

      expectTypeOf(config).toMatchTypeOf<CrudRouterConfig>();
    });

    it('should infer custom list input from config generic', () => {
      const productListInputSchema = z.object({
        page: z.number(),
        perPage: z.number(),
        sort: z.array(z.object({ id: z.string(), desc: z.boolean() })).optional(),
        filters: z
          .array(
            z.object({
              id: z.string(),
              value: z.union([z.string(), z.array(z.string())]),
              variant: z.string(),
              operator: z.string(),
              filterId: z.string(),
            }),
          )
          .optional(),
        joinOperator: z.enum(['and', 'or']),
        include: z.object({ skus: z.boolean().optional() }).optional(),
      });

      const config: CrudRouterConfig<
        MockPgTable,
        AppContext,
        Task,
        InsertTask,
        UpdateTask,
        z.infer<typeof productListInputSchema>
      > = {
        table: {} as any,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        listInputSchema: productListInputSchema,
        middleware: {
          list: async ({ input, next }) => {
            expectTypeOf(input.include?.skus).toMatchTypeOf<boolean | undefined>();
            return next(input);
          },
        },
      };

      expectTypeOf(config.listInputSchema).toMatchTypeOf<
        z.ZodType<z.infer<typeof productListInputSchema>> | undefined
      >();
    });

    it('should infer custom get and export inputs from config generics', () => {
      const productGetInputSchema = z.object({
        id: z.string(),
        include: z.object({ skus: z.boolean().optional() }).optional(),
      });
      const productExportInputSchema = z.object({
        sort: z.array(z.object({ id: z.string(), desc: z.boolean() })).optional(),
        filters: z
          .array(
            z.object({
              id: z.string(),
              value: z.union([z.string(), z.array(z.string())]),
              variant: z.string(),
              operator: z.string(),
              filterId: z.string(),
            }),
          )
          .optional(),
        joinOperator: z.enum(['and', 'or']).optional(),
        limit: z.number().optional(),
        format: z.enum(['csv', 'xlsx']).optional(),
      });

      const config: CrudRouterConfig<
        MockPgTable,
        AppContext,
        Task,
        InsertTask,
        UpdateTask,
        ProductListInput,
        string | z.infer<typeof productGetInputSchema>,
        z.infer<typeof productExportInputSchema>
      > = {
        table: {} as any,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        getInputSchema: productGetInputSchema,
        exportInputSchema: productExportInputSchema,
        middleware: {
          get: async ({ input, next }) => {
            if (typeof input !== 'string') {
              expectTypeOf(input.include?.skus).toMatchTypeOf<boolean | undefined>();
            }
            return next(input);
          },
          export: async ({ input, next }) => {
            expectTypeOf(input.format).toMatchTypeOf<'csv' | 'xlsx' | undefined>();
            return next(input);
          },
        },
      };

      expectTypeOf(config.getInputSchema).toMatchTypeOf<
        z.ZodType<z.infer<typeof productGetInputSchema>> | undefined
      >();
      expectTypeOf(config.exportInputSchema).toMatchTypeOf<
        z.ZodType<z.infer<typeof productExportInputSchema>> | undefined
      >();
    });
  });

  describe('CrudProcedures', () => {
    it('should have all 11 procedure types', () => {
      type TestProcedures = CrudProcedures;

      expectTypeOf<TestProcedures>().toHaveProperty('list');
      expectTypeOf<TestProcedures>().toHaveProperty('get');
      expectTypeOf<TestProcedures>().toHaveProperty('create');
      expectTypeOf<TestProcedures>().toHaveProperty('update');
      expectTypeOf<TestProcedures>().toHaveProperty('delete');
      expectTypeOf<TestProcedures>().toHaveProperty('deleteMany');
      expectTypeOf<TestProcedures>().toHaveProperty('updateMany');
      expectTypeOf<TestProcedures>().toHaveProperty('upsert');
      expectTypeOf<TestProcedures>().toHaveProperty('export');
      expectTypeOf<TestProcedures>().toHaveProperty('import');
      expectTypeOf<TestProcedures>().toHaveProperty('createMany');
    });
  });

  describe('ListResult', () => {
    it('should have correct structure', () => {
      type TestResult = ListResult<Task>;

      expectTypeOf<TestResult['data']>().toMatchTypeOf<Task[]>();
      expectTypeOf<TestResult['total']>().toMatchTypeOf<number>();
      expectTypeOf<TestResult['page']>().toMatchTypeOf<number>();
      expectTypeOf<TestResult['perPage']>().toMatchTypeOf<number>();
      expectTypeOf<TestResult['pageCount']>().toMatchTypeOf<number>();
    });
  });
});
