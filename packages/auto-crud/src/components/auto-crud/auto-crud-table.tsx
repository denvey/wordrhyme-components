'use client';

import type { z } from 'zod';
import type {
  AutoCrudQueryCapabilities,
  UseAutoCrudResourceReturn,
} from '@/hooks/use-auto-crud-resource';
import type { JsonSchemaFormScope } from '@wordrhyme/formily-shadcn';
import type { ModalVariant } from './form-modal';
import type { CrudPermissions } from '@/types/permissions';
import { AutoTable, type FilterMode } from './auto-table';
import type {
  BatchActionConfig,
  BatchActionItem,
  BatchBuiltinActionItem,
  BatchUpdateField,
} from './auto-table-action-bar';
import { CrudFormModal } from './crud-form-modal';
import { Button } from '@wordrhyme/shadcn';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@wordrhyme/shadcn';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@wordrhyme/shadcn';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@wordrhyme/shadcn';
import {
  parseZodField,
  type ResolvedActionItem,
} from '@/lib/schema-bridge/zod-to-columns';
import { formatDate } from '@/lib/format';
import { humanize } from '@/lib/humanize';
import { Badge } from '@wordrhyme/shadcn';
import { ImportDialog } from './import-dialog';
import type { ExportMode } from './export-dialog';
import { Download, Loader2, RefreshCw, Upload } from 'lucide-react';
import { exportAllToCSV } from '@/lib/export';
import { getDefaultSortingForSchema } from '@/lib/default-sorting';
import * as React from 'react';
import { type LocaleProp, resolveLocale } from '@/i18n/locale';
import {
  dataSources,
  normalizeHasMore,
  normalizeDataSourceConfig,
  normalizeOptions,
  type AutoCrudDataSourceConfig,
  type AutoCrudDataSourceEntry,
} from '@/lib/registries';
import { crudActions } from '@/lib/crud-actions';
import { buildFormOverrides } from '@/lib/field-config';

/**
 * 筛选器独立配置
 * 可独立于 table.meta 配置筛选器行为
 */
export interface FilterConfig {
  /** 是否启用筛选（默认跟随 table.meta.variant 推断） */
  enabled?: boolean;
  /** 筛选器类型 */
  variant?:
    | 'text'
    | 'number'
    | 'range'
    | 'date'
    | 'dateRange'
    | 'boolean'
    | 'select'
    | 'multiSelect';
  /** select/multiSelect 的选项列表 */
  options?: FieldOption[];
  /** select/multiSelect 的动态选项源 */
  dataSource?: AutoCrudDataSourceConfig;
  /** range 的最小/最大值 */
  range?: [number, number];
  /** number 的单位 */
  unit?: string;
  /** 过滤器占位符 */
  placeholder?: string;
  /** 排序权重，数值越小越靠前 */
  index?: number;
  /** 是否在筛选栏中隐藏（隐藏筛选但不影响表格列显示） */
  hidden?: boolean;
  /** 控制在哪些筛选模式下显示（未设置则在所有模式显示） */
  modes?: Array<'simple' | 'advanced' | 'command'>;
}

export interface FieldOption {
  label: string;
  value: string;
  searchText?: string | string[];
  count?: number;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  disabled?: boolean;
}

/**
 * 统一字段配置
 * 支持共用配置 + 表格/表单特定配置
 */
export interface Field {
  /** 字段标签（表格和表单共用） */
  label?: string;
  /** 字段级静态选项（表单、筛选、展示共用） */
  enum?: FieldOption[];
  /** 字段级动态选项源（表单、筛选、展示共用） */
  dataSource?: AutoCrudDataSourceConfig;
  /** 是否隐藏（表格和表单都隐藏） */
  hidden?: boolean;
  /** 是否参与 AutoCrud 全局搜索 */
  search?: boolean;
  /**
   * 筛选器独立配置
   * - FilterConfig: 详细配置
   * - false: 禁用筛选（简写，等价于 { enabled: false }）
   * 独立于 table.meta 控制筛选器行为，不影响表格列显示/隐藏
   */
  filter?: FilterConfig | false;
  /**
   * 表格特定配置
   * - object: 详细配置
   * - false: 隐藏表格列（简写，等价于 { hidden: true }）
   */
  table?:
    | {
        /** 是否在表格中隐藏 */
        hidden?: boolean;
        /** 排序权重，数值越小越靠前 */
        index?: number;
        /** 筛选器配置 */
        meta?: Record<string, unknown>;
        /** 其他列配置 */
        [key: string]: unknown;
      }
    | false;
  /**
   * 表单特定配置
   * - object: 详细配置（Formily Schema）
   * - false: 隐藏表单字段（简写，等价于 { "x-hidden": true }）
   */
  form?:
    | {
        /** 是否在表单中隐藏 */
        'x-hidden'?: boolean;
        /** 组件类型 */
        'x-component'?: string;
        /** 组件属性 */
        'x-component-props'?: Record<string, unknown>;
        /** 其他表单配置 */
        [key: string]: unknown;
      }
    | false;
}

export type Fields = Record<string, Field>;

const DEFAULT_FORM_MANAGED_FIELDS = [
  'id',
  'createdAt',
  'updatedAt',
  'createdBy',
  'createdByType',
  'updatedBy',
  'updatedByType',
] as const;

const DEFAULT_IMPORT_MANAGED_FIELDS = [
  'createdAt',
  'updatedAt',
  'createdBy',
  'createdByType',
  'updatedBy',
  'updatedByType',
] as const;

const DEFAULT_HIDDEN_AUDIT_FIELDS = [
  'createdBy',
  'createdByType',
  'updatedBy',
  'updatedByType',
] as const;

function isDefaultHiddenAuditField(key: string): boolean {
  return DEFAULT_HIDDEN_AUDIT_FIELDS.includes(
    key as (typeof DEFAULT_HIDDEN_AUDIT_FIELDS)[number],
  );
}

function isFieldTableExplicitlyVisible(config?: Field): boolean {
  return (
    config?.hidden === false ||
    (config?.table !== false &&
      typeof config?.table === 'object' &&
      config.table.hidden === false)
  );
}

function isTableOverrideExplicitlyVisible(config?: Record<string, any>): boolean {
  return config?.hidden === false;
}

/** 内置操作项（覆盖默认行为或调整位置） */
type ActionMeta = {
  id?: string;
  order?: number;
  hidden?: boolean;
};

export interface AutoCrudRowActionContext<T> {
  crudId: string;
  idKey: string;
  row: T;
  rowId?: string;
  openView: (row: T) => void;
  openEdit?: (row: T) => void;
  copyRow?: (row: T) => void;
  openDelete?: (row: T) => void;
}

type ActionComponent<TContext> =
  | React.ReactNode
  | ((context: TContext) => React.ReactNode);

export type RowBuiltinActionType = 'view' | 'edit' | 'copy' | 'delete';

export type RowBuiltinActionItem<T> = ActionMeta & {
  type: RowBuiltinActionType;
  onClick?: (row: T) => void;
  label?: string;
  separator?: boolean;
};

export type RowCustomActionItem<T> = ActionMeta & {
  type: 'custom';
  label?: string;
  onClick?: (row: T) => void;
  component?: ActionComponent<AutoCrudRowActionContext<T>>;
  position?: 'start' | 'end';
  separator?: boolean;
  variant?: 'default' | 'destructive';
};

/** @deprecated Use RowCustomActionItem instead. */
type CustomActionItem<T> = RowCustomActionItem<T>;

/**
 * Row action item.
 *
 * - Custom-only config keeps builtin row actions and appends custom actions.
 * - Including any builtin type takes over builtin ordering.
 */
export type RowActionItem<T> = RowBuiltinActionItem<T> | RowCustomActionItem<T>;

export type RowActionConfig<T> =
  | RowActionItem<T>[]
  | ((defaults: RowBuiltinActionItem<T>[]) => RowActionItem<T>[]);

/** @deprecated Use RowActionItem instead. */
export type ActionItem<T> = RowActionItem<T>;

/** @deprecated Use RowActionConfig instead. */
export type ActionConfig<T> = RowActionConfig<T>;

export type AutoCrudActionsConfig<T> = {
  toolbar?: ToolbarActionConfig;
  row?: RowActionConfig<T>;
  batch?: BatchActionConfig<T>;
};

export type AutoCrudActionConfig<T> = RowActionConfig<T> | AutoCrudActionsConfig<T>;

/**
 * 顶部工具栏内置操作项
 */
export type ToolbarBuiltinActionType = 'refresh' | 'create' | 'import' | 'export';

export type ToolbarBuiltinActionItem = ActionMeta & {
  type: ToolbarBuiltinActionType;
  /** 替代默认的行为 */
  onClick?: () => void;
  /** 替代默认的标签文本 */
  label?: string;
  /** 替代整个按钮的渲染 */
  component?: ActionComponent<AutoCrudToolbarContext>;
};

/**
 * 顶部工具栏自定义操作项
 */
export type ToolbarCustomActionItem = ActionMeta & {
  type: 'custom';
  /** 渲染自定义内容 */
  component: ActionComponent<AutoCrudToolbarContext>;
  /** 仅在无内置项时生效：插入到首部还是尾部（默认 end） */
  position?: 'start' | 'end';
};

export type ToolbarActionItem = ToolbarBuiltinActionItem | ToolbarCustomActionItem;

export type ToolbarActionConfig =
  | ToolbarActionItem[]
  | ((defaults: ToolbarBuiltinActionItem[]) => ToolbarActionItem[]);

export interface AutoCrudToolbarContext {
  crudId: string;
  idKey: string;
  rowIds: string[];
  selectedRowIds: string[];
  selectedCount: number;
  refresh?: () => Promise<unknown>;
  openImport?: () => void;
  exportData?: () => Promise<void>;
  openCreate?: () => void;
  isRefreshing: boolean;
  isExporting: boolean;
}

export type AutoCrudToolbarResolver = (
  targetId: string,
  ownerActions: readonly ToolbarActionItem[],
  context: AutoCrudToolbarContext,
) => ToolbarActionItem[];

let autoCrudToolbarResolver: AutoCrudToolbarResolver | null = null;

export function setToolbarResolver(resolver: AutoCrudToolbarResolver | null): void {
  autoCrudToolbarResolver = resolver;
}

function getDefaultToolbarActions(): ToolbarBuiltinActionItem[] {
  return [
    { type: 'refresh' },
    { type: 'import' },
    { type: 'export' },
    { type: 'create' },
  ];
}

function getDefaultRowActions<T>(): RowBuiltinActionItem<T>[] {
  return [{ type: 'view' }, { type: 'edit' }, { type: 'copy' }, { type: 'delete' }];
}

function getDefaultBatchActions<T>(): BatchBuiltinActionItem<T>[] {
  return [{ type: 'batchUpdate' }, { type: 'delete' }];
}

function isCustomAction(action: { type: string }): boolean {
  return action.type === 'custom';
}

function resolveOwnerActions<
  TAction extends { type: string; position?: 'start' | 'end' },
  TDefault extends TAction,
>(
  config: readonly TAction[] | ((defaults: TDefault[]) => readonly TAction[]) | undefined,
  defaults: readonly TDefault[],
): TAction[] {
  const resolved = typeof config === 'function' ? config([...defaults]) : config;
  const items = resolved !== undefined && resolved.length > 0 ? [...resolved] : [];

  if (items.length === 0) {
    return [...defaults];
  }

  const hasBuiltin = items.some((item) => !isCustomAction(item));
  if (hasBuiltin) {
    return items;
  }

  const startItems = items.filter(
    (item) => isCustomAction(item) && item.position === 'start',
  );
  const endItems = items.filter(
    (item) => isCustomAction(item) && item.position !== 'start',
  );

  return [...startItems, ...defaults, ...endItems];
}

function resolveOwnerToolbarActions(
  toolbar: ToolbarActionConfig | undefined,
): ToolbarActionItem[] {
  return resolveOwnerActions<ToolbarActionItem, ToolbarBuiltinActionItem>(
    toolbar,
    getDefaultToolbarActions(),
  );
}

function resolveOwnerRowActions<T>(
  actions: RowActionConfig<T> | undefined,
): RowActionItem<T>[] {
  return resolveOwnerActions<RowActionItem<T>, RowBuiltinActionItem<T>>(
    actions,
    getDefaultRowActions<T>(),
  );
}

function resolveOwnerBatchActions<T>(
  actions: BatchActionConfig<T> | undefined,
): BatchActionItem<T>[] {
  return resolveOwnerActions<BatchActionItem<T>, BatchBuiltinActionItem<T>>(
    actions,
    getDefaultBatchActions<T>(),
  );
}

function isUnifiedActionsConfig<T>(
  actions: AutoCrudActionConfig<T> | undefined,
): actions is AutoCrudActionsConfig<T> {
  return typeof actions === 'object' && actions !== null && !Array.isArray(actions);
}

function readRowId<T>(row: T, idKey: string): string | undefined {
  const value = (row as Record<string, unknown>)[idKey];
  return value === null || value === undefined ? undefined : String(value);
}

function readRowIds<T>(rows: readonly T[], idKey: string): string[] {
  return rows.flatMap((row) => {
    const value = readRowId(row, idKey);
    return value === undefined ? [] : [value];
  });
}

function areStringArraysEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length && left.every((value, index) => value === right[index])
  );
}

function haveSameRowSelection<T>(
  left: readonly T[],
  right: readonly T[],
  idKey: string,
): boolean {
  if (left.length !== right.length) return false;

  const leftIds = readRowIds(left, idKey);
  const rightIds = readRowIds(right, idKey);
  if (leftIds.length === left.length && rightIds.length === right.length) {
    return areStringArraysEqual(leftIds, rightIds);
  }

  return left.every((row, index) => row === right[index]);
}

function readToolbarAction(
  actions: readonly ToolbarActionItem[],
  type: ToolbarBuiltinActionType,
): ToolbarBuiltinActionItem | undefined {
  return actions.find(
    (action): action is ToolbarBuiltinActionItem => action.type === type,
  );
}

function resolveToolbarActionsWithResolver(
  targetId: string | undefined,
  ownerActions: ToolbarActionItem[],
  context: AutoCrudToolbarContext,
): ToolbarActionItem[] {
  const resolver = autoCrudToolbarResolver;
  return targetId !== undefined && targetId.length > 0 && resolver !== null
    ? resolver(targetId, ownerActions, context)
    : ownerActions;
}

/**
 * AutoCrudTable Props 接口
 */
export interface AutoCrudTableProps<TSchema extends z.ZodObject<z.ZodRawShape>> {
  /** Public CRUD id. Used by hosts to document the extension target. */
  id?: string;
  /** 页面标题 */
  title?: string;
  /** 页面描述 */
  description?: string;
  /** Zod schema */
  schema: TSchema;
  /** useAutoCrudResource hook 返回值 */
  resource: UseAutoCrudResourceReturn<TSchema, z.output<TSchema>>;
  /**
   * 统一字段配置
   * 支持共用配置（label, hidden）+ 表格/表单特定配置
   */
  fields?: Fields;
  /** 表格配置 */
  table?: {
    /** 隐藏的列 */
    hidden?: string[];
    /** 列覆盖配置 */
    overrides?: Record<string, any>;
    /**
     * 过滤模式配置
     * - 单个值: 只使用该模式，不显示切换按钮
     * - 数组: 第一个为默认值，显示切换按钮
     */
    filterModes?: FilterMode | FilterMode[];
    /** 全局搜索框；默认在存在 search: true 字段时显示 */
    search?:
      | boolean
      | {
          placeholder?: string;
        };
    /**
     * 批量更新字段配置
     * - 只需传字段名数组，options 自动从 schema enum 推导
     * - 也可以传完整配置覆盖 label 或 options
     */
    batchFields?: (string | BatchUpdateField)[];
    /**
     * 多选后悬浮批量操作栏配置
     * 用法类同 `actions` 行操作和 `toolbar` 顶部工具栏。
     * 只传 custom 时保留默认批量操作；包含任意内置 type 时完全接管顺序。
     * @deprecated Use actions.batch instead.
     */
    batchActions?: BatchActionConfig<z.output<TSchema>>;
    /** 默认排序 */
    defaultSort?: any[];
  };
  /** 表单配置 */
  form?: {
    /** 表单覆盖配置（兼容旧 API，优先级低于 fieldOverrides） */
    overrides?: Record<string, any>;
    /** Formily schema expression/reaction scope */
    scope?: JsonSchemaFormScope;
    /** 表单列数 */
    columns?: number;
    /** 弹窗自定义容器类名（支持控制大小、最大高度等） */
    className?: string;
  };

  /** 行操作配置，或统一的 toolbar/row/batch 操作配置。 */
  actions?: AutoCrudActionConfig<z.output<TSchema>>;
  /**
   * 顶层工具栏操作配置
   * 用法类同 `actions` 行操作。一旦配置了包含内置 `type` 的数组，它将完全接管右侧工具栏！
   * @deprecated Use actions.toolbar instead.
   */
  toolbar?: ToolbarActionConfig;
  /** @deprecated Use toolbar instead. */
  toolbarActions?: ToolbarActionConfig;
  /**
   * 权限配置
   * 控制按钮显示和字段访问
   *
   * @example
   * ```tsx
   * const permissions = useMemo(() => ({
   *   can: {
   *     create: user.role === 'admin',
   *     update: user.role === 'admin' || user.role === 'editor',
   *     delete: user.role === 'admin',
   *     export: true,
   *     import: true,
   *   },
   *   deny: user.role === 'user' ? ['salary', 'ssn'] : [],
   * }), [user.role]);
   *
   * <AutoCrudTable permissions={permissions} ... />
   * ```
   */
  permissions?: CrudPermissions;
  /**
   * 语言配置
   * - 内置语言 key：`"zh-CN"`（默认）、`"en-US"`
   * - 部分覆盖对象：以 zh-CN 为基础深合并
   *
   * @example
   * ```tsx
   * <AutoCrudTable locale="en-US" ... />
   * <AutoCrudTable locale={{ toolbar: { create: "Add New" } }} ... />
   * ```
   */
  locale?: LocaleProp;
  /**
   * 自定义新建按钮点击事件
   * 如果提供，将覆盖默认的打开新建弹窗行为
   */
  onCreate?: () => void;
}

function mergeFieldPart<T>(
  base: T | false | undefined,
  override: T | false | undefined,
): T | false | undefined {
  if (override === undefined) return base;
  if (
    override === false ||
    base === false ||
    typeof base !== 'object' ||
    typeof override !== 'object' ||
    base === null ||
    override === null ||
    Array.isArray(base) ||
    Array.isArray(override)
  ) {
    return override;
  }

  return { ...base, ...override };
}

function mergeFieldConfig(base: Field | undefined, override: Field | undefined): Field {
  return {
    ...base,
    ...override,
    enum: override?.enum ?? base?.enum,
    dataSource: override?.dataSource ?? base?.dataSource,
    table: mergeFieldPart(base?.table, override?.table),
    filter: mergeFieldPart(base?.filter, override?.filter),
    form: mergeFieldPart(base?.form, override?.form),
  };
}

function mergeFields(
  base: Fields | undefined,
  override: Fields | undefined,
): Fields | undefined {
  if (!base && !override) return undefined;

  const keys = new Set([...Object.keys(base ?? {}), ...Object.keys(override ?? {})]);
  return Object.fromEntries(
    Array.from(keys).map((key) => [key, mergeFieldConfig(base?.[key], override?.[key])]),
  );
}

function normalizeFieldOptions(options?: FieldOption[]): FieldOption[] | undefined {
  if (!options || options.length === 0) return undefined;

  return options.map((option) => ({
    ...option,
    value: String(option.value),
  }));
}

function toTableOptions(options?: FieldOption[]) {
  return options?.map(({ label, value, searchText, count, icon }) => ({
    label,
    value,
    searchText: Array.isArray(searchText) ? searchText.join(' ') : searchText,
    count,
    icon,
  }));
}

function toBatchOptions(options?: FieldOption[]) {
  return options?.map(({ label, value }) => ({ label, value }));
}

const POPUP_SCROLL_LOAD_THRESHOLD = 24;

function isNearPopupScrollBottom(target: HTMLElement) {
  return (
    target.scrollHeight - target.scrollTop - target.clientHeight <=
    POPUP_SCROLL_LOAD_THRESHOLD
  );
}

function mergeFilterOptions(
  current: FieldOption[] | undefined,
  incoming: FieldOption[],
): FieldOption[] {
  const optionsByValue = new Map((current ?? []).map((option) => [option.value, option]));
  for (const option of incoming) {
    optionsByValue.set(option.value, option);
  }

  return Array.from(optionsByValue.values());
}

type DynamicFilterState = {
  hasMoreByField: Record<string, boolean>;
  labelOptionsByField: Record<string, FieldOption[]>;
  loadingByField: Record<string, boolean>;
  optionsByField: Record<string, FieldOption[]>;
  registeredByField: Record<string, boolean>;
  searchValues: Record<string, string>;
  searchableByField: Record<string, boolean>;
  loadMore: (field: string) => void;
  setSearchValue: (field: string, value: string) => void;
};

type ResolveDataSourceEntry = {
  field: string;
  values: string[];
  source: NonNullable<ReturnType<typeof normalizeDataSourceConfig>>;
};

type DynamicResolveState = {
  optionsByField: Record<string, FieldOption[]>;
};

function getFilterDataSource(config: Field): AutoCrudDataSourceConfig | undefined {
  if (config.filter && typeof config.filter === 'object') {
    return config.filter.dataSource ?? config.dataSource;
  }

  return config.dataSource;
}

function shouldLoadDynamicFilterOptions(config: Field): boolean {
  if (config.filter === false) return false;
  if (normalizeFieldOptions(config.enum)) return false;

  if (config.filter && typeof config.filter === 'object') {
    if (config.filter.enabled === false || config.filter.hidden === true) return false;
    if (normalizeFieldOptions(config.filter.options)) return false;
  }

  return normalizeDataSourceConfig(getFilterDataSource(config)) !== undefined;
}

function isResolveValuePresent(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).length > 0;
}

function getResolveValues(
  rows: readonly Record<string, unknown>[],
  field: string,
): string[] {
  const values = new Set<string>();

  for (const row of rows) {
    const value = row[field];
    const items = Array.isArray(value) ? value : [value];

    for (const item of items) {
      if (isResolveValuePresent(item)) {
        values.add(String(item));
      }
    }
  }

  return Array.from(values);
}

function normalizeResolveCacheValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalizeResolveCacheValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [
          key,
          normalizeResolveCacheValue((value as Record<string, unknown>)[key]),
        ]),
    );
  }
  return value === undefined ? { __autoCrudUndefined: true } : value;
}

function resolveRecordSignature(record: Record<string, unknown>): string {
  return JSON.stringify(
    Object.keys(record)
      .sort()
      .map((key) => [key, normalizeResolveCacheValue(record[key])]),
  );
}

function resolveRecordCacheKey(
  sourceKey: string,
  field: string,
  record: Record<string, unknown>,
): string {
  return `${sourceKey}\u0000${field}\u0000${String(record[field])}\u0000${resolveRecordSignature(record)}`;
}

function mergeFieldOptions(
  current: FieldOption[] | undefined,
  incoming: FieldOption[] | undefined,
): FieldOption[] | undefined {
  if ((!current || current.length === 0) && (!incoming || incoming.length === 0)) {
    return undefined;
  }

  return mergeFilterOptions(current, incoming ?? []);
}

function mergeOptionsByField(
  left: Record<string, FieldOption[]> | undefined,
  right: Record<string, FieldOption[]> | undefined,
): Record<string, FieldOption[]> {
  const keys = new Set([...Object.keys(left ?? {}), ...Object.keys(right ?? {})]);

  return Object.fromEntries(
    Array.from(keys).flatMap((key) => {
      const options = mergeFieldOptions(left?.[key], right?.[key]);
      return options ? [[key, options]] : [];
    }),
  );
}

function shouldResolveOptions(
  field: string,
  config: Field | undefined,
  hiddenColumns: Set<string>,
): config is Field {
  if (!config) return false;
  if (hiddenColumns.has(field)) return false;
  if (normalizeFieldOptions(config.enum)) return false;
  return normalizeDataSourceConfig(config.dataSource) !== undefined;
}

function useRegistryVersion(subscribe: (listener: () => void) => () => void) {
  const [version, setVersion] = React.useState(0);

  React.useEffect(
    () => subscribe(() => setVersion((current) => current + 1)),
    [subscribe],
  );

  return version;
}

function useCrudActionsVersion(): number {
  return React.useSyncExternalStore(
    crudActions.subscribe,
    crudActions.getSnapshot,
    crudActions.getSnapshot,
  );
}

function useDynamicFilterOptions(fields?: Fields): DynamicFilterState {
  const registryVersion = useRegistryVersion(dataSources.subscribe);
  const [searchValues, setSearchValues] = React.useState<Record<string, string>>({});
  const [hasMoreByField, setHasMoreByField] = React.useState<Record<string, boolean>>({});
  const [labelOptionsByField, setLabelOptionsByField] = React.useState<
    Record<string, FieldOption[]>
  >({});
  const [loadingByField, setLoadingByField] = React.useState<Record<string, boolean>>({});
  const [optionsByField, setOptionsByField] = React.useState<
    Record<string, FieldOption[]>
  >({});
  const controllersRef = React.useRef<Record<string, AbortController | undefined>>({});
  const hasMoreByFieldRef = React.useRef<Record<string, boolean>>({});
  const loadingByFieldRef = React.useRef<Record<string, boolean>>({});
  const optionsByFieldRef = React.useRef<Record<string, FieldOption[]>>({});
  const pageByFieldRef = React.useRef<Record<string, number>>({});
  const requestVersionsRef = React.useRef<Record<string, number>>({});
  const searchValuesRef = React.useRef<Record<string, string>>({});
  const sourceEntriesByFieldRef = React.useRef<
    Record<string, NonNullable<ReturnType<typeof normalizeDataSourceConfig>>>
  >({});
  const timersRef = React.useRef<
    Record<string, ReturnType<typeof setTimeout> | undefined>
  >({});

  const sourceEntries = React.useMemo(() => {
    if (!fields) return [];

    return Object.entries(fields).flatMap(([field, config]) => {
      if (!shouldLoadDynamicFilterOptions(config)) return [];

      const source = normalizeDataSourceConfig(getFilterDataSource(config));
      return source ? [{ field, source }] : [];
    });
  }, [fields]);

  const sourceEntriesByField = React.useMemo(
    () => Object.fromEntries(sourceEntries.map(({ field, source }) => [field, source])),
    [sourceEntries],
  );

  React.useEffect(() => {
    searchValuesRef.current = searchValues;
  }, [searchValues]);

  React.useEffect(() => {
    sourceEntriesByFieldRef.current = sourceEntriesByField;
  }, [sourceEntriesByField]);

  const registeredByField = React.useMemo(
    () =>
      Object.fromEntries(
        sourceEntries.map(({ field, source }) => [
          field,
          dataSources.get(source.key) !== undefined,
        ]),
      ),
    [sourceEntries, registryVersion],
  );

  const searchableByField = React.useMemo(
    () =>
      Object.fromEntries(
        sourceEntries.map(({ field, source }) => [
          field,
          dataSources.get(source.key)?.search === true,
        ]),
      ),
    [sourceEntries, registryVersion],
  );

  const setFieldState = React.useCallback(
    <T,>(
      setter: React.Dispatch<React.SetStateAction<Record<string, T>>>,
      ref: React.MutableRefObject<Record<string, T>>,
      field: string,
      value: T,
    ) => {
      ref.current = {
        ...ref.current,
        [field]: value,
      };
      setter(ref.current);
    },
    [],
  );

  const removeInactiveFieldState = React.useCallback(
    <T,>(
      setter: React.Dispatch<React.SetStateAction<Record<string, T>>>,
      ref: React.MutableRefObject<Record<string, T>>,
      activeFields: Set<string>,
    ) => {
      const nextEntries = Object.entries(ref.current).filter(([field]) =>
        activeFields.has(field),
      );
      if (nextEntries.length === Object.keys(ref.current).length) return;

      ref.current = Object.fromEntries(nextEntries) as Record<string, T>;
      setter(ref.current);
    },
    [],
  );

  const setFieldOptions = React.useCallback((field: string, options: FieldOption[]) => {
    optionsByFieldRef.current = {
      ...optionsByFieldRef.current,
      [field]: options,
    };
    setOptionsByField(optionsByFieldRef.current);
  }, []);

  const setFieldLoading = React.useCallback(
    (field: string, loading: boolean) => {
      setFieldState(setLoadingByField, loadingByFieldRef, field, loading);
    },
    [setFieldState],
  );

  const setFieldHasMore = React.useCallback(
    (field: string, hasMore: boolean) => {
      setFieldState(setHasMoreByField, hasMoreByFieldRef, field, hasMore);
    },
    [setFieldState],
  );

  const clearFieldRequest = React.useCallback((field: string) => {
    const timer = timersRef.current[field];
    if (timer) clearTimeout(timer);
    timersRef.current[field] = undefined;

    controllersRef.current[field]?.abort();
    controllersRef.current[field] = undefined;
  }, []);

  const resetField = React.useCallback(
    (field: string, { clearLabels = false }: { clearLabels?: boolean } = {}) => {
      clearFieldRequest(field);
      setFieldOptions(field, []);
      setFieldLoading(field, false);
      setFieldHasMore(field, false);
      pageByFieldRef.current = {
        ...pageByFieldRef.current,
        [field]: 0,
      };
      if (clearLabels) {
        setLabelOptionsByField((current) => {
          const { [field]: _, ...rest } = current;
          return rest;
        });
      }
    },
    [clearFieldRequest, setFieldHasMore, setFieldLoading, setFieldOptions],
  );

  const loadFieldOptions = React.useCallback(
    (field: string, append = false) => {
      if (append) {
        if (loadingByFieldRef.current[field] || !hasMoreByFieldRef.current[field]) {
          return;
        }
      }

      const source = sourceEntriesByFieldRef.current[field];
      const entry = source ? dataSources.get(source.key) : undefined;
      if (!source || !entry) {
        resetField(field);
        return;
      }

      const requestVersion = (requestVersionsRef.current[field] ?? 0) + 1;
      requestVersionsRef.current = {
        ...requestVersionsRef.current,
        [field]: requestVersion,
      };

      clearFieldRequest(field);
      const controller =
        typeof AbortController === 'undefined' ? undefined : new AbortController();
      controllersRef.current[field] = controller;

      const search = entry.search ? (searchValuesRef.current[field] ?? '') : undefined;
      const page = entry.loadMore
        ? append
          ? (pageByFieldRef.current[field] ?? 0) + 1
          : 1
        : undefined;

      setFieldLoading(field, true);
      if (!append) {
        setFieldHasMore(field, false);
      }

      const timer = setTimeout(
        () => {
          void Promise.resolve(
            entry.load({
              field,
              type: 'filter',
              page,
              pageSize: entry.loadMore ? entry.pageSize : undefined,
              query: search,
              search,
              values: {},
              signal: controller?.signal,
            }),
          ).then(
            (result) => {
              if (
                requestVersionsRef.current[field] !== requestVersion ||
                controller?.signal.aborted
              ) {
                return;
              }

              const options = normalizeOptions(result);
              const nextOptions = append
                ? mergeFilterOptions(optionsByFieldRef.current[field], options)
                : options;
              const hasMore = normalizeHasMore(result);

              setFieldOptions(field, nextOptions);
              setLabelOptionsByField((current) => ({
                ...current,
                [field]: mergeFilterOptions(current[field], nextOptions),
              }));
              pageByFieldRef.current = {
                ...pageByFieldRef.current,
                [field]: page ?? 0,
              };
              setFieldHasMore(field, hasMore);
              setFieldLoading(field, false);
            },
            (error: unknown) => {
              if (controller?.signal.aborted) return;
              console.warn(
                `[AutoCrud] Failed to load filter data source "${source.key}".`,
                error,
              );

              if (!append) {
                setFieldOptions(field, []);
                setFieldHasMore(field, false);
                pageByFieldRef.current = {
                  ...pageByFieldRef.current,
                  [field]: 0,
                };
              }
              setFieldLoading(field, false);
            },
          );
        },
        !append && entry.search ? entry.debounceMs : 0,
      );
      timersRef.current[field] = timer;
    },
    [clearFieldRequest, resetField, setFieldHasMore, setFieldLoading, setFieldOptions],
  );

  const setSearchValue = React.useCallback((field: string, value: string) => {
    searchValuesRef.current = {
      ...searchValuesRef.current,
      [field]: value,
    };
    setSearchValues((current) =>
      current[field] === value
        ? current
        : {
            ...current,
            [field]: value,
          },
    );
  }, []);

  React.useEffect(() => {
    if (sourceEntries.length === 0) {
      hasMoreByFieldRef.current = {};
      loadingByFieldRef.current = {};
      optionsByFieldRef.current = {};
      pageByFieldRef.current = {};
      Object.keys(controllersRef.current).forEach(clearFieldRequest);
      setHasMoreByField({});
      setLoadingByField({});
      setOptionsByField({});
      return;
    }

    const activeFields = new Set(sourceEntries.map(({ field }) => field));
    removeInactiveFieldState(setHasMoreByField, hasMoreByFieldRef, activeFields);
    removeInactiveFieldState(setLoadingByField, loadingByFieldRef, activeFields);
    removeInactiveFieldState(setOptionsByField, optionsByFieldRef, activeFields);

    for (const field of Object.keys(controllersRef.current)) {
      if (!activeFields.has(field)) clearFieldRequest(field);
    }

    for (const { field } of sourceEntries) {
      loadFieldOptions(field);
    }
  }, [
    clearFieldRequest,
    loadFieldOptions,
    removeInactiveFieldState,
    sourceEntries,
    registryVersion,
    searchValues,
  ]);

  React.useEffect(
    () => () => {
      for (const field of Object.keys(controllersRef.current)) {
        clearFieldRequest(field);
      }
    },
    [clearFieldRequest],
  );

  return {
    hasMoreByField,
    labelOptionsByField,
    loadingByField,
    optionsByField,
    registeredByField,
    searchValues,
    searchableByField,
    loadMore: (field: string) => loadFieldOptions(field, true),
    setSearchValue,
  };
}

function rowHasResolveValue(
  row: Record<string, unknown>,
  field: string,
  value: string,
): boolean {
  const rowValue = row[field];
  const values = Array.isArray(rowValue) ? rowValue : [rowValue];
  return values.some(
    (item) => item !== null && item !== undefined && String(item) === value,
  );
}

function resolveExtraFields(
  entry: { resolveFields?: AutoCrudDataSourceEntry['resolveFields'] },
  field: string,
): string[] {
  const configured =
    typeof entry.resolveFields === 'function'
      ? entry.resolveFields({ field })
      : entry.resolveFields;

  return Array.from(
    new Set(
      (configured ?? []).filter(
        (key): key is string => typeof key === 'string' && key.length > 0,
      ),
    ),
  );
}

function buildResolveRecords(
  rows: readonly Record<string, unknown>[],
  field: string,
  values: readonly string[],
  extraFields: readonly string[],
): Record<string, unknown>[] {
  return values.map((value) => {
    const row = rows.find((candidate) => rowHasResolveValue(candidate, field, value));
    const record: Record<string, unknown> = { [field]: value };

    for (const extraField of extraFields) {
      if (row && Object.prototype.hasOwnProperty.call(row, extraField)) {
        record[extraField] = row[extraField];
      }
    }

    return record;
  });
}

function useDynamicResolveOptions(
  fields: Fields | undefined,
  rows: readonly Record<string, unknown>[],
  hiddenColumns: readonly string[],
): DynamicResolveState {
  const registryVersion = useRegistryVersion(dataSources.subscribe);
  const [optionsByField, setOptionsByField] = React.useState<
    Record<string, FieldOption[]>
  >({});
  const cacheRef = React.useRef(new Map<string, FieldOption>());
  const requestVersionRef = React.useRef(0);

  const sourceEntries = React.useMemo<ResolveDataSourceEntry[]>(() => {
    if (!fields || rows.length === 0) return [];

    const hiddenSet = new Set(hiddenColumns);

    return Object.entries(fields).flatMap(([field, config]) => {
      if (!shouldResolveOptions(field, config, hiddenSet)) return [];

      const source = normalizeDataSourceConfig(config.dataSource);
      const values = getResolveValues(rows, field);
      return source && values.length > 0 ? [{ field, values, source }] : [];
    });
  }, [fields, hiddenColumns, rows]);

  React.useEffect(() => {
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;

    if (sourceEntries.length === 0) {
      setOptionsByField({});
      return;
    }

    let cancelled = false;
    const activeFields = new Set(sourceEntries.map(({ field }) => field));

    const readCachedOptions = (
      entry: ResolveDataSourceEntry,
      records: readonly Record<string, unknown>[],
    ): FieldOption[] =>
      mergeFilterOptions(
        undefined,
        records.flatMap((record) => {
          const option = cacheRef.current.get(
            resolveRecordCacheKey(entry.source.key, entry.field, record),
          );
          return option ? [option] : [];
        }),
      );

    const recordsByField = new Map(
      sourceEntries.flatMap((sourceEntry) => {
        const entry = dataSources.get(sourceEntry.source.key);
        if (!entry) return [];

        return [
          [
            sourceEntry.field,
            buildResolveRecords(
              rows,
              sourceEntry.field,
              sourceEntry.values,
              resolveExtraFields(entry, sourceEntry.field),
            ),
          ],
        ] as const;
      }),
    );

    const readSourceEntryCachedOptions = (
      entry: ResolveDataSourceEntry,
    ): FieldOption[] => {
      const records = recordsByField.get(entry.field) ?? [];
      return readCachedOptions(entry, records);
    };

    const findOptionForRecord = (
      options: readonly FieldOption[],
      field: string,
      record: Record<string, unknown>,
    ): FieldOption | undefined => {
      const value = String(record[field]);
      return options.find((option) => option.value === value);
    };

    const missingRecordsFor = (
      entry: ResolveDataSourceEntry,
      records: readonly Record<string, unknown>[],
    ): Record<string, unknown>[] =>
      records.filter(
        (record) =>
          !cacheRef.current.has(
            resolveRecordCacheKey(entry.source.key, entry.field, record),
          ),
      );

    setOptionsByField((current) => {
      const next: Record<string, FieldOption[]> = {};
      for (const entry of sourceEntries) {
        const cached = readSourceEntryCachedOptions(entry);
        if (cached.length > 0) {
          next[entry.field] = cached;
        }
      }

      for (const [field, options] of Object.entries(current)) {
        if (activeFields.has(field) && !next[field]) {
          next[field] = options;
        }
      }

      return next;
    });

    for (const sourceEntry of sourceEntries) {
      const entry = dataSources.get(sourceEntry.source.key);
      if (!entry) continue;

      const records = recordsByField.get(sourceEntry.field) ?? [];
      const missingRecords = missingRecordsFor(sourceEntry, records);
      if (missingRecords.length === 0) continue;

      void Promise.resolve(
        entry.load({
          field: sourceEntry.field,
          type: 'resolve',
          values: missingRecords,
        }),
      ).then(
        (result) => {
          if (cancelled || requestVersionRef.current !== requestVersion) return;

          const options = normalizeOptions(result);
          for (const record of missingRecords) {
            const option = findOptionForRecord(options, sourceEntry.field, record);
            if (!option) continue;

            cacheRef.current.set(
              resolveRecordCacheKey(sourceEntry.source.key, sourceEntry.field, record),
              option,
            );
          }

          const cached = readSourceEntryCachedOptions(sourceEntry);
          setOptionsByField((current) => ({
            ...current,
            [sourceEntry.field]: cached,
          }));
        },
        (error: unknown) => {
          if (cancelled || requestVersionRef.current !== requestVersion) return;
          console.warn(
            `[AutoCrud] Failed to resolve data source "${sourceEntry.source.key}".`,
            error,
          );
        },
      );
    }

    return () => {
      cancelled = true;
    };
  }, [registryVersion, rows, sourceEntries]);

  return { optionsByField };
}

function getOptionLabel(value: unknown, options?: FieldOption[]) {
  const stringValue = String(value);
  return options?.find((option) => option.value === stringValue)?.label ?? stringValue;
}

/**
 * 从统一配置生成表格 overrides
 * 当 filter 配置存在时，合并到 meta 中（不影响列隐藏）
 */
function buildTableOverrides(
  fields?: Fields,
  legacyOverrides?: Record<string, any>,
  dynamicFilterState?: DynamicFilterState,
  dynamicResolveState?: DynamicResolveState,
): Record<string, any> {
  const result: Record<string, any> = { ...legacyOverrides };

  if (fields) {
    for (const [key, config] of Object.entries(fields)) {
      const fieldOptions = normalizeFieldOptions(config.enum);
      const tableOptions = toTableOptions(fieldOptions);
      const filterDataSourceRegistered = dynamicFilterState?.registeredByField[key];
      const filterDataSourceSearchable = dynamicFilterState?.searchableByField[key];
      const currentDynamicOptions =
        !fieldOptions && filterDataSourceRegistered
          ? toTableOptions(dynamicFilterState?.optionsByField[key] ?? [])
          : undefined;
      const dynamicFilterLabelOptions =
        !fieldOptions && filterDataSourceRegistered
          ? (dynamicFilterState?.labelOptionsByField[key] ??
            dynamicFilterState?.optionsByField[key] ??
            [])
          : undefined;
      const dynamicResolveOptions = !fieldOptions
        ? dynamicResolveState?.optionsByField[key]
        : undefined;
      const mergedDynamicOptions = mergeFieldOptions(
        dynamicFilterLabelOptions,
        dynamicResolveOptions,
      );
      const dynamicOptions =
        !fieldOptions && mergedDynamicOptions
          ? toTableOptions(mergedDynamicOptions)
          : undefined;

      // 提取 table.meta（无论 filter 配置如何都需要保留）
      const tableMeta =
        config.table !== false && typeof config.table === 'object'
          ? (config.table.meta as Record<string, unknown> | undefined)
          : undefined;

      const fieldEnumMeta = tableOptions
        ? {
            options: tableOptions,
            variant: 'multiSelect',
          }
        : undefined;
      const fieldDataSourceMeta = dynamicOptions
        ? {
            options: dynamicOptions,
            ...(filterDataSourceRegistered
              ? {
                  autoCrudFilterOptions: currentDynamicOptions ?? dynamicOptions,
                  autoCrudFilterHasMore: dynamicFilterState?.hasMoreByField[key] ?? false,
                  autoCrudFilterLoading: dynamicFilterState?.loadingByField[key] ?? false,
                  autoCrudFilterOnPopupScroll: (event: React.UIEvent<HTMLElement>) => {
                    if (!isNearPopupScrollBottom(event.currentTarget)) return;
                    dynamicFilterState?.loadMore(key);
                  },
                  variant: 'multiSelect',
                  ...(filterDataSourceSearchable
                    ? {
                        autoCrudFilterSearchValue:
                          dynamicFilterState?.searchValues[key] ?? '',
                        autoCrudFilterOnSearch: (value: string) =>
                          dynamicFilterState?.setSearchValue(key, value),
                        autoCrudFilterShouldFilter: false,
                      }
                    : undefined),
                }
              : undefined),
          }
        : undefined;

      // 提取 filter meta
      let filterMeta: Record<string, unknown> | undefined;
      if (config.filter && typeof config.filter === 'object') {
        if (config.filter.enabled !== false && config.filter.hidden !== true) {
          const { enabled: _, hidden: __, ...filterProps } = config.filter;
          if (Object.keys(filterProps).length > 0) {
            filterMeta = filterProps;
          }
        }
      }

      // 处理 filter: false 简写
      if (config.filter === false) {
        result[key] = {
          ...result[key],
          enableColumnFilter: false,
        };
      }
      // 处理 filter 对象禁用
      else if (config.filter && typeof config.filter === 'object') {
        if (config.filter.enabled === false || config.filter.hidden === true) {
          result[key] = {
            ...result[key],
            enableColumnFilter: false,
          };
        }
      }

      // 始终合并 meta（无论 filter 状态如何）
      if (fieldEnumMeta || fieldDataSourceMeta || tableMeta || filterMeta) {
        result[key] = {
          ...result[key],
          meta: {
            ...(result[key]?.meta ?? {}),
            ...(fieldEnumMeta ?? {}),
            ...(fieldDataSourceMeta ?? {}),
            ...(tableMeta ?? {}),
            ...(filterMeta ?? {}), // filter meta 优先级更高
          },
        };
      }

      // 处理共用配置
      if (config.label) {
        result[key] = {
          ...result[key],
          label: config.label,
        };
      }

      if (config.hidden) {
        result[key] = {
          ...result[key],
          hidden: true,
        };
      }

      // 处理 table: false 简写
      if (config.table === false) {
        result[key] = {
          ...result[key],
          hidden: true,
        };
      }
      // 处理 table 对象配置
      else if (config.table && typeof config.table === 'object') {
        const { meta, ...tableProps } = config.table;
        result[key] = {
          ...result[key],
          ...tableProps,
        };
      }
    }
  }

  return result;
}

function buildCapabilityTableOverrides(
  schema: z.ZodObject<z.ZodRawShape>,
  capabilities?: AutoCrudQueryCapabilities,
): Record<string, any> {
  if (!capabilities) return {};

  const result: Record<string, any> = {};
  const filterFields = capabilities.filters?.fields;
  const sortFields = capabilities.sort?.fields;
  const filterSet = Array.isArray(filterFields) ? new Set(filterFields) : null;
  const sortSet = Array.isArray(sortFields) ? new Set(sortFields) : null;

  for (const key of Object.keys(schema.shape)) {
    const override: Record<string, unknown> = {};

    if (capabilities.filters) {
      if (!capabilities.filters.enabled) {
        override.enableColumnFilter = false;
      } else if (filterSet) {
        override.enableColumnFilter = filterSet.has(key);
      }
    }

    if (capabilities.sort) {
      if (!capabilities.sort.enabled) {
        override.enableSorting = false;
      } else if (sortSet) {
        override.enableSorting = sortSet.has(key);
      }
    }

    if (Object.keys(override).length > 0) {
      result[key] = override;
    }
  }

  return result;
}

function mergeTableOverrides(
  base: Record<string, any> | undefined,
  enforced: Record<string, any>,
): Record<string, any> {
  const result: Record<string, any> = { ...(base ?? {}) };

  for (const [key, override] of Object.entries(enforced)) {
    result[key] = {
      ...(result[key] ?? {}),
      ...override,
    };
  }

  return result;
}

/**
 * 从统一配置生成隐藏列列表
 */
function buildHiddenColumns(
  fields?: Fields,
  legacyHidden?: string[],
  denyFields?: string[],
  legacyOverrides?: Record<string, any>,
): string[] {
  const legacyHiddenSet = new Set(legacyHidden ?? []);
  const denySet = new Set(denyFields ?? []);
  const hidden = new Set([
    ...DEFAULT_HIDDEN_AUDIT_FIELDS,
    ...legacyHiddenSet,
    ...denySet,
  ]);

  for (const key of DEFAULT_HIDDEN_AUDIT_FIELDS) {
    if (
      !legacyHiddenSet.has(key) &&
      !denySet.has(key) &&
      isTableOverrideExplicitlyVisible(legacyOverrides?.[key])
    ) {
      hidden.delete(key);
    }
  }

  if (fields) {
    for (const [key, config] of Object.entries(fields)) {
      if (
        isDefaultHiddenAuditField(key) &&
        !legacyHiddenSet.has(key) &&
        !denySet.has(key) &&
        isFieldTableExplicitlyVisible(config)
      ) {
        hidden.delete(key);
      }

      // 检查全局隐藏
      if (config.hidden) {
        hidden.add(key);
      }
      // 检查 table: false 简写
      else if (config.table === false) {
        hidden.add(key);
      }
      // 检查 table.hidden 配置
      else if (config.table && typeof config.table === 'object' && config.table.hidden) {
        hidden.add(key);
      }
    }
  }

  return Array.from(hidden);
}

/**
 * 从 schema 构建批量更新字段配置
 */
function buildBatchUpdateFields<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  batchFields?: (string | BatchUpdateField)[],
  fields?: Fields,
): BatchUpdateField[] {
  if (!batchFields || batchFields.length === 0) return [];

  const shape = schema.shape;

  return batchFields
    .map((field) => {
      // 如果是完整配置，直接使用
      if (typeof field !== 'string') {
        return field;
      }

      // 从 schema 推导 options
      const fieldSchema = shape[field];
      if (!fieldSchema) {
        console.warn(`[AutoCrudTable] Field "${field}" not found in schema`);
        return { field, label: humanize(field), options: [] };
      }

      const parsed = parseZodField(fieldSchema as z.ZodType);
      const label = fields?.[field]?.label ?? humanize(field);
      const fieldOptions = normalizeFieldOptions(fields?.[field]?.enum);
      const batchOptions = toBatchOptions(fieldOptions);

      if (batchOptions) {
        return {
          field,
          label,
          options: batchOptions,
        };
      }

      // 如果是 enum 类型，自动生成 options
      if (parsed.type === 'enum' && parsed.enumValues) {
        return {
          field,
          label,
          options: parsed.enumValues.map((v) => ({
            label: humanize(v),
            value: v,
          })),
        };
      }

      // 非 enum 类型，返回空 options（需要手动配置）
      console.warn(
        `[AutoCrudTable] Field "${field}" is not an enum type, options must be provided manually`,
      );
      return { field, label, options: [] };
    })
    .filter((f) => f.options.length > 0);
}

/**
 * 渲染字段值
 */
function renderFieldValue(
  value: unknown,
  type: string,
  booleanLocale: { true: string; false: string },
  options?: FieldOption[],
): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (options && options.length > 0) {
    if (Array.isArray(value)) {
      return (
        <div className="flex gap-1 flex-wrap">
          {value.slice(0, 5).map((v, i) => (
            <Badge key={i} variant="secondary">
              {getOptionLabel(v, options)}
            </Badge>
          ))}
          {value.length > 5 && <Badge variant="outline">+{value.length - 5}</Badge>}
        </div>
      );
    }

    return (
      <Badge variant="outline" className="capitalize">
        {getOptionLabel(value, options)}
      </Badge>
    );
  }

  switch (type) {
    case 'boolean':
      return value ? booleanLocale.true : booleanLocale.false;
    case 'date':
      return formatDate(value as Date);
    case 'enum':
      return (
        <Badge variant="outline" className="capitalize">
          {String(value)}
        </Badge>
      );
    case 'array':
      return Array.isArray(value) ? (
        <div className="flex gap-1 flex-wrap">
          {value.slice(0, 5).map((v, i) => (
            <Badge key={i} variant="secondary">
              {String(v)}
            </Badge>
          ))}
          {value.length > 5 && <Badge variant="outline">+{value.length - 5}</Badge>}
        </div>
      ) : null;
    default:
      return String(value);
  }
}

/**
 * ViewModal 组件 - 详情查看弹窗
 */
function ViewModal<TSchema extends z.ZodObject<z.ZodRawShape>>({
  open,
  onOpenChange,
  variant,
  data,
  schema,
  fields: fieldConfig,
  dynamicOptions,
  denyFields,
  locale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: ModalVariant;
  data: z.output<TSchema> | null;
  schema: TSchema;
  fields?: Fields;
  dynamicOptions?: Record<string, FieldOption[]>;
  denyFields?: string[];
  locale: { viewModal: { title: string }; boolean: { true: string; false: string } };
}) {
  if (!data) return null;

  const shape = schema.shape;
  // Critical #2: 同时检查 hidden 和 deny 字段
  const denySet = new Set(denyFields ?? []);
  const fields = Object.entries(shape).filter(([key]) => {
    if (denySet.has(key)) return false; // deny 字段不显示
    const config = fieldConfig?.[key];
    if (config?.hidden) return false;
    if (isDefaultHiddenAuditField(key) && !isFieldTableExplicitlyVisible(config)) {
      return false;
    }
    return true;
  });

  const content = (
    <dl className="grid gap-4 py-4">
      {fields.map(([key, fieldSchema]) => {
        const parsed = parseZodField(fieldSchema as z.ZodType);
        const label = fieldConfig?.[key]?.label ?? humanize(key);
        const value = (data as Record<string, unknown>)[key];
        const options =
          normalizeFieldOptions(fieldConfig?.[key]?.enum) ??
          normalizeFieldOptions(dynamicOptions?.[key]);

        return (
          <div key={key} className="grid grid-cols-3 items-start gap-4">
            <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
            <dd className="col-span-2 text-sm">
              {renderFieldValue(value, parsed.type, locale.boolean, options)}
            </dd>
          </div>
        );
      })}
    </dl>
  );

  if (variant === 'sheet') {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{locale.viewModal.title}</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="max-w-2xl max-h-[80vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{locale.viewModal.title}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}

/**
 * 解析列表行操作
 */
export function resolveActions<T>(
  actionsOrFn: ActionConfig<T> | undefined,
  defaults: {
    openView: (row: T) => void;
    openEdit: ((row: T) => void) | undefined;
    copyRow: ((row: T) => void) | undefined;
    openDelete: ((row: T) => void) | undefined;
  },
  rowActionsLocale: { view: string; edit: string; copy: string; delete: string },
  context: {
    crudId: string;
    idKey: string;
  },
): ResolvedActionItem<T>[] {
  const resolvedItems =
    typeof actionsOrFn === 'function'
      ? actionsOrFn([
          { type: 'view' },
          { type: 'edit' },
          { type: 'copy' },
          { type: 'delete' },
        ])
      : actionsOrFn;

  const getContext = (row: T): AutoCrudRowActionContext<T> => ({
    crudId: context.crudId,
    idKey: context.idKey,
    row,
    rowId: readRowId(row, context.idKey),
    openView: defaults.openView,
    ...(defaults.openEdit ? { openEdit: defaults.openEdit } : {}),
    ...(defaults.copyRow ? { copyRow: defaults.copyRow } : {}),
    ...(defaults.openDelete ? { openDelete: defaults.openDelete } : {}),
  });

  const defaultItems: ResolvedActionItem<T>[] = [
    { label: rowActionsLocale.view, onClick: defaults.openView },
    ...(defaults.openEdit
      ? [{ label: rowActionsLocale.edit, onClick: defaults.openEdit }]
      : []),
    ...(defaults.copyRow
      ? [{ label: rowActionsLocale.copy, onClick: defaults.copyRow }]
      : []),
    ...(defaults.openDelete
      ? [
          {
            label: rowActionsLocale.delete,
            onClick: defaults.openDelete,
            separator: true,
            variant: 'destructive' as const,
          },
        ]
      : []),
  ];

  if (resolvedItems === undefined) {
    return defaultItems;
  }

  const items = resolvedItems.filter((item) => !item.hidden);

  if (items.length === 0) {
    return [];
  }

  const hasBuiltin = items.some((i) => i.type !== 'custom');

  if (!hasBuiltin) {
    // 只有 custom 项 → 内置保持默认，custom 按 position 追加
    const startItems = items
      .filter(
        (i): i is CustomActionItem<T> => i.type === 'custom' && i.position === 'start',
      )
      .map(({ label, onClick, component, separator, variant }) => ({
        label,
        onClick,
        component,
        getContext,
        separator,
        variant,
      }));
    const endItems = items
      .filter(
        (i): i is CustomActionItem<T> => i.type === 'custom' && i.position !== 'start',
      )
      .map(({ label, onClick, component, separator, variant }) => ({
        label,
        onClick,
        component,
        getContext,
        separator,
        variant,
      }));
    return [...startItems, ...defaultItems, ...endItems];
  }

  // 包含内置项 → 数组完全接管
  const handlerMap: Record<string, ((row: T) => void) | undefined> = {
    view: defaults.openView,
    edit: defaults.openEdit,
    copy: defaults.copyRow,
    delete: defaults.openDelete,
  };
  const visibleMap: Record<string, boolean> = {
    view: true,
    edit: !!defaults.openEdit,
    copy: !!defaults.copyRow,
    delete: !!defaults.openDelete,
  };
  const variantMap: Record<string, 'destructive' | undefined> = { delete: 'destructive' };

  return items.flatMap((item): ResolvedActionItem<T>[] => {
    if (item.type === 'custom') {
      return [
        {
          label: item.label,
          onClick: item.onClick,
          component: item.component,
          getContext,
          separator: item.separator,
          variant: item.variant,
        },
      ];
    }
    if (!visibleMap[item.type]) return [];
    const handler = item.onClick ?? handlerMap[item.type];
    if (!handler) return [];
    return [
      {
        label: item.label ?? rowActionsLocale[item.type as keyof typeof rowActionsLocale],
        onClick: handler,
        separator: item.separator,
        variant: variantMap[item.type],
      },
    ];
  });
}

/**
 * AutoCrudTable 组件
 *
 * 高级 CRUD 表格组件，封装了完整的增删改查流程
 */
export function AutoCrudTable<TSchema extends z.ZodObject<z.ZodRawShape>>({
  id,
  title,
  description,
  schema,
  resource,
  fields,
  table: tableConfig,
  form: formConfig,
  permissions,
  actions: actionItems,
  toolbar,
  toolbarActions,
  locale: localeProp,
  onCreate,
}: AutoCrudTableProps<TSchema>) {
  const locale = resolveLocale(localeProp);
  const resolvedSchema = resource.schema ?? schema;
  const resolvedFields = React.useMemo<Fields>(
    () => mergeFields(resource.fields, fields) ?? {},
    [fields, resource.fields],
  );

  // 解析权限配置（默认全部允许）
  const can = {
    create: permissions?.can?.create ?? true,
    update: permissions?.can?.update ?? true,
    delete: permissions?.can?.delete ?? true,
    export: permissions?.can?.export ?? true,
    import: permissions?.can?.import ?? true,
  };
  const denyFields = permissions?.deny;

  // 从 resource.handlers 自动检测 import/export 能力
  const canImport = can.import && !!resource.handlers.import;
  // 导出：只要权限允许就显示按钮（选中导出始终可用，全量导出需要 handlers.export）
  const canExport = can.export;

  // Import dialog state
  const [importOpen, setImportOpen] = React.useState(false);
  const [selectedRows, setSelectedRows] = React.useState<z.output<TSchema>[]>([]);
  const [exporting, setExporting] = React.useState(false);
  const getSelectedRowsRef = React.useRef<(() => z.output<TSchema>[]) | null>(null);
  const dynamicFilterOptions = useDynamicFilterOptions(resolvedFields);
  const hiddenColumns = React.useMemo(
    () =>
      buildHiddenColumns(
        resolvedFields,
        tableConfig?.hidden,
        denyFields,
        tableConfig?.overrides,
      ),
    [resolvedFields, tableConfig?.hidden, denyFields, tableConfig?.overrides],
  );
  const dynamicResolveOptions = useDynamicResolveOptions(
    resolvedFields,
    resource.tableData.data as readonly Record<string, unknown>[],
    hiddenColumns,
  );
  const dynamicOptionsByField = React.useMemo(
    () =>
      mergeOptionsByField(
        dynamicFilterOptions.labelOptionsByField,
        dynamicResolveOptions.optionsByField,
      ),
    [dynamicFilterOptions.labelOptionsByField, dynamicResolveOptions.optionsByField],
  );
  const resourceIdKey = resource.idKey ?? 'id';
  const actionRegistryVersion = useCrudActionsVersion();
  const unifiedActions = React.useMemo<AutoCrudActionsConfig<z.output<TSchema>>>(() => {
    if (isUnifiedActionsConfig<z.output<TSchema>>(actionItems)) {
      return actionItems;
    }

    return { row: actionItems };
  }, [actionItems]);
  const ownerToolbarConfig = unifiedActions.toolbar ?? toolbar ?? toolbarActions;
  const ownerRowConfig = unifiedActions.row;
  const ownerBatchConfig = unifiedActions.batch ?? tableConfig?.batchActions;
  const ownerToolbarActions = React.useMemo(
    () => resolveOwnerToolbarActions(ownerToolbarConfig),
    [ownerToolbarConfig],
  );
  const ownerRowActions = React.useMemo(
    () => resolveOwnerRowActions(ownerRowConfig),
    [ownerRowConfig],
  );
  const ownerBatchActions = React.useMemo(
    () => resolveOwnerBatchActions(ownerBatchConfig),
    [ownerBatchConfig],
  );
  const registryToolbarActions = React.useMemo(
    () => crudActions.resolve<ToolbarActionItem>(id, 'toolbar', ownerToolbarActions),
    [id, ownerToolbarActions, actionRegistryVersion],
  );
  const registryRowActions = React.useMemo(
    () =>
      crudActions.resolve<RowActionItem<z.output<TSchema>>>(id, 'row', ownerRowActions),
    [id, ownerRowActions, actionRegistryVersion],
  );
  const registryBatchActions = React.useMemo(
    () =>
      crudActions.resolve<BatchActionItem<z.output<TSchema>>>(
        id,
        'batch',
        ownerBatchActions,
      ),
    [id, ownerBatchActions, actionRegistryVersion],
  );
  const selectedCount = selectedRows.length;
  const selectedRowIds = React.useMemo(
    () => readRowIds(selectedRows, resourceIdKey),
    [selectedRows, resourceIdKey],
  );
  const rowIds = React.useMemo(
    () => readRowIds(resource.tableData.data, resourceIdKey),
    [resource.tableData.data, resourceIdKey],
  );
  const handleSelectedRowsChange = React.useCallback(
    (rows: z.output<TSchema>[]) => {
      setSelectedRows((currentRows) =>
        haveSameRowSelection(currentRows, rows, resourceIdKey) ? currentRows : rows,
      );
    },
    [resourceIdKey],
  );
  const ownerRefreshAction = React.useMemo(
    () => readToolbarAction(ownerToolbarActions, 'refresh'),
    [ownerToolbarActions],
  );
  const ownerImportAction = React.useMemo(
    () => readToolbarAction(ownerToolbarActions, 'import'),
    [ownerToolbarActions],
  );
  const ownerExportAction = React.useMemo(
    () => readToolbarAction(ownerToolbarActions, 'export'),
    [ownerToolbarActions],
  );
  const ownerCreateAction = React.useMemo(
    () => readToolbarAction(ownerToolbarActions, 'create'),
    [ownerToolbarActions],
  );

  // 从 schema 提取可导入的列名（排除 deny 字段）
  const importColumns = React.useMemo(() => {
    const shape = resolvedSchema.shape;
    const denySet = new Set([...DEFAULT_IMPORT_MANAGED_FIELDS, ...(denyFields ?? [])]);
    return Object.keys(shape).filter((key) => !denySet.has(key));
  }, [resolvedSchema, denyFields]);

  // 导出处理（支持选中/筛选两种模式）
  const handleExport = React.useCallback(
    async (mode: ExportMode) => {
      const filename = title ?? 'export';
      const excludeColumns = denyFields;

      if (mode === 'selected') {
        // 导出选中行（纯客户端，不需要 exportFetcher）
        const selectedRows = getSelectedRowsRef.current?.();
        if (!selectedRows || selectedRows.length === 0) return;
        exportAllToCSV(selectedRows as Record<string, unknown>[], {
          filename,
          excludeColumns,
        });
      } else {
        // 导出筛选结果（通过服务端 export 接口获取）
        if (!resource.handlers.export) return;
        const data = await resource.handlers.export();
        exportAllToCSV(data, {
          filename,
          excludeColumns,
        });
      }
    },
    [resource.handlers.export, title, denyFields],
  );

  // 导出按钮点击：根据选中状态智能判断导出模式
  const handleExportClick = React.useCallback(async () => {
    const mode: ExportMode = selectedCount > 0 ? 'selected' : 'filtered';
    setExporting(true);
    try {
      await handleExport(mode);
    } finally {
      setExporting(false);
    }
  }, [selectedCount, handleExport]);
  const toolbarRefresh = React.useMemo<AutoCrudToolbarContext['refresh']>(() => {
    const refresh = ownerRefreshAction?.onClick ?? resource.handlers.refresh;
    if (!refresh) return undefined;

    return async () => refresh();
  }, [ownerRefreshAction?.onClick, resource.handlers.refresh]);
  const toolbarOpenImport = React.useMemo<AutoCrudToolbarContext['openImport']>(() => {
    if (!canImport) return undefined;
    return ownerImportAction?.onClick ?? (() => setImportOpen(true));
  }, [canImport, ownerImportAction?.onClick]);
  const toolbarExportData = React.useMemo<AutoCrudToolbarContext['exportData']>(() => {
    if (!canExport) return undefined;
    const exportData = ownerExportAction?.onClick ?? handleExportClick;
    return async () => exportData();
  }, [canExport, handleExportClick, ownerExportAction?.onClick]);
  const toolbarOpenCreate = React.useMemo<AutoCrudToolbarContext['openCreate']>(() => {
    if (!can.create) return undefined;
    return ownerCreateAction?.onClick ?? onCreate ?? resource.handlers.openCreate;
  }, [can.create, onCreate, ownerCreateAction?.onClick, resource.handlers.openCreate]);
  const toolbarContext = React.useMemo<AutoCrudToolbarContext>(
    () => ({
      crudId: id ?? '',
      idKey: resourceIdKey,
      rowIds,
      selectedRowIds,
      selectedCount,
      isRefreshing: resource.tableData.isFetching,
      isExporting: exporting,
      ...(toolbarRefresh ? { refresh: toolbarRefresh } : {}),
      ...(toolbarOpenImport ? { openImport: toolbarOpenImport } : {}),
      ...(toolbarExportData ? { exportData: toolbarExportData } : {}),
      ...(toolbarOpenCreate ? { openCreate: toolbarOpenCreate } : {}),
    }),
    [
      id,
      resourceIdKey,
      rowIds,
      selectedRowIds,
      selectedCount,
      resource.tableData.isFetching,
      exporting,
      toolbarRefresh,
      toolbarOpenImport,
      toolbarExportData,
      toolbarOpenCreate,
    ],
  );
  const resolvedToolbarActions = resolveToolbarActionsWithResolver(
    id,
    registryToolbarActions,
    toolbarContext,
  );

  // 构建表格和表单的 overrides（memoized）
  const tableOverrides = React.useMemo(
    () =>
      mergeTableOverrides(
        buildTableOverrides(
          resolvedFields,
          tableConfig?.overrides,
          dynamicFilterOptions,
          dynamicResolveOptions,
        ),
        buildCapabilityTableOverrides(resolvedSchema, resource.capabilities),
      ),
    [
      resolvedFields,
      tableConfig?.overrides,
      dynamicFilterOptions,
      dynamicResolveOptions,
      resolvedSchema,
      resource.capabilities,
    ],
  );
  const defaultSort = React.useMemo(
    () =>
      resource.defaultSort ??
      tableConfig?.defaultSort ??
      getDefaultSortingForSchema(resolvedSchema),
    [resource.defaultSort, resolvedSchema, tableConfig?.defaultSort],
  );
  // Critical #2: 传入 denyFields 到表单 overrides
  const formOverrides = React.useMemo(
    () => buildFormOverrides(resolvedFields, formConfig?.overrides, denyFields),
    [resolvedFields, formConfig?.overrides, denyFields],
  );
  const searchConfig = React.useMemo(() => {
    const tableSearch = tableConfig?.search;
    const searchCapability = resource.capabilities?.search;

    if (tableSearch === false) return false;
    if (searchCapability) {
      if (!searchCapability.enabled) return false;
      if (tableSearch && typeof tableSearch === 'object') return tableSearch;
      return true;
    }
    if (tableSearch && typeof tableSearch === 'object') return tableSearch;
    if (tableSearch === true) return true;
    return Object.values(resolvedFields).some((field) => field?.search === true)
      ? true
      : false;
  }, [resolvedFields, resource.capabilities?.search, tableConfig?.search]);
  const batchFields = React.useMemo(
    () =>
      buildBatchUpdateFields(resolvedSchema, tableConfig?.batchFields, resolvedFields),
    [resolvedSchema, tableConfig?.batchFields, resolvedFields],
  );
  const formInitialValues = React.useMemo(() => {
    return resource.modal.createOpen
      ? (resource.modal.copySource ?? undefined)
      : (resource.modal.selected ?? undefined);
  }, [resource.modal.createOpen, resource.modal.copySource, resource.modal.selected]);
  const rowActionDefaults = React.useMemo(
    () => ({
      openView: resource.handlers.openView,
      openEdit: can.update ? resource.handlers.openEdit : undefined,
      copyRow: can.create ? resource.handlers.copyRow : undefined,
      openDelete: can.delete ? resource.handlers.openDelete : undefined,
    }),
    [
      can.create,
      can.delete,
      can.update,
      resource.handlers.copyRow,
      resource.handlers.openDelete,
      resource.handlers.openEdit,
      resource.handlers.openView,
    ],
  );
  const tableRowActions = React.useMemo(
    () =>
      resolveActions(registryRowActions, rowActionDefaults, locale.rowActions, {
        crudId: id ?? '',
        idKey: resourceIdKey,
      }),
    [id, locale.rowActions, registryRowActions, resourceIdKey, rowActionDefaults],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      {(title || description) && (
        <div className="space-y-2">
          {title && <h2 className="text-2xl font-bold tracking-tight">{title}</h2>}
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-end gap-4">
        {(() => {
          // --- 内置按钮工厂 ---
          const renderBuiltinButton = (
            type: ToolbarBuiltinActionType,
            overrides?: { onClick?: () => void; label?: string },
          ): React.ReactNode => {
            if (type === 'refresh') {
              const onRefresh = overrides?.onClick ?? toolbarRefresh;
              const label = overrides?.label ?? locale.toolbar.refresh;
              if (!onRefresh) return null;
              return (
                <Button
                  key="refresh"
                  variant="outline"
                  size="icon-sm"
                  aria-label={label}
                  title={label}
                  onClick={onRefresh}
                  disabled={resource.tableData.isFetching}
                >
                  <RefreshCw
                    className={
                      resource.tableData.isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'
                    }
                  />
                </Button>
              );
            }
            if (type === 'import' && canImport) {
              return (
                <Button
                  key="import"
                  variant="outline"
                  size="sm"
                  onClick={overrides?.onClick ?? toolbarOpenImport}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {overrides?.label ?? locale.toolbar.import}
                </Button>
              );
            }
            if (type === 'export' && canExport) {
              return (
                <Button
                  key="export"
                  variant="outline"
                  size="sm"
                  onClick={overrides?.onClick ?? toolbarExportData}
                  disabled={
                    exporting || (selectedCount === 0 && !resource.handlers.export)
                  }
                >
                  {exporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {overrides?.label ??
                    (selectedCount > 0
                      ? locale.toolbar.exportSelected(selectedCount)
                      : locale.toolbar.export)}
                </Button>
              );
            }
            if (type === 'create' && can.create) {
              return (
                <Button key="create" onClick={overrides?.onClick ?? toolbarOpenCreate}>
                  {overrides?.label ?? locale.toolbar.create}
                </Button>
              );
            }
            return null;
          };
          const renderToolbarComponent = (
            component: ActionComponent<AutoCrudToolbarContext>,
          ) => (typeof component === 'function' ? component(toolbarContext) : component);

          // Empty means the owner, resolver, or action registry explicitly hid every item.
          if (!resolvedToolbarActions || resolvedToolbarActions.length === 0) {
            return <div className="flex items-center gap-2" />;
          }

          const hasBuiltin = resolvedToolbarActions.some((i) => i.type !== 'custom');

          // 2. 只有 custom 项 → 保留所有内置，custom 按 position 首尾拼接
          if (!hasBuiltin) {
            const startNodes = resolvedToolbarActions
              .filter((i) => i.type === 'custom' && i.position === 'start')
              .map((a, i) => (
                <React.Fragment key={`start-${i}`}>
                  {renderToolbarComponent(a.component)}
                </React.Fragment>
              ));
            const endNodes = resolvedToolbarActions
              .filter((i) => i.type === 'custom' && i.position !== 'start')
              .map((a, i) => (
                <React.Fragment key={`end-${i}`}>
                  {renderToolbarComponent(a.component)}
                </React.Fragment>
              ));
            return (
              <div className="flex items-center gap-2">
                {startNodes}
                {renderBuiltinButton('refresh')}
                {renderBuiltinButton('import')}
                {renderBuiltinButton('export')}
                {renderBuiltinButton('create')}
                {endNodes}
              </div>
            );
          }

          // 3. 包含内置项 → 完全接管：未列出的内置不渲染，顺序严格按数组
          return (
            <div className="flex items-center gap-2">
              {resolvedToolbarActions.map((action, index) => {
                if (action.type === 'custom') {
                  return (
                    <React.Fragment key={`custom-${index}`}>
                      {renderToolbarComponent(action.component)}
                    </React.Fragment>
                  );
                }
                const builtinVisible = (() => {
                  switch (action.type) {
                    case 'refresh':
                      return !!(
                        resource.handlers.refresh ||
                        action.onClick ||
                        action.component
                      );
                    case 'import':
                      return canImport;
                    case 'export':
                      return canExport;
                    case 'create':
                      return can.create;
                  }
                })();
                if (!builtinVisible) {
                  return null;
                }
                // 内置项：支持完全替换组件
                if (action.component) {
                  return (
                    <React.Fragment key={action.type}>
                      {renderToolbarComponent(action.component)}
                    </React.Fragment>
                  );
                }
                // 内置项：复用工厂函数，传入用户覆盖
                return renderBuiltinButton(action.type, {
                  onClick: action.onClick,
                  label: action.label,
                });
              })}
            </div>
          );
        })()}
      </div>

      {/* Table */}
      <AutoTable
        data={resource.tableData.data}
        schema={resolvedSchema as TSchema}
        pageCount={resource.tableData.pageCount}
        overrides={tableOverrides as any}
        exclude={hiddenColumns as any}
        filterMode={tableConfig?.filterModes}
        search={searchConfig}
        actions={tableRowActions}
        onDeleteSelected={can.delete ? resource.handlers.deleteMany : undefined}
        onUpdateSelected={can.update ? resource.handlers.updateMany : undefined}
        batchUpdateFields={can.update ? batchFields : undefined}
        actionBarActions={registryBatchActions}
        deleteConfirmation={locale.bulkDeleteModal}
        enableExport={canExport}
        showDefaultExport={false}
        initialSorting={defaultSort}
        onSelectedRowsChange={handleSelectedRowsChange}
        getSelectedRows={getSelectedRowsRef}
      />

      {/* Modals */}
      {/* Create/Edit Modal */}
      <CrudFormModal
        open={resource.modal.createOpen || resource.modal.editOpen}
        onOpenChange={(open) => !open && resource.handlers.closeModals()}
        mode={resource.modal.createOpen ? 'create' : 'edit'}
        schema={resolvedSchema}
        initialValues={formInitialValues}
        onSubmit={(values) => {
          if (resource.modal.createOpen) {
            resource.handlers.submitCreate(values as z.output<TSchema>);
          } else {
            resource.handlers.submitUpdate(values as z.output<TSchema>);
          }
        }}
        loading={resource.mutations.isCreating || resource.mutations.isUpdating}
        variant={resource.modal.variant}
        overrides={formOverrides}
        scope={formConfig?.scope}
        locale={locale.formModal}
        gridColumns={formConfig?.columns}
        className={formConfig?.className}
      />

      {/* View Modal */}
      <ViewModal
        open={resource.modal.viewOpen}
        onOpenChange={(open) => !open && resource.handlers.closeModals()}
        variant={resource.modal.variant}
        data={resource.modal.selected}
        schema={resolvedSchema}
        fields={resolvedFields}
        dynamicOptions={dynamicOptionsByField}
        denyFields={denyFields}
        locale={locale}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={resource.modal.deleteOpen}
        onOpenChange={(open) => !open && resource.handlers.closeModals()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{locale.deleteModal.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {locale.deleteModal.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{locale.deleteModal.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={resource.handlers.confirmDelete}
              disabled={resource.mutations.isDeleting}
            >
              {resource.mutations.isDeleting
                ? locale.deleteModal.confirming
                : locale.deleteModal.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      {canImport && resource.handlers.import && (
        <ImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          onImport={resource.handlers.import}
          columns={importColumns}
          locale={locale.importDialog}
        />
      )}
    </div>
  );
}
