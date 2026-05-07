/**
 * Auto-CRUD 配置类型定义 v2.0
 * 统一 API 设计：可组合而非互斥
 * 完整泛型支持：Schema → Config → Middleware → Procedures
 */

import type { SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { z } from 'zod';

// ============================================================
// 基础类型
// ============================================================

export type CrudOperation =
  | 'list'
  | 'get'
  | 'create'
  | 'update'
  | 'delete'
  | 'deleteMany'
  | 'updateMany'
  | 'upsert'
  | 'export'
  | 'import'
  | 'createMany';

export type WriteOperation = 'create' | 'update';

/**
 * 表字段键类型提取
 * 用于 omitFields 的强类型支持
 */
export type TableColumnKeys<T extends PgTable> = keyof T['_']['columns'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyProcedure = any;

// ============================================================
// 软删除配置
// ============================================================

export interface SoftDeleteConfig {
  /** 软删除标记列名 */
  column: string;
  /**
   * 删除时设置的值
   * - 默认: () => new Date()
   * - 可自定义为其他值，如 true（用于 isDeleted 布尔字段）
   */
  value?: () => unknown;
}

/**
 * 软删除配置类型
 * - string: 列名（使用默认值 new Date()）
 * - boolean: true 表示使用默认列名 'deletedAt'
 * - SoftDeleteConfig: 完整配置
 */
export type SoftDeleteOption = string | boolean | SoftDeleteConfig;

// ============================================================
// 通用类型
// ============================================================

/**
 * 列表查询输入类型
 */
export interface ListInput {
  page: number;
  perPage: number;
  sort?: Array<{ id: string; desc: boolean }>;
  filters?: Array<{
    id: string;
    value: string | string[];
    variant: string;
    operator: string;
    filterId: string;
  }>;
  joinOperator: 'and' | 'or';
}

/**
 * 列表查询结果类型
 */
export interface ListResult<TSelect> {
  data: TSelect[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
}

/**
 * 单条查询输入类型
 * - string: 兼容旧的 get(id) 调用
 * - object: 支持通过 getInputSchema 扩展 include 等控制参数
 */
export type GetInput = string | { id: string };

/**
 * 导出查询输入类型（复用 ListInput 的筛选/排序，无分页）
 */
export interface ExportInput {
  sort?: Array<{ id: string; desc: boolean }>;
  filters?: Array<{
    id: string;
    value: string | string[];
    variant: string;
    operator: string;
    filterId: string;
  }>;
  joinOperator?: 'and' | 'or';
  /** 导出数量限制，会被 clamp 到 [1, maxExportSize] */
  limit?: number;
}

/**
 * 导出查询结果类型
 */
export interface ExportResult<TSelect> {
  data: TSelect[];
  total: number;
  /** 是否还有更多数据未导出（total > data.length） */
  hasMore: boolean;
}

/**
 * 导入行失败详情
 */
export interface ImportFailedRow {
  /** 行号（0-indexed） */
  row: number;
  /** 验证错误信息列表 */
  errors: string[];
}

/**
 * 导入结果类型
 */
export interface ImportResult {
  /** 成功新建的行数 */
  success: number;
  /** 更新的行数（onConflict="upsert" 时） */
  updated: number;
  /** 跳过的行数（如重复 ID，onConflict="skip" 时） */
  skipped: number;
  /** 失败的行详情 */
  failed: ImportFailedRow[];
}

/**
 * 导入输入类型
 */
export interface ImportInput {
  /** 待导入的数据行（客户端已解析为对象数组） */
  rows: unknown[];
  /**
   * 冲突处理策略
   * - "skip": 跳过冲突行（默认）
   * - "upsert": 存在则更新，不存在则新建
   * - "error": 冲突行计入失败
   */
  onConflict?: 'skip' | 'upsert' | 'error';
}

// ============================================================
// Middleware 参数类型（导出供 helpers 使用）
// ============================================================

export interface ListMiddlewareParams<
  TContext,
  TSelect,
  TListInput extends ListInput = ListInput,
> {
  ctx: TContext;
  input: TListInput;
  next: (input?: TListInput) => Promise<ListResult<TSelect>>;
}

export interface GetMiddlewareParams<
  TContext,
  TSelect,
  TGetInput extends GetInput = GetInput,
> {
  ctx: TContext;
  id: string;
  input: TGetInput;
  next: (input?: TGetInput) => Promise<TSelect | null>;
}

export interface CreateMiddlewareParams<TContext, TSelect, TInsert> {
  ctx: TContext;
  input: TInsert;
  next: (input?: TInsert) => Promise<TSelect>;
}

export interface UpdateMiddlewareParams<TContext, TSelect, TUpdate> {
  ctx: TContext;
  id: string;
  data: TUpdate;
  existing: TSelect;
  next: (data?: TUpdate) => Promise<TSelect>;
}

export interface DeleteMiddlewareParams<TContext, TSelect> {
  ctx: TContext;
  id: string;
  existing: TSelect;
  next: () => Promise<TSelect>;
}

export interface DeleteManyMiddlewareParams<TContext> {
  ctx: TContext;
  ids: string[];
  next: () => Promise<{ deleted: number }>;
}

export interface UpdateManyMiddlewareParams<TContext, TUpdate> {
  ctx: TContext;
  ids: string[];
  data: TUpdate;
  next: (data?: TUpdate) => Promise<{ updated: number }>;
}

export interface UpsertMiddlewareParams<TContext, TSelect, TInsert> {
  ctx: TContext;
  input: TInsert;
  next: (input?: TInsert) => Promise<{ data: TSelect; isNew: boolean }>;
}

export interface ExportMiddlewareParams<
  TContext,
  TSelect,
  TExportInput extends ExportInput = ExportInput,
> {
  ctx: TContext;
  input: TExportInput;
  next: (input?: TExportInput) => Promise<ExportResult<TSelect>>;
}

export interface ImportMiddlewareParams<TContext> {
  ctx: TContext;
  input: ImportInput;
  next: (input?: ImportInput) => Promise<ImportResult>;
}

export interface CreateManyMiddlewareParams<TContext, TSelect, TInsert> {
  ctx: TContext;
  input: TInsert[];
  next: (input?: TInsert[]) => Promise<{ created: TSelect[]; count: number }>;
}

// ============================================================
// 操作包装器（Middleware 模式）- 完整泛型支持
// ============================================================

/**
 * 操作包装器 - 类似 tRPC middleware 的 next 模式
 *
 * 功能：
 * - 修改输入数据（传参给 next）
 * - 修改返回值（处理 next 的结果）
 * - 执行副作用（日志、通知、审计）
 * - 条件拦截（不调用 next 直接返回/抛错）
 * - 包装事务（try/catch 包裹 next）
 *
 * @typeParam TContext - 上下文类型
 * @typeParam TSelect - 查询返回类型（从 selectSchema 推断）
 * @typeParam TInsert - 创建输入类型（从 insertSchema 推断）
 * @typeParam TUpdate - 更新输入类型（从 updateSchema 推断）
 *
 * @example
 * // 修改输入 + 执行副作用
 * middleware: {
 *   create: async ({ ctx, input, next }) => {
 *     const data = { ...input, slug: slugify(input.title) };
 *     const result = await next(data);
 *     await sendNotification(result);
 *     return result;
 *   },
 * }
 */
export interface CrudMiddleware<
  TContext = unknown,
  TSelect = unknown,
  TInsert = unknown,
  TUpdate = unknown,
  TListInput extends ListInput = ListInput,
  TGetInput extends GetInput = GetInput,
  TExportInput extends ExportInput = ExportInput,
> {
  /**
   * 列表查询包装器
   */
  list?: (
    params: ListMiddlewareParams<TContext, TSelect, TListInput>,
  ) => Promise<ListResult<TSelect>>;

  /**
   * 单条查询包装器
   */
  get?: (
    params: GetMiddlewareParams<TContext, TSelect, TGetInput>,
  ) => Promise<TSelect | null>;

  /**
   * 创建包装器
   */
  create?: (
    params: CreateMiddlewareParams<TContext, TSelect, TInsert>,
  ) => Promise<TSelect>;

  /**
   * 更新包装器
   * existing: 更新前的记录
   */
  update?: (
    params: UpdateMiddlewareParams<TContext, TSelect, TUpdate>,
  ) => Promise<TSelect>;

  /**
   * 删除包装器
   * existing: 删除前的记录
   */
  delete?: (params: DeleteMiddlewareParams<TContext, TSelect>) => Promise<TSelect>;

  /**
   * 批量删除包装器
   */
  deleteMany?: (
    params: DeleteManyMiddlewareParams<TContext>,
  ) => Promise<{ deleted: number }>;

  /**
   * 批量更新包装器
   */
  updateMany?: (
    params: UpdateManyMiddlewareParams<TContext, TUpdate>,
  ) => Promise<{ updated: number }>;

  /**
   * Upsert 包装器
   * isNew: 是否为新建（冲突检测后）
   */
  upsert?: (
    params: UpsertMiddlewareParams<TContext, TSelect, TInsert>,
  ) => Promise<{ data: TSelect; isNew: boolean }>;

  /**
   * 导出包装器
   * 可用于审计日志、限流、异步队列调度
   */
  export?: (
    params: ExportMiddlewareParams<TContext, TSelect, TExportInput>,
  ) => Promise<ExportResult<TSelect>>;

  /**
   * 导入包装器
   * 可用于审计日志、限流、异步队列调度
   */
  import?: (params: ImportMiddlewareParams<TContext>) => Promise<ImportResult>;

  /**
   * 批量创建包装器
   */
  createMany?: (
    params: CreateManyMiddlewareParams<TContext, TSelect, TInsert>,
  ) => Promise<{ created: TSelect[]; count: number }>;
}

// ============================================================
// Procedure 配置类型（统一 API）
// ============================================================

/**
 * Procedure 映射对象
 * 按操作指定不同的 procedure，支持 default 回退
 */
export interface ProcedureMap {
  list?: AnyProcedure;
  get?: AnyProcedure;
  create?: AnyProcedure;
  update?: AnyProcedure;
  delete?: AnyProcedure;
  deleteMany?: AnyProcedure;
  updateMany?: AnyProcedure;
  upsert?: AnyProcedure;
  export?: AnyProcedure;
  import?: AnyProcedure;
  createMany?: AnyProcedure;
  /** 未指定操作时的默认 procedure */
  default?: AnyProcedure;
}

/**
 * Procedure 工厂函数
 * 根据操作类型动态返回 procedure
 */
export type ProcedureFactory = (operation: CrudOperation) => AnyProcedure;

/**
 * 统一的 Procedure 配置
 * 支持三种形式：
 * 1. 单一 procedure - 所有操作共用
 * 2. 对象映射 - 按操作指定
 * 3. 工厂函数 - 动态生成
 *
 * @example
 * // 形式 1：单一 procedure
 * procedure: protectedProcedure
 *
 * // 形式 2：对象映射（推荐常用场景）
 * procedure: {
 *   list: publicProcedure,
 *   get: publicProcedure,
 *   create: editorProcedure,
 *   delete: adminProcedure,
 *   default: protectedProcedure,
 * }
 *
 * // 形式 3：工厂函数（适合复杂逻辑）
 * procedure: (op) => {
 *   if (['list', 'get'].includes(op)) return publicProcedure;
 *   return protectedProcedure.meta({ permission: { action: op, subject: 'Task' } });
 * }
 */
export type ProcedureConfig = AnyProcedure | ProcedureMap | ProcedureFactory;

// ============================================================
// 统一配置类型（v2.0）
// ============================================================

/**
 * CRUD Router 配置
 *
 * v2.0 统一 API 设计：
 * - 所有配置项可自由组合，无互斥模式
 * - procedure 支持多种形式（单一/映射/工厂）
 * - guard/scope/authorize 可与任意 procedure 形式组合
 *
 * @example
 * // 简单场景：公开读，保护写
 * createCrudRouter({
 *   table: posts,
 *   insertSchema,
 *   updateSchema,
 *   procedure: {
 *     list: publicProcedure,
 *     get: publicProcedure,
 *     default: protectedProcedure,
 *   },
 * })
 *
 * // 复杂场景：自定义 procedure + 行级安全
 * createCrudRouter({
 *   table: posts,
 *   insertSchema,
 *   updateSchema,
 *   procedure: adminProcedure,
 *   scope: (ctx, table) => eq(table.tenantId, ctx.user.tenantId),
 *   authorize: (ctx, resource) => resource.ownerId === ctx.user.id,
 * })
 */
export interface CrudRouterConfig<
  TTable extends PgTable = PgTable,
  TContext = unknown,
  TSelect = unknown,
  TInsert = unknown,
  TUpdate = unknown,
  TListInput extends ListInput = ListInput,
  TGetInput extends GetInput = GetInput,
  TExportInput extends ExportInput = ExportInput,
> {
  // ========== 必填配置 ==========

  /** Drizzle 表定义 */
  table: TTable;

  // ========== Schema 配置 ==========

  /**
   * 主 Schema（用于 create/upsert 输入验证）
   * - 如果不传，自动从 table 派生并排除 omitFields
   * - updateSchema 默认为 schema.partial().refine(nonEmpty)
   *
   * @example
   * // 自动派生
   * createCrudRouter({ table: tasks })
   *
   * // 显式传入
   * createCrudRouter({ table: tasks, schema: taskSchema })
   */
  schema?: z.ZodType<TInsert>;

  /**
   * 更新输入 Schema（可选）
   * - 如果不传，自动从 schema.partial() 派生
   * - 传入时覆盖自动派生
   *
   * @example
   * createCrudRouter({
   *   table: tasks,
   *   schema: taskSchema,
   *   updateSchema: customUpdateSchema,  // 覆盖自动派生
   * })
   */
  updateSchema?: z.ZodType<TUpdate>;

  /** 查询返回 Schema */
  selectSchema?: z.ZodType<TSelect>;

  /**
   * 列表查询输入 Schema（可选）
   * - 默认使用内置基础列表输入：page、perPage、sort、filters、joinOperator
   * - 业务侧可以基于 baseListInputSchema.extend(...) 增加自定义参数
   * - 默认查询逻辑只读取基础字段，额外字段会保留给 middleware.list 使用
   *
   * @example
   * listInputSchema: baseListInputSchema.extend({
   *   include: z.object({ skus: z.boolean().optional() }).optional(),
   * })
   */
  listInputSchema?: z.ZodType<TListInput>;

  /**
   * 单条查询输入 Schema（可选）
   * - 默认兼容 get(id) 和 get({ id })
   * - 业务侧可以基于 baseGetInputSchema.extend(...) 增加 include 等控制参数
   * - 配置后仍保留 get(id) 字符串调用兼容性
   * - 默认查询逻辑只读取 id，额外字段会保留给 middleware.get 使用
   */
  getInputSchema?: z.ZodType<Extract<TGetInput, { id: string }>>;

  /**
   * 导出查询输入 Schema（可选）
   * - 默认使用内置基础导出输入：sort、filters、joinOperator、limit
   * - 业务侧可以基于 baseExportInputSchema.extend(...) 增加自定义参数
   * - 默认查询逻辑只读取基础字段，额外字段会保留给 middleware.export 使用
   */
  exportInputSchema?: z.ZodType<TExportInput>;

  /**
   * Procedure 配置（统一字段）
   *
   * 支持三种形式：
   * 1. 单一 procedure - 所有操作共用
   * 2. 对象映射 - 按操作指定（推荐）
   * 3. 工厂函数 - 动态生成
   *
   * 默认: publicProcedure
   */
  procedure?: ProcedureConfig;

  // ========== 权限控制（可与 procedure 组合） ==========

  /**
   * 操作级守卫（RBAC）
   * 在 scope 之前执行，快速拒绝无权限请求
   *
   * @example
   * guard: (ctx, op) => op === 'delete' ? ctx.user.role === 'admin' : true
   */
  guard?: (ctx: TContext, operation: CrudOperation) => boolean | Promise<boolean>;

  /**
   * 行级过滤（RLS）
   * 返回 SQL 条件，自动注入到 WHERE 子句
   *
   * @example
   * scope: (ctx, table) => eq(table.tenantId, ctx.user.tenantId)
   */
  scope?: (ctx: TContext, table: PgTable, operation: CrudOperation) => SQL | undefined;

  /**
   * 强制注入字段（写入时）
   * 返回的字段会强制覆盖用户输入（防止伪造）
   *
   * @example
   * inject: (ctx) => ({ tenantId: ctx.user.tenantId, createdBy: ctx.user.id })
   */
  inject?: (ctx: TContext, operation: WriteOperation) => Record<string, unknown>;

  /**
   * 资源级检查（ABAC）
   * 在 get/update/delete 时，预取资源后调用
   *
   * @example
   * authorize: (ctx, resource, op) => resource.ownerId === ctx.user.id
   */
  authorize?: (
    ctx: TContext,
    resource: TSelect,
    operation: CrudOperation,
  ) => boolean | Promise<boolean>;

  // ========== 其他配置 ==========

  /**
   * 要从 schema 排除的字段（自动派生时使用）
   * @default ["id", "createdAt", "updatedAt"]
   */
  omitFields?: TableColumnKeys<TTable>[];

  /** ID 字段名，默认 "id" */
  idField?: string;
  /** 可过滤的列白名单 */
  filterableColumns?: string[];
  /** 可排序的列白名单 */
  sortableColumns?: string[];
  /** 批量操作的最大数量限制，默认 100 */
  maxBatchSize?: number;

  /**
   * 导出数量上限，默认 5000
   * 超过此数量时 export 路由返回 hasMore=true
   * 消费端可通过 middleware.export 接入异步队列处理大量数据
   */
  maxExportSize?: number;

  /**
   * 软删除配置
   * 开启后：
   * - delete 操作 → UPDATE ... SET {column} = {value}
   * - deleteMany 操作 → UPDATE ... SET {column} = {value} WHERE id IN (...)
   * - list/get 操作 → 自动添加 WHERE {column} IS NULL
   *
   * @example
   * // 使用默认列名 'deletedAt'
   * softDelete: true
   *
   * // 指定列名
   * softDelete: 'deletedAt'
   *
   * // 完整配置（用于布尔字段）
   * softDelete: { column: 'isDeleted', value: () => true }
   */
  softDelete?: SoftDeleteOption;

  /**
   * 操作中间件
   * 类似 tRPC middleware 的 next 模式，完全控制操作流程
   *
   * @example
   * // 完整控制
   * middleware: {
   *   create: async ({ ctx, input, next }) => {
   *     const data = { ...input, slug: slugify(input.title) };
   *     const result = await next(data);
   *     await sendNotification(result);
   *     return result;
   *   },
   * }
   *
   * @example
   * // 使用工具函数简化
   * import { afterMiddleware, beforeMiddleware } from "@wordrhyme/auto-crud-server";
   *
   * middleware: {
   *   create: afterMiddleware(async (ctx, result) => {
   *     await sendEmail(result);
   *   }),
   *   update: beforeMiddleware(async (ctx, data) => {
   *     return { ...data, updatedAt: new Date() };
   *   }),
   * }
   */
  middleware?: CrudMiddleware<
    TContext,
    TSelect,
    TInsert,
    TUpdate,
    TListInput,
    TGetInput,
    TExportInput
  >;
}

// ============================================================
// Procedures 返回类型（用于 createCrudRouter 返回类型）
// ============================================================

export interface CrudProcedures {
  list: AnyProcedure;
  get: AnyProcedure;
  create: AnyProcedure;
  update: AnyProcedure;
  delete: AnyProcedure;
  deleteMany: AnyProcedure;
  updateMany: AnyProcedure;
  upsert: AnyProcedure;
  export: AnyProcedure;
  import: AnyProcedure;
  createMany: AnyProcedure;
}
