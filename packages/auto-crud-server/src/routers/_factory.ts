/**
 * Auto-CRUD Router Factory v2.0
 * 自动生成 tRPC CRUD 路由
 *
 * 统一 API 设计：
 * - procedure 支持三种形式（单一/映射/工厂）
 * - guard/scope/authorize 可与任意 procedure 形式组合
 * - 所有配置项可自由组合，无互斥模式
 */

import { z } from 'zod';
import { eq, sql, inArray, asc, desc, and, isNull } from 'drizzle-orm';
import type { AnyColumn, SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';
import { filterColumns } from '../lib/filter-columns';
import { dataTableConfig } from '../config/data-table';
import { isZodObject, nonEmpty } from '../lib/schema-utils';
import type {
  CrudRouterConfig,
  CrudOperation,
  WriteOperation,
  AnyProcedure,
  SoftDeleteOption,
  SoftDeleteConfig,
  CrudMiddleware,
  CrudProcedures,
  GetInput,
  ListInput,
  ListResult,
  ExportInput,
  ExportResult,
  ImportInput,
  ImportResult,
  ProcedureConfig,
  ProcedureMap,
  ProcedureFactory,
  CrudColumnRef,
} from '../types/config';

// Re-export types for backward compatibility
export type {
  CrudColumnConfig,
  CrudColumnExpression,
  CrudColumnRef,
  CrudRouterConfig,
  AnyProcedure,
  CrudProcedures,
} from '../types/config';
export type { ListResult, ExportResult, ImportResult } from '../types/config';

// ============================================================
// 内部类型：统一的配置表示
// ============================================================

/**
 * createCrudRouter 返回类型
 * 不携带泛型参数 — 类型安全由各 procedure 的 .output() 保证
 */
type CrudRouterReturn = ReturnType<typeof router> & {
  procedures: CrudProcedures;
};

interface ResolvedConfig<TContext, TSelect> {
  procedureFactory: (operation: CrudOperation) => AnyProcedure;
  guard?: (ctx: TContext, operation: CrudOperation) => boolean | Promise<boolean>;
  getScope: (ctx: TContext, table: PgTable, operation: CrudOperation) => SQL | undefined;
  getInject: (ctx: TContext, operation: WriteOperation) => Record<string, unknown>;
  checkAuthorize: (
    ctx: TContext,
    resource: TSelect,
    operation: CrudOperation,
  ) => Promise<boolean>;
}

interface ResolvedSoftDelete {
  column: string;
  getValue: () => unknown;
}

// ============================================================
// 软删除配置解析
// ============================================================

function resolveSoftDelete(
  option: SoftDeleteOption | undefined,
): ResolvedSoftDelete | null {
  if (!option) return null;

  if (option === true) {
    return { column: 'deletedAt', getValue: () => new Date() };
  }

  if (typeof option === 'string') {
    return { column: option, getValue: () => new Date() };
  }

  const config = option as SoftDeleteConfig;
  return {
    column: config.column,
    getValue: config.value ?? (() => new Date()),
  };
}

// ============================================================
// 配置解析：统一 API（v2.0）
// ============================================================

/**
 * 判断 procedure 配置的类型
 */
function isProcedureMap(config: ProcedureConfig | undefined): config is ProcedureMap {
  if (!config) return false;
  if (typeof config === 'function') return false;
  // 检查是否是对象且包含已知的操作键
  if (typeof config === 'object' && config !== null) {
    const keys = Object.keys(config);
    const validKeys = [
      'list',
      'get',
      'create',
      'update',
      'delete',
      'deleteMany',
      'updateMany',
      'upsert',
      'export',
      'import',
      'createMany',
      'default',
    ];
    return keys.some((k) => validKeys.includes(k));
  }
  return false;
}

function isProcedureFactory(
  config: ProcedureConfig | undefined,
): config is ProcedureFactory {
  return typeof config === 'function';
}

/**
 * 解析 procedure 配置为工厂函数
 */
function resolveProcedureFactory(
  config: ProcedureConfig | undefined,
): (op: CrudOperation) => AnyProcedure {
  // 未配置：使用默认 publicProcedure
  if (!config) {
    return () => publicProcedure;
  }

  // 工厂函数：直接使用
  if (isProcedureFactory(config)) {
    return config;
  }

  // 对象映射：转换为工厂函数
  if (isProcedureMap(config)) {
    const map = config;
    const defaultProc = map.default ?? publicProcedure;
    return (op: CrudOperation) => map[op] ?? defaultProc;
  }

  // 单一 procedure：所有操作共用
  return () => config as AnyProcedure;
}

function resolveConfig<TTable extends PgTable, TContext, TSelect, TInsert, TUpdate>(
  config: CrudRouterConfig<TTable, TContext, TSelect, TInsert, TUpdate>,
): ResolvedConfig<TContext, TSelect> {
  // v2.0 统一 API：所有配置项可自由组合
  const procedureFactory = resolveProcedureFactory(config.procedure);

  return {
    procedureFactory,
    guard: config.guard,
    getScope: (ctx, tbl, op) => config.scope?.(ctx, tbl, op),
    getInject: (ctx, op) => config.inject?.(ctx, op) ?? {},
    checkAuthorize: async (ctx, resource, op) => {
      if (config.authorize) {
        return config.authorize(ctx, resource, op);
      }
      return true;
    },
  };
}

// ============================================================
// Schema 定义
// ============================================================

const filterItemSchema = z.object({
  id: z.string(),
  value: z.union([z.string(), z.array(z.string())]),
  variant: z.enum(dataTableConfig.filterVariants),
  operator: z.enum(dataTableConfig.operators),
  filterId: z.string(),
});

export const baseListInputSchema = z.object({
  page: z.number().min(1).default(1),
  perPage: z.number().min(1).max(100).default(10),
  sort: z
    .array(
      z.object({
        id: z.string(),
        desc: z.boolean(),
      }),
    )
    .optional(),
  filters: z.array(filterItemSchema).optional(),
  joinOperator: z.enum(['and', 'or']).default('and'),
});

export const baseGetInputSchema = z.object({
  id: z.string(),
});

const defaultGetInputSchema = z.union([z.string(), baseGetInputSchema]);

export const baseExportInputSchema = z.object({
  sort: z
    .array(
      z.object({
        id: z.string(),
        desc: z.boolean(),
      }),
    )
    .optional(),
  filters: z.array(filterItemSchema).optional(),
  joinOperator: z.enum(['and', 'or']).default('and'),
  limit: z.number().min(1).optional(),
});

const importInputSchema = z.object({
  rows: z.array(z.unknown()).min(1).max(1000),
  onConflict: z.enum(['skip', 'upsert', 'error']).default('skip'),
});

// ============================================================
// Schema 解析
// ============================================================

const DEFAULT_OMIT_FIELDS = ['id', 'createdAt', 'updatedAt'] as const;

/**
 * 解析并派生 Schema
 * - 优先使用显式传入的 Schema
 * - 否则从 Drizzle table 自动派生
 */
function resolveSchemas<TTable extends PgTable>(
  config: CrudRouterConfig<TTable>,
): {
  selectSchema: z.ZodTypeAny;
  schema: z.ZodObject<z.ZodRawShape>;
  updateSchema: z.ZodTypeAny;
} {
  const { table, omitFields = DEFAULT_OMIT_FIELDS } = config;

  // 1. schema: 主 Schema（用于 create/upsert）
  let schema: z.ZodObject<z.ZodRawShape>;
  if (config.schema) {
    // 严格模式：验证是否为 ZodObject
    if (!isZodObject(config.schema)) {
      throw new Error(
        '[createCrudRouter] schema must be a ZodObject (not ZodEffects or other types). ' +
          "If you're using .refine() or .transform(), please remove them from schema.",
      );
    }
    schema = config.schema as z.ZodObject<z.ZodRawShape>;
  } else {
    const rawSchema = createInsertSchema(table);

    // 严格模式：检查 drizzle-zod 返回类型
    if (!isZodObject(rawSchema)) {
      throw new Error(
        '[createCrudRouter] drizzle-zod returned non-ZodObject schema. ' +
          'This may be due to table refinements. ' +
          'Please provide schema explicitly.',
      );
    }

    // 构建 omit 配置
    const omitConfig = Object.fromEntries(
      (omitFields as string[]).map((f) => [f, true as const]),
    ) as Record<string, true>;

    schema = rawSchema.omit(omitConfig);
  }

  // 2. selectSchema: 优先使用配置，其次使用 schema，最后从 table 创建
  let selectSchema: z.ZodTypeAny;
  if (config.selectSchema) {
    selectSchema = config.selectSchema;
  } else if (config.schema) {
    // 如果用户提供了 schema 但没有 selectSchema，使用 schema 作为基础
    selectSchema = schema;
  } else {
    // 完全自动派生模式：从 table 创建
    selectSchema = createSelectSchema(table);
  }

  // 3. updateSchema: 优先使用配置，否则从 schema 派生
  const updateSchema =
    config.updateSchema ??
    schema.partial().refine(nonEmpty, {
      message: 'Update payload cannot be empty. At least one field is required.',
    });

  return { selectSchema, schema, updateSchema };
}

// ============================================================
// 辅助函数
// ============================================================

type ColumnTarget = AnyColumn | SQL;

function getColumnRefId<TTable extends PgTable>(
  columnRef: CrudColumnRef<TTable>,
): string {
  return typeof columnRef === 'string' ? columnRef : columnRef.id;
}

function findColumnRef<TTable extends PgTable>(
  columnId: string,
  allowedColumns: CrudColumnRef<TTable>[] | undefined,
): CrudColumnRef<TTable> | undefined {
  return allowedColumns?.find((columnRef) => getColumnRefId(columnRef) === columnId);
}

function validateColumn<TTable extends PgTable>(
  columnId: string,
  allowedColumns: CrudColumnRef<TTable>[] | undefined,
): boolean {
  if (!allowedColumns || allowedColumns.length === 0) {
    return true;
  }
  return findColumnRef(columnId, allowedColumns) !== undefined;
}

function getTableColumn<TTable extends PgTable>(
  table: TTable,
  columnId: string,
): AnyColumn | undefined {
  return table[columnId as keyof TTable] as AnyColumn | undefined;
}

function normalizeJsonFields(jsonField: string | string[]): string[] {
  return (Array.isArray(jsonField) ? jsonField : [jsonField]).filter(
    (field) => field.length > 0,
  );
}

function buildJsonFieldTextExpression(
  column: AnyColumn,
  jsonField: string | string[],
): SQL {
  const fields = normalizeJsonFields(jsonField);

  if (fields.length === 0) {
    throw new Error(
      '[createCrudRouter] jsonField must include at least one json key.',
    );
  }

  const objectFields = fields.map((field) => sql`${column} ->> ${field}`);

  return sql<string>`case jsonb_typeof(${column})
    when 'object' then coalesce(${sql.join(objectFields, sql`, `)}, '')
    when 'string' then ${column} #>> '{}'
    else ''
  end`;
}

function resolveColumnTarget<TTable extends PgTable>({
  table,
  columnId,
  allowedColumns,
}: {
  table: TTable;
  columnId: string;
  allowedColumns: CrudColumnRef<TTable>[] | undefined;
}): ColumnTarget | undefined {
  const columnRef = findColumnRef(columnId, allowedColumns);

  if ((allowedColumns?.length ?? 0) > 0 && columnRef === undefined) {
    return undefined;
  }

  if (columnRef && typeof columnRef !== 'string') {
    if (columnRef.expression) {
      return columnRef.expression({ table });
    }

    const column = getTableColumn(table, columnRef.id);
    if (!column) return undefined;

    if (columnRef.jsonField) {
      return buildJsonFieldTextExpression(column, columnRef.jsonField);
    }

    return column;
  }

  return getTableColumn(table, columnId);
}

// ============================================================
// createCrudRouter - 类型防火墙版
// ============================================================

/**
 * 创建 CRUD Router
 *
 * 类型安全由各 procedure 的 .output() 保证，
 * 返回类型不携带深层 Drizzle 泛型，避免 TypeScript OOM。
 *
 * @typeParam TTable - Drizzle 表类型
 * @typeParam TContext - 上下文类型（包含 db）
 * @typeParam TSelect - 查询返回类型
 * @typeParam TInsert - 创建输入类型
 * @typeParam TUpdate - 更新输入类型
 */
export function createCrudRouter<
  TTable extends PgTable = PgTable,
  TContext = unknown,
  TSelect = unknown,
  TInsert = unknown,
  TUpdate = unknown,
  TListInput extends ListInput = ListInput,
  TGetInput extends GetInput = GetInput,
  TExportInput extends ExportInput = ExportInput,
>(
  config: CrudRouterConfig<
    TTable,
    TContext,
    TSelect,
    TInsert,
    TUpdate,
    TListInput,
    TGetInput,
    TExportInput
  >,
): CrudRouterReturn {
  const {
    table,
    idField = 'id',
    filterableColumns,
    sortableColumns,
    maxBatchSize = 100,
    maxExportSize = 5000,
    softDelete: softDeleteOption,
    middleware = {},
  } = config;

  // 解析 Schema（自动派生或使用显式传入的）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { selectSchema, schema, updateSchema } = resolveSchemas(
    config as unknown as CrudRouterConfig<TTable>,
  );

  // ===== 构建 output schemas（类型防火墙核心） =====
  // .output() 让 tRPC 使用 Zod schema 推导的输出类型，
  // 而非从 Drizzle 查询实现推导，切断深层泛型链
  const entityOutputSchema = selectSchema;

  const listOutputSchema = z.object({
    data: z.array(selectSchema),
    total: z.number(),
    page: z.number(),
    perPage: z.number(),
    pageCount: z.number(),
  });

  const deleteManyOutputSchema = z.object({ deleted: z.number() });
  const updateManyOutputSchema = z.object({ updated: z.number() });

  const upsertOutputSchema = z.object({
    data: selectSchema,
    isNew: z.boolean(),
  });

  const exportOutputSchema = z.object({
    data: z.array(selectSchema),
    total: z.number(),
    hasMore: z.boolean(),
  });

  const createManyOutputSchema = z.object({
    created: z.array(selectSchema),
    count: z.number(),
  });

  const importOutputSchema = z.object({
    success: z.number(),
    updated: z.number(),
    skipped: z.number(),
    failed: z.array(
      z.object({
        row: z.number(),
        errors: z.array(z.string()),
      }),
    ),
  });

  // 解析配置
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolved = resolveConfig(config as any) as ResolvedConfig<TContext, TSelect>;
  const softDelete = resolveSoftDelete(softDeleteOption);
  const resolvedListInputSchema = (config.listInputSchema ??
    baseListInputSchema) as z.ZodType<TListInput>;
  const resolvedGetInputSchema = config.getInputSchema
    ? (z.union([
        z.string(),
        config.getInputSchema as z.ZodTypeAny,
      ]) as z.ZodType<TGetInput>)
    : (defaultGetInputSchema as unknown as z.ZodType<TGetInput>);
  const resolvedExportInputSchema = (config.exportInputSchema ??
    baseExportInputSchema) as z.ZodType<TExportInput>;

  // 类型断言 - 使用完整泛型
  const m = middleware as CrudMiddleware<
    TContext,
    TSelect,
    TInsert,
    TUpdate,
    TListInput,
    TGetInput,
    TExportInput
  >;

  // 辅助函数
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getIdColumn = () => (table as any)[idField];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getSoftDeleteColumn = () =>
    softDelete ? (table as any)[softDelete.column] : null;

  const buildWhere = (
    ctx: TContext,
    operation: CrudOperation,
    additionalCondition?: SQL,
  ): SQL | undefined => {
    const conditions: SQL[] = [];

    // 用户定义的 scope
    const scopeCondition = resolved.getScope(ctx, table, operation);
    if (scopeCondition) {
      conditions.push(scopeCondition);
    }

    // Major #4: 软删除模式下，所有操作都应该排除已删除记录
    // 这样可以防止更新/删除已软删除的数据
    if (softDelete) {
      const col = getSoftDeleteColumn();
      if (col) {
        conditions.push(isNull(col));
      }
    }

    // 额外条件（如 id = xxx）
    if (additionalCondition) {
      conditions.push(additionalCondition);
    }

    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];
    return and(...conditions);
  };

  const withGuard = async (ctx: TContext, operation: CrudOperation) => {
    if (resolved.guard) {
      // upsert 需要同时具备 create 和 update 权限
      if (operation === 'upsert') {
        const canCreate = await resolved.guard(ctx, 'create');
        const canUpdate = await resolved.guard(ctx, 'update');
        if (!canCreate || !canUpdate) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Forbidden: upsert requires both create and update permissions',
          });
        }
        return;
      }

      const allowed = await resolved.guard(ctx, operation);
      if (!allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Forbidden: ${operation} not allowed`,
        });
      }
    }
  };

  const withAuthorize = async (
    ctx: TContext,
    resource: TSelect | null | undefined,
    operation: CrudOperation,
  ) => {
    if (!resource) return;
    const allowed = await resolved.checkAuthorize(ctx, resource, operation);
    if (!allowed) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Forbidden: Cannot ${operation} this resource`,
      });
    }
  };

  // ========== Procedures 定义 ==========
  const procedures = {
    // 列表查询
    list: resolved
      .procedureFactory('list')
      .input(resolvedListInputSchema)
      .output(listOutputSchema)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .query(
        async ({ ctx, input }: { ctx: TContext & { db: any }; input: TListInput }) => {
          await withGuard(ctx, 'list');

          // 核心查询逻辑
          const doList = async (listInput: ListInput): Promise<ListResult<TSelect>> => {
            const offset = (listInput.page - 1) * listInput.perPage;

            const validatedFilters = listInput.filters?.filter((filter) =>
              validateColumn(filter.id, filterableColumns),
            );

            const filterCondition = validatedFilters?.length
              ? filterColumns({
                  table,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  filters: validatedFilters as any,
                  joinOperator: listInput.joinOperator,
                  resolveColumn: (columnId) =>
                    resolveColumnTarget({
                      table,
                      columnId: String(columnId),
                      allowedColumns: filterableColumns,
                    }),
                })
              : undefined;

            const where = buildWhere(ctx, 'list', filterCondition);

            let query = ctx.db.select().from(table).$dynamic();
            if (where) {
              query = query.where(where);
            }

            if (listInput.sort?.length) {
              const sortField = listInput.sort[0];
              if (sortField && validateColumn(sortField.id, sortableColumns)) {
                const column = resolveColumnTarget({
                  table,
                  columnId: sortField.id,
                  allowedColumns: sortableColumns,
                });
                if (column) {
                  query = query.orderBy(sortField.desc ? desc(column) : asc(column));
                }
              }
            }

            const data = await query.limit(listInput.perPage).offset(offset);

            let countQuery = ctx.db
              .select({ count: sql<number>`count(*)::int` })
              .from(table)
              .$dynamic();
            if (where) {
              countQuery = countQuery.where(where);
            }
            const countResult = await countQuery;
            const count = countResult[0]?.count ?? 0;

            return {
              data,
              total: count,
              page: listInput.page,
              perPage: listInput.perPage,
              pageCount: Math.ceil(count / listInput.perPage),
            };
          };

          const listInput = input;

          // middleware 模式
          if (m.list) {
            return m.list({
              ctx,
              input: listInput,
              next: async (modifiedInput?: TListInput) =>
                doList(modifiedInput ?? listInput),
            });
          }

          return doList(listInput);
        },
      ),

    // 单条查询
    get: resolved
      .procedureFactory('get')
      .input(resolvedGetInputSchema)
      .output(entityOutputSchema.nullable())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .query(
        async ({ ctx, input }: { ctx: TContext & { db: any }; input: TGetInput }) => {
          await withGuard(ctx, 'get');

          // 核心查询逻辑
          const doGet = async (getInput: TGetInput): Promise<TSelect | null> => {
            const id = typeof getInput === 'string' ? getInput : getInput.id;
            const idCondition = eq(getIdColumn(), id);
            const where = buildWhere(ctx, 'get', idCondition);
            const [item] = await ctx.db.select().from(table).where(where!);
            await withAuthorize(ctx, item as TSelect, 'get');
            return (item as TSelect) ?? null;
          };

          const id = typeof input === 'string' ? input : input.id;

          // middleware 模式
          if (m.get) {
            return m.get({
              ctx,
              id,
              input,
              next: async (modifiedInput?: TGetInput) => doGet(modifiedInput ?? input),
            });
          }

          return doGet(input);
        },
      ),

    // 创建
    create: resolved
      .procedureFactory('create')
      .input(schema)
      .output(entityOutputSchema)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mutation(
        async ({ ctx, input }: { ctx: TContext & { db: any }; input: TInsert }) => {
          await withGuard(ctx, 'create');

          // 核心创建逻辑
          const doCreate = async (inputData: TInsert): Promise<TSelect> => {
            const injectData = resolved.getInject(ctx, 'create');
            const data = { ...(inputData as object), ...injectData };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const [created] = await ctx.db
              .insert(table)
              .values(data as any)
              .returning();
            return created as TSelect;
          };

          // middleware 模式
          if (m.create) {
            return m.create({
              ctx,
              input,
              next: async (modifiedInput?: TInsert) => doCreate(modifiedInput ?? input),
            });
          }

          return doCreate(input);
        },
      ),

    // 更新
    update: resolved
      .procedureFactory('update')
      .input(z.object({ id: z.string(), data: updateSchema }))
      .output(entityOutputSchema)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mutation(
        async ({
          ctx,
          input,
        }: {
          ctx: TContext & { db: any };
          input: { id: string; data: TUpdate };
        }) => {
          await withGuard(ctx, 'update');

          const idCondition = eq(getIdColumn(), input.id);
          const where = buildWhere(ctx, 'update', idCondition);

          // 预取资源用于 authorize
          const [existing] = await ctx.db.select().from(table).where(where!);
          await withAuthorize(ctx, existing as TSelect, 'update');

          if (!existing) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Resource not found or access denied',
            });
          }

          // 核心更新逻辑
          const doUpdate = async (updateData: TUpdate): Promise<TSelect> => {
            const injectData = resolved.getInject(ctx, 'update');
            const data = { ...(updateData as object), ...injectData };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const [updated] = await ctx.db
              .update(table)
              .set(data as any)
              .where(where!)
              .returning();
            return updated as TSelect;
          };

          // middleware 模式
          if (m.update) {
            return m.update({
              ctx,
              id: input.id,
              data: input.data,
              existing: existing as TSelect,
              next: async (modifiedData?: TUpdate) =>
                doUpdate(modifiedData ?? input.data),
            });
          }

          return doUpdate(input.data);
        },
      ),

    // 删除（支持软删除）
    delete: resolved
      .procedureFactory('delete')
      .input(z.string())
      .output(entityOutputSchema)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mutation(
        async ({ ctx, input }: { ctx: TContext & { db: any }; input: string }) => {
          await withGuard(ctx, 'delete');

          const idCondition = eq(getIdColumn(), input);
          const where = buildWhere(ctx, 'delete', idCondition);

          const [existing] = await ctx.db.select().from(table).where(where!);
          await withAuthorize(ctx, existing as TSelect, 'delete');

          if (!existing) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Resource not found or access denied',
            });
          }

          // 核心删除逻辑
          const doDelete = async (): Promise<TSelect> => {
            let deleted;
            if (softDelete) {
              [deleted] = await ctx.db
                .update(table)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .set({ [softDelete.column]: softDelete.getValue() } as any)
                .where(where!)
                .returning();
            } else {
              [deleted] = await ctx.db.delete(table).where(where!).returning();
            }
            return deleted as TSelect;
          };

          // middleware 模式
          if (m.delete) {
            return m.delete({
              ctx,
              id: input,
              existing: existing as TSelect,
              next: doDelete,
            });
          }

          return doDelete();
        },
      ),

    // 批量删除（支持软删除）
    // Note: 批量操作仅执行 guard 和 scope 校验，不执行逐条 authorize
    // 如需 ABAC 逐条校验，请使用 middleware 自行实现
    deleteMany: resolved
      .procedureFactory('deleteMany')
      .input(z.array(z.string()).max(maxBatchSize))
      .output(deleteManyOutputSchema)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mutation(
        async ({ ctx, input }: { ctx: TContext & { db: any }; input: string[] }) => {
          await withGuard(ctx, 'deleteMany');

          const idsCondition = inArray(getIdColumn(), input);
          const where = buildWhere(ctx, 'deleteMany', idsCondition);

          // 核心删除逻辑
          // Performance: 只返回 id 以减少数据传输
          const doDeleteMany = async (): Promise<{ deleted: number }> => {
            if (softDelete) {
              const deleted = await ctx.db
                .update(table)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .set({ [softDelete.column]: softDelete.getValue() } as any)
                .where(where!)
                .returning({ id: getIdColumn() });
              return { deleted: deleted.length };
            } else {
              const deleted = await ctx.db
                .delete(table)
                .where(where!)
                .returning({ id: getIdColumn() });
              return { deleted: deleted.length };
            }
          };

          // middleware 模式
          if (m.deleteMany) {
            return m.deleteMany({
              ctx,
              ids: input,
              next: doDeleteMany,
            });
          }

          return doDeleteMany();
        },
      ),

    // 批量更新
    // Note: 批量操作仅执行 guard 和 scope 校验，不执行逐条 authorize
    // 如需 ABAC 逐条校验，请使用 middleware 自行实现
    updateMany: resolved
      .procedureFactory('updateMany')
      .input(
        z.object({
          ids: z.array(z.string()).max(maxBatchSize),
          data: updateSchema,
        }),
      )
      .output(updateManyOutputSchema)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mutation(
        async ({
          ctx,
          input,
        }: {
          ctx: TContext & { db: any };
          input: { ids: string[]; data: TUpdate };
        }) => {
          await withGuard(ctx, 'updateMany');

          const idsCondition = inArray(getIdColumn(), input.ids);
          const where = buildWhere(ctx, 'updateMany', idsCondition);

          // 核心更新逻辑
          // Performance: 只返回 id 以减少数据传输
          const doUpdateMany = async (
            updateData: TUpdate,
          ): Promise<{ updated: number }> => {
            const injectData = resolved.getInject(ctx, 'update');
            const data = { ...(updateData as object), ...injectData };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updated = await ctx.db
              .update(table)
              .set(data as any)
              .where(where!)
              .returning({ id: getIdColumn() });
            return { updated: updated.length };
          };

          // middleware 模式
          if (m.updateMany) {
            return m.updateMany({
              ctx,
              ids: input.ids,
              data: input.data,
              next: async (modifiedData?: TUpdate) =>
                doUpdateMany(modifiedData ?? input.data),
            });
          }

          return doUpdateMany(input.data);
        },
      ),

    // Upsert（存在则更新，不存在则创建）
    upsert: resolved
      .procedureFactory('upsert')
      .input(schema)
      .output(upsertOutputSchema)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mutation(
        async ({ ctx, input }: { ctx: TContext & { db: any }; input: TInsert }) => {
          await withGuard(ctx, 'upsert');

          // 核心 upsert 逻辑
          const doUpsert = async (
            inputData: TInsert,
          ): Promise<{ data: TSelect; isNew: boolean }> => {
            // 先尝试查询是否存在
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const inputId = (inputData as any)[idField];
            let isNew = true;
            let existing: TSelect | null = null;

            if (inputId) {
              const idCondition = eq(getIdColumn(), inputId);
              // 软删除模式下，upsert 也应该排除已删除记录
              const where = buildWhere(ctx, 'get', idCondition);
              const [found] = await ctx.db.select().from(table).where(where!);
              existing = found as TSelect | null;
              isNew = !existing;

              // Critical #1: 如果是更新，执行 authorize 校验
              if (!isNew && existing) {
                await withAuthorize(ctx, existing, 'update');
              }
            }

            // Major #5: 根据 isNew 决定使用 create 还是 update 的 inject
            const injectData = resolved.getInject(ctx, isNew ? 'create' : 'update');
            const data = { ...(inputData as object), ...injectData };

            // 使用 onConflictDoUpdate
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const [result] = await ctx.db
              .insert(table)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .values(data as any)
              .onConflictDoUpdate({
                target: getIdColumn(),
                // 更新时只使用 update 的 inject
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                set: {
                  ...(inputData as object),
                  ...resolved.getInject(ctx, 'update'),
                } as any,
              })
              .returning();

            return { data: result as TSelect, isNew };
          };

          // middleware 模式
          if (m.upsert) {
            return m.upsert({
              ctx,
              input,
              next: async (modifiedInput?: TInsert) => doUpsert(modifiedInput ?? input),
            });
          }

          return doUpsert(input);
        },
      ),

    // 导出（限量查询，无分页）
    export: resolved
      .procedureFactory('export')
      .input(resolvedExportInputSchema)
      .output(exportOutputSchema)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .query(
        async ({ ctx, input }: { ctx: TContext & { db: any }; input: TExportInput }) => {
          await withGuard(ctx, 'export');

          const doExport = async (
            exportInput: ExportInput,
          ): Promise<ExportResult<TSelect>> => {
            const effectiveLimit = Math.min(
              Math.max(exportInput.limit ?? maxExportSize, 1),
              maxExportSize,
            );

            const validatedFilters = exportInput.filters?.filter((filter) =>
              validateColumn(filter.id, filterableColumns),
            );

            const filterCondition = validatedFilters?.length
              ? filterColumns({
                  table,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  filters: validatedFilters as any,
                  joinOperator: exportInput.joinOperator ?? 'and',
                  resolveColumn: (columnId) =>
                    resolveColumnTarget({
                      table,
                      columnId: String(columnId),
                      allowedColumns: filterableColumns,
                    }),
                })
              : undefined;

            const where = buildWhere(ctx, 'export', filterCondition);

            let query = ctx.db.select().from(table).$dynamic();
            if (where) {
              query = query.where(where);
            }

            if (exportInput.sort?.length) {
              const sortField = exportInput.sort[0];
              if (sortField && validateColumn(sortField.id, sortableColumns)) {
                const column = resolveColumnTarget({
                  table,
                  columnId: sortField.id,
                  allowedColumns: sortableColumns,
                });
                if (column) {
                  query = query.orderBy(sortField.desc ? desc(column) : asc(column));
                }
              }
            }

            const data = await query.limit(effectiveLimit);

            // 查询总数以计算 hasMore
            let countQuery = ctx.db
              .select({ count: sql<number>`count(*)::int` })
              .from(table)
              .$dynamic();
            if (where) {
              countQuery = countQuery.where(where);
            }
            const countResult = await countQuery;
            const total = countResult[0]?.count ?? 0;

            return {
              data: data as TSelect[],
              total,
              hasMore: total > data.length,
            };
          };

          const exportInput = input;

          if (m.export) {
            return m.export({
              ctx,
              input: exportInput,
              next: async (modifiedInput?: TExportInput) =>
                doExport(modifiedInput ?? exportInput),
            });
          }

          return doExport(exportInput);
        },
      ),

    // 批量创建
    createMany: resolved
      .procedureFactory('createMany')
      .input(z.array(schema).min(1).max(maxBatchSize))
      .output(createManyOutputSchema)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mutation(
        async ({ ctx, input }: { ctx: TContext & { db: any }; input: TInsert[] }) => {
          await withGuard(ctx, 'createMany');

          const doCreateMany = async (
            items: TInsert[],
          ): Promise<{ created: TSelect[]; count: number }> => {
            const injectData = resolved.getInject(ctx, 'create');
            const values = items.map((item) => ({ ...(item as object), ...injectData }));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const created = await ctx.db
              .insert(table)
              .values(values as any)
              .onConflictDoNothing()
              .returning();
            return { created: created as TSelect[], count: created.length };
          };

          if (m.createMany) {
            return m.createMany({
              ctx,
              input,
              next: async (modifiedInput?: TInsert[]) =>
                doCreateMany(modifiedInput ?? input),
            });
          }

          return doCreateMany(input);
        },
      ),

    // 导入（接受 unknown[] 逐行验证）
    import: resolved
      .procedureFactory('import')
      .input(importInputSchema)
      .output(importOutputSchema)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mutation(
        async ({
          ctx,
          input,
        }: {
          ctx: TContext & { db: any };
          input: z.infer<typeof importInputSchema>;
        }) => {
          await withGuard(ctx, 'import');

          const doImport = async (importData: ImportInput): Promise<ImportResult> => {
            const validRows: TInsert[] = [];
            const failed: ImportResult['failed'] = [];

            // 逐行验证
            for (let i = 0; i < importData.rows.length; i++) {
              const row = importData.rows[i];
              const result = schema.safeParse(row);
              if (result.success) {
                validRows.push(result.data as TInsert);
              } else {
                const errors = result.error.issues.map(
                  (issue) => `${issue.path.join('.')}: ${issue.message}`,
                );
                failed.push({ row: i, errors });

                // onConflict="error" 时遇到验证失败直接中止
                if (importData.onConflict === 'error') {
                  return { success: 0, updated: 0, skipped: 0, failed };
                }
              }
            }

            if (validRows.length === 0) {
              return { success: 0, updated: 0, skipped: 0, failed };
            }

            // 批量插入有效行
            const injectData = resolved.getInject(ctx, 'create');
            const values = validRows.map((row) => ({
              ...(row as object),
              ...injectData,
            }));

            let insertedCount = 0;
            let updatedCount = 0;

            if (importData.onConflict === 'upsert') {
              // upsert: 存在则更新，不存在则新建
              // 先查已存在的 ID 数量，用于区分 insert vs update
              const existingIds = await ctx.db
                .select({ id: getIdColumn() })
                .from(table)
                .where(
                  inArray(
                    getIdColumn(),
                    values.map((v: any) => (v as any)[idField]).filter(Boolean),
                  ),
                );
              const existingCount = existingIds.length;

              // 构建 set: 用 sql`excluded."col"` 引用待插入行的值
              const updateFields = Object.keys(validRows[0] as object);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const setClause: Record<string, any> = {
                // 注入 update 时的额外字段（如 updatedAt）
                ...resolved.getInject(ctx, 'update'),
              };
              for (const key of updateFields) {
                setClause[key] = sql.raw(`excluded."${key}"`);
              }

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const results = await ctx.db
                .insert(table)
                .values(values as any)
                .onConflictDoUpdate({
                  target: getIdColumn(),
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  set: setClause as any,
                })
                .returning({ id: getIdColumn() });

              updatedCount = Math.min(existingCount, results.length);
              insertedCount = results.length - updatedCount;
            } else {
              // skip: 跳过冲突行
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const inserted = await ctx.db
                .insert(table)
                .values(values as any)
                .onConflictDoNothing()
                .returning({ id: getIdColumn() });
              insertedCount = inserted.length;
              updatedCount = 0;
            }

            const skipped = validRows.length - insertedCount - updatedCount;

            return {
              success: insertedCount,
              updated: updatedCount,
              skipped,
              failed,
            };
          };

          const importData = input as ImportInput;

          if (m.import) {
            return m.import({
              ctx,
              input: importData,
              next: async (modifiedInput?: ImportInput) =>
                doImport(modifiedInput ?? importData),
            });
          }

          return doImport(importData);
        },
      ),
  };

  // 返回增强的 router，带有 .procedures 属性
  const crudRouter = router(procedures);
  return Object.assign(crudRouter, { procedures }) as CrudRouterReturn;
}
