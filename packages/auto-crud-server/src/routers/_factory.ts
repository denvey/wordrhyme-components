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
import {
  eq,
  sql,
  inArray,
  asc,
  desc,
  and,
  or,
  isNull,
  getTableColumns,
} from 'drizzle-orm';
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
  CrudExtensionFilter,
  CrudExtensionsConfig,
  CrudExtensionsProvider,
} from '../types/config';

// Re-export types for backward compatibility
export type {
  CrudColumnConfig,
  CrudColumnExpression,
  CrudColumnRef,
  CrudExtensionFilter,
  CrudExtensionMetadata,
  CrudExtensionsConfig,
  CrudExtensionsProvider,
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

type CrudExtensionConfigRef<TContext = unknown> = {
  id?: string;
  extensions?: CrudExtensionsConfig<TContext>;
};

type CrudLifecycleOperation = 'create' | 'update' | 'delete' | 'upsert';

type CrudLifecycleHooks = {
  emit: <T>(
    hookId: string,
    data: T,
    options?: {
      mode?: 'event' | 'pipe' | 'effect';
      dispatch?: 'auto' | 'command' | 'hook';
      tx?: unknown;
    },
  ) => Promise<T>;
};

function normalizePluginRouteId(pluginId: string): string {
  return pluginId.replace(/^com\.wordrhyme\./, '').replace(/\./g, '-');
}

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
function isProcedureLike(config: unknown): boolean {
  if (!config || typeof config !== 'object') return false;

  const candidate = config as Record<string, unknown>;
  return ['input', 'output', 'query', 'mutation', 'use'].some(
    (key) => typeof candidate[key] === 'function',
  );
}

function isProcedureMap(config: ProcedureConfig | undefined): config is ProcedureMap {
  if (!config) return false;
  if (typeof config === 'function') return false;
  if (isProcedureLike(config)) return false;
  // 检查是否是对象且包含已知的操作键
  if (typeof config === 'object' && config !== null) {
    const keys = Object.keys(config);
    const validKeys = [
      'meta',
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

function resolveMetaProcedure(
  config: ProcedureConfig | undefined,
  fallback: AnyProcedure,
): AnyProcedure {
  return isProcedureMap(config) ? (config.meta ?? fallback) : fallback;
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
  search: z.string().trim().optional(),
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
  search: z.string().trim().optional(),
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

function shouldEnableCrudExtensionSchema<TContext>(
  config: CrudExtensionConfigRef<TContext>,
): boolean {
  return Boolean(config.id) && config.extensions !== false;
}

function withCrudExtensionInput<TContext>(
  schema: z.ZodTypeAny,
  config: CrudExtensionConfigRef<TContext>,
): z.ZodTypeAny {
  if (!shouldEnableCrudExtensionSchema(config) || !isZodObject(schema)) {
    return schema;
  }
  return schema.passthrough();
}

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

    schema = (rawSchema as z.ZodObject<z.ZodRawShape>).omit(omitConfig);
  }

  schema = withCrudExtensionInput(schema, config) as z.ZodObject<z.ZodRawShape>;

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
  const updateSchema = (
    config.updateSchema
      ? withCrudExtensionInput(config.updateSchema, config)
      : schema.partial().refine(nonEmpty, {
          message: 'Update payload cannot be empty. At least one field is required.',
        })
  ) as z.ZodTypeAny;

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
    throw new Error('[createCrudRouter] jsonField must include at least one json key.');
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

const CRUD_EXTENSION_FILTER_ID = 'auto-crud-extension-filter';
const NO_CRUD_EXTENSION_MATCH = '__auto_crud_no_crud_extension_match__';

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCrudExtensionIdFilter(
  filter: { id: string; filterId?: string },
  idField: string,
): boolean {
  return filter.id === idField && filter.filterId === CRUD_EXTENSION_FILTER_ID;
}

function readCrudTarget(config: { id?: string }): { id: string } | null {
  const id = config.id;
  if (!id) return null;
  return { id };
}

function buildCrudLifecycleHookId<TContext>(
  config: CrudExtensionConfigRef<TContext>,
  operation: CrudLifecycleOperation,
  ctx?: TContext,
): string | null {
  const target = readCrudTarget(config);
  if (!target) return null;

  const pluginId = (ctx as { pluginId?: unknown } | undefined)?.pluginId;
  if (typeof pluginId === 'string' && target.id.startsWith(`${pluginId}.`)) {
    const resourceId = target.id.slice(pluginId.length + 1);
    if (resourceId) {
      return `${normalizePluginRouteId(pluginId)}.${resourceId}.${operation}`;
    }
  }

  return `${target.id}.${operation}`;
}

function getCrudLifecycleHooks(ctx: unknown): CrudLifecycleHooks | null {
  const hooks = (ctx as { hooks?: CrudLifecycleHooks | null })?.hooks;
  return typeof hooks?.emit === 'function' ? hooks : null;
}

function shouldWrapCrudLifecycleTransaction<TContext>(
  ctx: TContext,
  config: CrudExtensionConfigRef<TContext>,
): boolean {
  return Boolean(
    buildCrudLifecycleHookId(config, 'create', ctx) && getCrudLifecycleHooks(ctx),
  );
}

async function emitCrudWriteLifecycle<TContext>(
  ctx: TContext,
  config: CrudExtensionConfigRef<TContext>,
  operation: CrudLifecycleOperation,
  payload: Record<string, unknown>,
): Promise<void> {
  const hookId = buildCrudLifecycleHookId(config, operation, ctx);
  const hooks = getCrudLifecycleHooks(ctx);
  if (!hookId || !hooks) return;

  await hooks.emit(hookId, payload, {
    dispatch: 'hook',
    mode: 'effect',
    tx: (ctx as { tx?: unknown })?.tx,
  });
}

function resolveCrudExtensions<TContext>(
  ctx: TContext,
  config: CrudExtensionConfigRef<TContext>,
): CrudExtensionsProvider | null {
  const extensions = config.extensions;
  if (extensions === false) return null;

  if (typeof extensions === 'function') {
    return extensions(ctx) ?? null;
  }

  if (extensions) return extensions;
  if (!config.id) return null;

  return (
    (ctx as { crudExtensions?: CrudExtensionsProvider | null })?.crudExtensions ?? null
  );
}

function getTableColumnNames<TTable extends PgTable>(table: TTable): Set<string> {
  try {
    const columns = getTableColumns(table) as Record<string, unknown>;
    const names = Object.keys(columns);
    if (names.length > 0) return new Set(names);
  } catch {
    // Unit-test mocks and custom table-like objects may not carry Drizzle's symbols.
  }

  return new Set(
    Object.keys(table as Record<string, unknown>).filter((key) => !key.startsWith('_')),
  );
}

type SplitCrudExtensionInput<TInput> = {
  data: TInput;
  rawValues: Record<string, unknown>;
  baseValues: Record<string, unknown>;
  extraValues: Record<string, unknown> | null;
};

function splitCrudExtensionWriteInput<TInput>(
  inputData: TInput,
  tableColumnNames: Set<string>,
): SplitCrudExtensionInput<TInput> {
  if (!isObjectRecord(inputData)) {
    return {
      data: inputData,
      rawValues: {},
      baseValues: {},
      extraValues: null,
    };
  }

  const baseValues: Record<string, unknown> = {};
  const extraValues: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(inputData)) {
    if (key === 'ext') {
      if (isObjectRecord(value)) {
        Object.assign(extraValues, value);
      }
      continue;
    }

    if (tableColumnNames.has(key)) {
      baseValues[key] = value;
    } else {
      extraValues[key] = value;
    }
  }

  return {
    data: baseValues as TInput,
    rawValues: inputData,
    baseValues,
    extraValues: Object.keys(extraValues).length > 0 ? extraValues : null,
  };
}

async function saveCrudExtraValues<TContext>(
  ctx: TContext,
  config: CrudExtensionConfigRef<TContext>,
  entityId: unknown,
  input: SplitCrudExtensionInput<unknown>,
) {
  const target = readCrudTarget(config);
  const extraValues = input.extraValues;
  if (!target || !extraValues) return;
  if (entityId === null || entityId === undefined || String(entityId).length === 0) {
    return;
  }

  const provider = resolveCrudExtensions(ctx, config);
  if (!provider?.saveExtraValues) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'CRUD extension persistence is not available',
    });
  }

  await provider.saveExtraValues({
    id: target.id,
    entityId: String(entityId),
    rawValues: input.rawValues,
    baseValues: input.baseValues,
    extraValues,
    tx: (ctx as { tx?: unknown })?.tx,
  });
}

async function runCrudExtensionWriteTransaction<TContext extends { db: any }, TResult>(
  ctx: TContext,
  config: CrudExtensionConfigRef<TContext>,
  input: SplitCrudExtensionInput<unknown>,
  operation: (ctx: TContext & { tx?: unknown }) => Promise<TResult>,
): Promise<TResult> {
  if (
    (input.extraValues || shouldWrapCrudLifecycleTransaction(ctx, config)) &&
    (ctx as { tx?: unknown }).tx === undefined &&
    typeof ctx.db?.transaction === 'function'
  ) {
    return ctx.db.transaction((tx: unknown) =>
      operation({
        ...ctx,
        db: tx,
        tx,
      } as TContext & { tx?: unknown }),
    );
  }

  return operation(ctx as TContext & { tx?: unknown });
}

function assertCrudExtraValuesWritable<TContext>(
  ctx: TContext,
  config: CrudExtensionConfigRef<TContext>,
  input: SplitCrudExtensionInput<unknown>,
) {
  const target = readCrudTarget(config);
  if (!target || !input.extraValues) return;

  const provider = resolveCrudExtensions(ctx, config);
  if (!provider?.saveExtraValues) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'CRUD extension persistence is not available',
    });
  }
}

function assertCrudExtraValuesWritableForRows<TContext>(
  ctx: TContext,
  config: CrudExtensionConfigRef<TContext>,
  inputs: Array<SplitCrudExtensionInput<unknown>>,
) {
  if (inputs.some((input) => input.extraValues)) {
    assertCrudExtraValuesWritable(
      ctx,
      config,
      inputs.find((input) => input.extraValues)!,
    );
  }
}

async function saveCrudExtraValuesForRows<TContext>(
  ctx: TContext,
  config: CrudExtensionConfigRef<TContext>,
  idField: string,
  results: Array<Record<string, unknown>>,
  inputs: Array<SplitCrudExtensionInput<unknown>>,
) {
  const inputsWithExtra = inputs.filter((input) => input.extraValues);
  if (inputsWithExtra.length === 0) return;

  const extraByInputId = new Map<string, SplitCrudExtensionInput<unknown>>();
  for (const input of inputs) {
    if (!input.extraValues || !isObjectRecord(input.data)) continue;

    const inputId = input.data[idField];
    if (inputId !== null && inputId !== undefined) {
      extraByInputId.set(String(inputId), input);
    }
  }

  const canUseIndexFallback = results.length === inputs.length;
  const hasUnidentifiedExtraInput = inputsWithExtra.some((input) => {
    if (!isObjectRecord(input.data)) return true;
    const inputId = input.data[idField];
    return inputId === null || inputId === undefined || String(inputId).length === 0;
  });

  if (!canUseIndexFallback && hasUnidentifiedExtraInput) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message:
        'Cannot persist CRUD extension values because inserted rows cannot be matched to input rows. Provide stable ids or avoid partial-conflict batch writes.',
    });
  }

  await Promise.all(
    results.map((result, index) => {
      const resultId = result[idField];
      const fallbackInput = canUseIndexFallback ? inputs[index] : undefined;
      const fallbackInputId =
        fallbackInput && isObjectRecord(fallbackInput.data)
          ? fallbackInput.data[idField]
          : undefined;
      const entityId =
        resultId !== null && resultId !== undefined ? resultId : fallbackInputId;
      const input =
        entityId !== null && entityId !== undefined
          ? (extraByInputId.get(String(entityId)) ?? fallbackInput)
          : fallbackInput;

      if (!input?.extraValues) return Promise.resolve();

      if (entityId === null || entityId === undefined || String(entityId).length === 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message:
            'Cannot persist CRUD extension values because the created entity id is unavailable.',
        });
      }

      return saveCrudExtraValues(ctx, config, entityId, input);
    }),
  );
}

function createCrudBatchTransactionInput(
  inputs: Array<SplitCrudExtensionInput<unknown>>,
): SplitCrudExtensionInput<unknown> {
  return {
    data: {},
    rawValues: {},
    baseValues: {},
    extraValues: inputs.some((input) => input.extraValues) ? {} : null,
  };
}

function readProjectionDisplay(value: unknown): unknown {
  if (!isObjectRecord(value)) return value;
  if ('display' in value && value.display !== null && value.display !== undefined) {
    return value.display;
  }
  if ('value' in value) return value.value;
  return value;
}

async function enrichCrudRows<TContext, TRow extends Record<string, unknown>>(
  ctx: TContext,
  config: CrudExtensionConfigRef<TContext>,
  idField: string,
  rows: TRow[],
): Promise<TRow[]> {
  const target = readCrudTarget(config);
  if (!target || rows.length === 0) return rows;

  const provider = resolveCrudExtensions(ctx, config);
  if (!provider?.readProjection) return rows;

  const entityIds = rows
    .map((row) => row[idField])
    .filter(
      (id): id is string | number =>
        (typeof id === 'string' && id.length > 0) || typeof id === 'number',
    )
    .map(String);
  if (entityIds.length === 0) return rows;

  const projections = await provider.readProjection({
    id: target.id,
    entityIds,
  });

  return rows.map((row) => {
    const rowId = row[idField];
    const projected =
      rowId !== null && rowId !== undefined ? projections[String(rowId)] : undefined;
    if (!projected || Object.keys(projected).length === 0) return row;

    return {
      ...row,
      ...Object.fromEntries(
        Object.entries(projected).map(([field, value]) => [
          field,
          readProjectionDisplay(value),
        ]),
      ),
    };
  });
}

function isAllowedBaseCrudColumn<TTable extends PgTable>(
  table: TTable,
  columnId: string,
  allowedColumns: CrudColumnRef<TTable>[] | undefined,
): boolean {
  if (allowedColumns && allowedColumns.length > 0) {
    return (
      resolveColumnTarget({
        table,
        columnId,
        allowedColumns,
      }) !== undefined
    );
  }
  return getTableColumn(table, columnId) !== undefined;
}

function isKnownBaseCrudColumn<TTable extends PgTable>(
  table: TTable,
  columnId: string,
  allowedColumns: CrudColumnRef<TTable>[] | undefined,
): boolean {
  return (
    getTableColumn(table, columnId) !== undefined ||
    findColumnRef(columnId, allowedColumns) !== undefined
  );
}

async function applyCrudExtensionFilters<TTable extends PgTable, TContext>(
  ctx: TContext,
  config: CrudExtensionConfigRef<TContext>,
  table: TTable,
  idField: string,
  filterableColumns: CrudColumnRef<TTable>[] | undefined,
  searchColumns: CrudColumnRef<TTable>[] | undefined,
  input: ListInput | ExportInput,
): Promise<ListInput | ExportInput> {
  const target = readCrudTarget(config);
  const filters = input.filters ?? [];
  const search = typeof input.search === 'string' ? input.search.trim() : '';
  if (!target || (filters.length === 0 && !search)) return input;

  const baseFilters: typeof filters = [];
  const extensionFilters: typeof filters = [];
  for (const filter of filters) {
    if (isAllowedBaseCrudColumn(table, filter.id, filterableColumns)) {
      baseFilters.push(filter);
    } else if (isKnownBaseCrudColumn(table, filter.id, filterableColumns)) {
      continue;
    } else {
      extensionFilters.push(filter);
    }
  }

  if (extensionFilters.length === 0 && !search) {
    return { ...input, filters: baseFilters };
  }

  const provider = resolveCrudExtensions(ctx, config);

  const matchedSets: Array<Set<string>> = [];
  if (extensionFilters.length > 0) {
    if (!provider?.matchEntityIds) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'CRUD extension filtering is not available',
      });
    }

    const matchedIds = await provider.matchEntityIds({
      id: target.id,
      filters: extensionFilters as CrudExtensionFilter[],
      joinOperator: input.joinOperator,
      limit: 5000,
    });
    matchedSets.push(new Set(matchedIds));
  }

  if (search && provider?.searchEntityIds) {
    const matchedIds = await provider.searchEntityIds({
      id: target.id,
      search,
      limit: 5000,
    });
    matchedSets.push(new Set(matchedIds));
  } else if (search && !buildCrudSearchCondition({ table, search, searchColumns })) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'CRUD search is not available',
    });
  }

  if (matchedSets.length === 0) {
    return { ...input, filters: baseFilters };
  }

  let matchedIds = matchedSets[0] ? [...matchedSets[0]] : [];
  for (const set of matchedSets.slice(1)) {
    matchedIds = matchedIds.filter((id) => set.has(id));
  }

  return {
    ...input,
    filters: [
      ...baseFilters,
      {
        id: idField,
        value: matchedIds.length > 0 ? matchedIds : [NO_CRUD_EXTENSION_MATCH],
        variant: 'multiSelect',
        operator: 'inArray',
        filterId: CRUD_EXTENSION_FILTER_ID,
      },
    ],
  };
}

function buildCrudSearchCondition<TTable extends PgTable>({
  table,
  search,
  searchColumns,
}: {
  table: TTable;
  search: string | undefined;
  searchColumns: CrudColumnRef<TTable>[] | undefined;
}): SQL | undefined {
  const term = typeof search === 'string' ? search.trim() : '';
  if (!term || !searchColumns || searchColumns.length === 0) return undefined;

  const conditions = searchColumns
    .map((columnRef) =>
      resolveColumnTarget({
        table,
        columnId: getColumnRefId(columnRef),
        allowedColumns: searchColumns,
      }),
    )
    .filter((column): column is ColumnTarget => column !== undefined)
    .map((column) => sql`${column}::text ilike ${`%${term}%`}`);

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return or(...conditions);
}

function combineConditions(...conditions: Array<SQL | undefined>): SQL | undefined {
  const filtered = conditions.filter(
    (condition): condition is SQL => condition !== undefined,
  );
  if (filtered.length === 0) return undefined;
  if (filtered.length === 1) return filtered[0];
  return and(...filtered);
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
    searchColumns,
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
  const entityOutputSchema = withCrudExtensionInput(selectSchema, config) as z.ZodTypeAny;

  const listOutputSchema = z.object({
    data: z.array(entityOutputSchema),
    total: z.number(),
    page: z.number(),
    perPage: z.number(),
    pageCount: z.number(),
  });
  const metadataOutputSchema = z.object({
    schema: z.unknown().optional(),
    fields: z.record(z.string(), z.unknown()).optional(),
    errors: z.array(z.string()).optional(),
  });

  const deleteManyOutputSchema = z.object({ deleted: z.number() });
  const updateManyOutputSchema = z.object({ updated: z.number() });

  const upsertOutputSchema = z.object({
    data: selectSchema,
    isNew: z.boolean(),
  });

  const exportOutputSchema = z.object({
    data: z.array(entityOutputSchema),
    total: z.number(),
    hasMore: z.boolean(),
  });

  const createManyOutputSchema = z.object({
    created: z.array(entityOutputSchema),
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
  const metaProcedure = resolveMetaProcedure(
    config.procedure,
    resolved.procedureFactory('list'),
  );
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
  const tableColumnNames = getTableColumnNames(table);
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
    meta: metaProcedure
      .output(metadataOutputSchema)
      .query(async ({ ctx }: { ctx: TContext }) => {
        await withGuard(ctx, 'list');

        const target = readCrudTarget(config);
        if (!target) return {};

        const provider = resolveCrudExtensions(ctx, config);
        if (!provider?.getMetadata) return {};

        return provider.getMetadata({ id: target.id });
      }),

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
            const effectiveInput = (await applyCrudExtensionFilters(
              ctx,
              config,
              table,
              idField,
              filterableColumns,
              searchColumns,
              listInput,
            )) as ListInput;
            const offset = (effectiveInput.page - 1) * effectiveInput.perPage;

            const validatedFilters = effectiveInput.filters?.filter(
              (filter) =>
                isCrudExtensionIdFilter(filter, idField) ||
                validateColumn(filter.id, filterableColumns),
            );

            const filterCondition = validatedFilters?.length
              ? filterColumns({
                  table,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  filters: validatedFilters as any,
                  joinOperator: effectiveInput.joinOperator,
                  resolveColumn: (columnId) => {
                    const id = String(columnId);
                    if (id === idField) return getTableColumn(table, idField);
                    return resolveColumnTarget({
                      table,
                      columnId: id,
                      allowedColumns: filterableColumns,
                    });
                  },
                })
              : undefined;

            const searchCondition = buildCrudSearchCondition({
              table,
              search: effectiveInput.search,
              searchColumns,
            });
            const where = buildWhere(
              ctx,
              'list',
              combineConditions(filterCondition, searchCondition),
            );

            let query = ctx.db.select().from(table).$dynamic();
            if (where) {
              query = query.where(where);
            }

            if (effectiveInput.sort?.length) {
              const sortField = effectiveInput.sort[0];
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

            const data = await query.limit(effectiveInput.perPage).offset(offset);
            const enrichedData = await enrichCrudRows(
              ctx,
              config,
              idField,
              data as Array<Record<string, unknown>>,
            );

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
              data: enrichedData as TSelect[],
              total: count,
              page: effectiveInput.page,
              perPage: effectiveInput.perPage,
              pageCount: Math.ceil(count / effectiveInput.perPage),
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
            if (!item) return null;
            const [enriched] = await enrichCrudRows(ctx, config, idField, [
              item as Record<string, unknown>,
            ]);
            return (enriched as TSelect | undefined) ?? null;
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
            const splitInput = splitCrudExtensionWriteInput(inputData, tableColumnNames);
            assertCrudExtraValuesWritable(ctx, config, splitInput);
            return runCrudExtensionWriteTransaction(
              ctx,
              config,
              splitInput,
              async (writeCtx) => {
                const injectData = resolved.getInject(writeCtx, 'create');
                const data = { ...(splitInput.data as object), ...injectData };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const [created] = await writeCtx.db
                  .insert(table)
                  .values(data as any)
                  .returning();
                await saveCrudExtraValues(
                  writeCtx,
                  config,
                  (created as Record<string, unknown> | undefined)?.[idField],
                  splitInput,
                );
                await emitCrudWriteLifecycle(writeCtx, config, 'create', {
                  input: inputData,
                  row: created as Record<string, unknown> | undefined,
                  entityId: (created as Record<string, unknown> | undefined)?.[idField],
                  rawValues: splitInput.rawValues,
                  baseValues: splitInput.baseValues,
                  extraValues: splitInput.extraValues ?? {},
                });
                return created as TSelect;
              },
            );
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
            const splitUpdate = splitCrudExtensionWriteInput(
              updateData,
              tableColumnNames,
            );
            assertCrudExtraValuesWritable(ctx, config, splitUpdate);
            return runCrudExtensionWriteTransaction(
              ctx,
              config,
              splitUpdate,
              async (writeCtx) => {
                const injectData = resolved.getInject(writeCtx, 'update');
                const data = { ...(splitUpdate.data as object), ...injectData };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let updated = existing as TSelect;
                if (Object.keys(data).length > 0) {
                  [updated] = await writeCtx.db
                    .update(table)
                    .set(data as any)
                    .where(where!)
                    .returning();
                }
                await saveCrudExtraValues(writeCtx, config, input.id, splitUpdate);
                await emitCrudWriteLifecycle(writeCtx, config, 'update', {
                  id: input.id,
                  input: updateData,
                  row: updated as Record<string, unknown>,
                  existing: existing as Record<string, unknown>,
                  entityId: input.id,
                  rawValues: splitUpdate.rawValues,
                  baseValues: splitUpdate.baseValues,
                  extraValues: splitUpdate.extraValues ?? {},
                });
                return updated as TSelect;
              },
            );
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
            return runCrudExtensionWriteTransaction(
              ctx,
              config,
              {
                data: {},
                rawValues: { id: input },
                baseValues: {},
                extraValues: null,
              },
              async (writeCtx) => {
                let deleted;
                if (softDelete) {
                  [deleted] = await writeCtx.db
                    .update(table)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .set({ [softDelete.column]: softDelete.getValue() } as any)
                    .where(where!)
                    .returning();
                } else {
                  [deleted] = await writeCtx.db.delete(table).where(where!).returning();
                }
                await emitCrudWriteLifecycle(writeCtx, config, 'delete', {
                  id: input,
                  row: deleted as Record<string, unknown> | undefined,
                  existing: existing as Record<string, unknown>,
                  entityId: input,
                });
                return deleted as TSelect;
              },
            );
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
            const splitUpdate = splitCrudExtensionWriteInput(
              updateData,
              tableColumnNames,
            );
            assertCrudExtraValuesWritable(ctx, config, splitUpdate);
            return runCrudExtensionWriteTransaction(
              ctx,
              config,
              splitUpdate,
              async (writeCtx) => {
                const injectData = resolved.getInject(writeCtx, 'update');
                const data = { ...(splitUpdate.data as object), ...injectData };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let updated: Array<Record<string, unknown>> = input.ids.map((id) => ({
                  [idField]: id,
                }));
                if (Object.keys(data).length > 0) {
                  updated = await writeCtx.db
                    .update(table)
                    .set(data as any)
                    .where(where!)
                    .returning({ [idField]: getIdColumn() });
                } else {
                  updated = await writeCtx.db
                    .select({ [idField]: getIdColumn() })
                    .from(table)
                    .where(where!);
                }
                await Promise.all(
                  updated.map((row) =>
                    saveCrudExtraValues(writeCtx, config, row[idField], splitUpdate),
                  ),
                );
                return { updated: updated.length };
              },
            );
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
            const splitInput = splitCrudExtensionWriteInput(inputData, tableColumnNames);
            assertCrudExtraValuesWritable(ctx, config, splitInput);
            // 先尝试查询是否存在
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const inputId = (splitInput.data as any)[idField];
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

            return runCrudExtensionWriteTransaction(
              ctx,
              config,
              splitInput,
              async (writeCtx) => {
                // Major #5: 根据 isNew 决定使用 create 还是 update 的 inject
                const injectData = resolved.getInject(
                  writeCtx,
                  isNew ? 'create' : 'update',
                );
                const data = { ...(splitInput.data as object), ...injectData };

                // 使用 onConflictDoUpdate
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const [result] = await writeCtx.db
                  .insert(table)
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .values(data as any)
                  .onConflictDoUpdate({
                    target: getIdColumn(),
                    // 更新时只使用 update 的 inject
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    set: {
                      ...(splitInput.data as object),
                      ...resolved.getInject(writeCtx, 'update'),
                    } as any,
                  })
                  .returning();

                await saveCrudExtraValues(
                  writeCtx,
                  config,
                  (result as Record<string, unknown> | undefined)?.[idField] ?? inputId,
                  splitInput,
                );

                await emitCrudWriteLifecycle(writeCtx, config, 'upsert', {
                  input: inputData,
                  row: result as Record<string, unknown>,
                  existing: existing as Record<string, unknown> | null,
                  isNew,
                  entityId:
                    (result as Record<string, unknown> | undefined)?.[idField] ?? inputId,
                  rawValues: splitInput.rawValues,
                  baseValues: splitInput.baseValues,
                  extraValues: splitInput.extraValues ?? {},
                });

                return { data: result as TSelect, isNew };
              },
            );
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
            const effectiveInput = (await applyCrudExtensionFilters(
              ctx,
              config,
              table,
              idField,
              filterableColumns,
              searchColumns,
              {
                page: 1,
                perPage: Math.min(
                  Math.max(exportInput.limit ?? maxExportSize, 1),
                  maxExportSize,
                ),
                joinOperator: exportInput.joinOperator ?? 'and',
                ...exportInput,
              },
            )) as ExportInput;
            const effectiveLimit = Math.min(
              Math.max(effectiveInput.limit ?? maxExportSize, 1),
              maxExportSize,
            );

            const validatedFilters = effectiveInput.filters?.filter(
              (filter) =>
                isCrudExtensionIdFilter(filter, idField) ||
                validateColumn(filter.id, filterableColumns),
            );

            const filterCondition = validatedFilters?.length
              ? filterColumns({
                  table,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  filters: validatedFilters as any,
                  joinOperator: effectiveInput.joinOperator ?? 'and',
                  resolveColumn: (columnId) => {
                    const id = String(columnId);
                    if (id === idField) return getTableColumn(table, idField);
                    return resolveColumnTarget({
                      table,
                      columnId: id,
                      allowedColumns: filterableColumns,
                    });
                  },
                })
              : undefined;

            const searchCondition = buildCrudSearchCondition({
              table,
              search: effectiveInput.search,
              searchColumns,
            });
            const where = buildWhere(
              ctx,
              'export',
              combineConditions(filterCondition, searchCondition),
            );

            let query = ctx.db.select().from(table).$dynamic();
            if (where) {
              query = query.where(where);
            }

            if (effectiveInput.sort?.length) {
              const sortField = effectiveInput.sort[0];
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
            const enrichedData = await enrichCrudRows(
              ctx,
              config,
              idField,
              data as Array<Record<string, unknown>>,
            );

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
              data: enrichedData as TSelect[],
              total,
              hasMore: total > enrichedData.length,
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
            const splitItems = items.map((item) =>
              splitCrudExtensionWriteInput(item, tableColumnNames),
            );
            assertCrudExtraValuesWritableForRows(ctx, config, splitItems);
            return runCrudExtensionWriteTransaction(
              ctx,
              config,
              createCrudBatchTransactionInput(splitItems),
              async (writeCtx) => {
                const injectData = resolved.getInject(writeCtx, 'create');
                const values = splitItems.map(({ data }) => ({
                  ...(data as object),
                  ...injectData,
                }));
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const created = await writeCtx.db
                  .insert(table)
                  .values(values as any)
                  .onConflictDoNothing()
                  .returning();
                await saveCrudExtraValuesForRows(
                  writeCtx,
                  config,
                  idField,
                  created as Array<Record<string, unknown>>,
                  splitItems,
                );
                return { created: created as TSelect[], count: created.length };
              },
            );
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
            const validRows: Array<{
              data: TInsert;
              rawValues: Record<string, unknown>;
              baseValues: Record<string, unknown>;
              extraValues: Record<string, unknown> | null;
            }> = [];
            const failed: ImportResult['failed'] = [];

            // 逐行验证
            for (let i = 0; i < importData.rows.length; i++) {
              const row = importData.rows[i];
              const result = schema.safeParse(row);
              if (result.success) {
                const splitRow = splitCrudExtensionWriteInput(
                  result.data as TInsert,
                  tableColumnNames,
                );
                validRows.push(splitRow);
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
            assertCrudExtraValuesWritableForRows(ctx, config, validRows);

            const { insertedCount, updatedCount } =
              await runCrudExtensionWriteTransaction(
                ctx,
                config,
                createCrudBatchTransactionInput(validRows),
                async (writeCtx) => {
                  // 批量插入有效行
                  const injectData = resolved.getInject(writeCtx, 'create');
                  const values = validRows.map((row) => ({
                    ...(row.data as object),
                    ...injectData,
                  }));

                  let insertedCount = 0;
                  let updatedCount = 0;

                  if (importData.onConflict === 'upsert') {
                    // upsert: 存在则更新，不存在则新建
                    // 先查已存在的 ID 数量，用于区分 insert vs update
                    const existingIds = await writeCtx.db
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
                    const updateFields = Object.keys(validRows[0]!.data as object);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const setClause: Record<string, any> = {
                      // 注入 update 时的额外字段（如 updatedAt）
                      ...resolved.getInject(writeCtx, 'update'),
                    };
                    for (const key of updateFields) {
                      setClause[key] = sql.raw(`excluded."${key}"`);
                    }

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const results = await writeCtx.db
                      .insert(table)
                      .values(values as any)
                      .onConflictDoUpdate({
                        target: getIdColumn(),
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        set: setClause as any,
                      })
                      .returning({ id: getIdColumn() });
                    await saveCrudExtraValuesForRows(
                      writeCtx,
                      config,
                      idField,
                      results.map((result: { id: unknown }) => ({
                        [idField]: result.id,
                      })),
                      validRows,
                    );

                    updatedCount = Math.min(existingCount, results.length);
                    insertedCount = results.length - updatedCount;
                  } else {
                    // skip: 跳过冲突行
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const inserted = await writeCtx.db
                      .insert(table)
                      .values(values as any)
                      .onConflictDoNothing()
                      .returning({ id: getIdColumn() });
                    await saveCrudExtraValuesForRows(
                      writeCtx,
                      config,
                      idField,
                      inserted.map((result: { id: unknown }) => ({
                        [idField]: result.id,
                      })),
                      validRows,
                    );
                    insertedCount = inserted.length;
                    updatedCount = 0;
                  }

                  return { insertedCount, updatedCount };
                },
              );

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
