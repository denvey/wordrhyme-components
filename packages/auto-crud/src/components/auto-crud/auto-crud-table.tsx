'use client';

import type { z } from 'zod';
import type { UseAutoCrudResourceReturn } from '@/hooks/use-auto-crud-resource';
import type { ModalVariant } from './form-modal';
import type { CrudPermissions } from '@/types/permissions';
import { AutoTable, type FilterMode } from './auto-table';
import type { BatchActionConfig, BatchUpdateField } from './auto-table-action-bar';
import { CrudFormModal } from './crud-form-modal';
import { Button } from '@pixpilot/shadcn';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@pixpilot/shadcn';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@pixpilot/shadcn';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@pixpilot/shadcn';
import {
  parseZodField,
  type ResolvedActionItem,
} from '@/lib/schema-bridge/zod-to-columns';
import { formatDate } from '@/lib/format';
import { humanize } from '@/lib/humanize';
import { Badge } from '@pixpilot/shadcn';
import { ImportDialog } from './import-dialog';
import type { ExportMode } from './export-dialog';
import { Download, Loader2, Upload } from 'lucide-react';
import { exportAllToCSV } from '@/lib/export';
import * as React from 'react';
import { type LocaleProp, resolveLocale } from '@/i18n/locale';
import {
  dataSources,
  normalizeDataSourceConfig,
  normalizeOptions,
  type AutoCrudDataSourceConfig,
} from '@/lib/registries';

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

type BuiltinType = 'view' | 'edit' | 'copy' | 'delete';

/** 内置操作项（覆盖默认行为或调整位置） */
type BuiltinActionItem<T> = {
  type: BuiltinType;
  onClick?: (row: T) => void;
  label?: string;
  separator?: boolean;
};

/** 自定义操作项 */
type CustomActionItem<T> = {
  type: 'custom';
  label: string;
  onClick: (row: T) => void;
  /** 仅在无内置项时生效：插入到首部还是尾部（默认 end） */
  position?: 'start' | 'end';
  separator?: boolean;
  variant?: 'default' | 'destructive';
};

/**
 * 行操作项
 *
 * - **只传 custom**：内置保持默认，custom 追加到首/尾
 * - **包含任意内置 type**：数组完全接管，未列出的隐藏，顺序即渲染顺序
 */
export type ActionItem<T> = BuiltinActionItem<T> | CustomActionItem<T>;

export type ActionConfig<T> =
  | ActionItem<T>[]
  | ((defaults: BuiltinActionItem<T>[]) => ActionItem<T>[]);

/**
 * 顶部工具栏内置操作项
 */
export type ToolbarBuiltinActionItem = {
  type: 'create' | 'import' | 'export';
  /** 替代默认的行为 */
  onClick?: () => void;
  /** 替代默认的标签文本 */
  label?: string;
  /** 替代整个按钮的渲染 */
  component?: React.ReactNode;
};

/**
 * 顶部工具栏自定义操作项
 */
export type ToolbarCustomActionItem = {
  type: 'custom';
  /** 渲染自定义内容 */
  component: React.ReactNode;
  /** 仅在无内置项时生效：插入到首部还是尾部（默认 end） */
  position?: 'start' | 'end';
};

export type ToolbarActionItem = ToolbarBuiltinActionItem | ToolbarCustomActionItem;

export type ToolbarActionConfig =
  | ToolbarActionItem[]
  | ((defaults: ToolbarBuiltinActionItem[]) => ToolbarActionItem[]);

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
     * 用法类同 `actions` 行操作和 `toolbarActions` 顶部工具栏。
     * 只传 custom 时保留默认批量操作；包含任意内置 type 时完全接管顺序。
     */
    batchActions?: BatchActionConfig<z.output<TSchema>>;
    /** 默认排序 */
    defaultSort?: any[];
  };
  /** 表单配置 */
  form?: {
    /** 表单覆盖配置（兼容旧 API，优先级低于 fieldOverrides） */
    overrides?: Record<string, any>;
    /** 表单列数 */
    columns?: number;
    /** 弹窗自定义容器类名（支持控制大小、最大高度等） */
    className?: string;
  };

  /** 行操作配置，见 {@link ActionItem} */
  actions?: ActionConfig<z.output<TSchema>>;
  /**
   * 顶层工具栏操作配置
   * 用法类同 `actions` 行操作。一旦配置了包含内置 `type` 的数组，它将完全接管右侧工具栏！
   */
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

function useRegistryVersion(subscribe: (listener: () => void) => () => void) {
  const [version, setVersion] = React.useState(0);

  React.useEffect(
    () => subscribe(() => setVersion((current) => current + 1)),
    [subscribe],
  );

  return version;
}

function useDynamicFilterOptions(fields?: Fields): Record<string, FieldOption[]> {
  const registryVersion = useRegistryVersion(dataSources.subscribe);
  const [optionsByField, setOptionsByField] = React.useState<
    Record<string, FieldOption[]>
  >({});

  const sourceEntries = React.useMemo(() => {
    if (!fields) return [];

    return Object.entries(fields).flatMap(([field, config]) => {
      if (!shouldLoadDynamicFilterOptions(config)) return [];

      const source = normalizeDataSourceConfig(getFilterDataSource(config));
      return source ? [{ field, source }] : [];
    });
  }, [fields]);

  React.useEffect(() => {
    if (sourceEntries.length === 0) {
      setOptionsByField({});
      return;
    }

    let active = true;
    const controller =
      typeof AbortController === 'undefined' ? undefined : new AbortController();

    void Promise.all(
      sourceEntries.map(async ({ field, source }) => {
        const loader = dataSources.get(source.key);
        if (!loader) return [field, []] as const;

        try {
          const options = normalizeOptions(
            await loader({
              field,
              values: {},
              signal: controller?.signal,
            }),
          );
          return [field, options] as const;
        } catch (error) {
          if (!controller?.signal.aborted) {
            console.warn(
              `[AutoCrud] Failed to load filter data source "${source.key}".`,
              error,
            );
          }
          return [field, []] as const;
        }
      }),
    ).then((entries) => {
      if (!active) return;
      setOptionsByField(Object.fromEntries(entries));
    });

    return () => {
      active = false;
      controller?.abort();
    };
  }, [sourceEntries, registryVersion]);

  return optionsByField;
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
  dynamicFilterOptions?: Record<string, FieldOption[]>,
): Record<string, any> {
  const result: Record<string, any> = { ...legacyOverrides };

  if (fields) {
    for (const [key, config] of Object.entries(fields)) {
      const fieldOptions = normalizeFieldOptions(config.enum);
      const tableOptions = toTableOptions(fieldOptions);
      const dynamicOptions = !fieldOptions
        ? toTableOptions(normalizeFieldOptions(dynamicFilterOptions?.[key]))
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
            variant: 'multiSelect',
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

/**
 * 从统一配置生成表单 overrides
 * Critical #2: 支持 denyFields 隐藏敏感字段
 */
function buildFormOverrides(
  fields?: Fields,
  legacyOverrides?: Record<string, any>,
  denyFields?: string[],
): Record<string, any> {
  const result: Record<string, any> = { ...legacyOverrides };

  // 将 denyFields 添加到表单 overrides 中，设置 x-hidden
  if (denyFields) {
    for (const field of denyFields) {
      result[field] = {
        ...result[field],
        'x-hidden': true,
      };
    }
  }

  if (fields) {
    for (const [key, config] of Object.entries(fields)) {
      const formConfig =
        config.form && typeof config.form === 'object' ? config.form : undefined;
      const formOptions = normalizeFieldOptions(
        formConfig?.enum as FieldOption[] | undefined,
      );
      const fieldOptions = formOptions ?? normalizeFieldOptions(config.enum);
      const fieldDataSource =
        fieldOptions || !config.dataSource
          ? undefined
          : normalizeDataSourceConfig(config.dataSource);

      // 处理共用配置
      if (config.label) {
        result[key] = {
          ...result[key],
          title: config.label,
        };
      }

      if (config.hidden) {
        result[key] = {
          ...result[key],
          'x-hidden': true,
        };
      }

      if (fieldOptions) {
        result[key] = {
          ...result[key],
          enum: fieldOptions,
        };
      }

      if (fieldDataSource) {
        result[key] = {
          ...result[key],
          'x-data-source': config.dataSource,
        };
      }

      // 处理 form: false 简写
      if (config.form === false) {
        result[key] = {
          ...result[key],
          'x-hidden': true,
        };
      }
      // 处理 form 对象配置
      else if (config.form && typeof config.form === 'object') {
        result[key] = {
          ...result[key],
          ...config.form,
        };
      }
    }
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
): string[] {
  const hidden = new Set([...(legacyHidden ?? []), ...(denyFields ?? [])]);

  if (fields) {
    for (const [key, config] of Object.entries(fields)) {
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
  denyFields,
  locale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: ModalVariant;
  data: z.output<TSchema> | null;
  schema: TSchema;
  fields?: Fields;
  denyFields?: string[];
  locale: { viewModal: { title: string }; boolean: { true: string; false: string } };
}) {
  if (!data) return null;

  const shape = schema.shape;
  // Critical #2: 同时检查 hidden 和 deny 字段
  const denySet = new Set(denyFields ?? []);
  const fields = Object.entries(shape).filter(([key]) => {
    if (denySet.has(key)) return false; // deny 字段不显示
    const override = fieldConfig?.[key];
    return !override?.hidden;
  });

  const content = (
    <dl className="grid gap-4 py-4">
      {fields.map(([key, fieldSchema]) => {
        const parsed = parseZodField(fieldSchema as z.ZodType);
        const label = fieldConfig?.[key]?.label ?? humanize(key);
        const value = (data as Record<string, unknown>)[key];
        const options = normalizeFieldOptions(fieldConfig?.[key]?.enum);

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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
): ResolvedActionItem<T>[] {
  const items =
    typeof actionsOrFn === 'function'
      ? actionsOrFn([
          { type: 'view' },
          { type: 'edit' },
          { type: 'copy' },
          { type: 'delete' },
        ])
      : actionsOrFn;

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

  if (!items || items.length === 0) return defaultItems;

  const hasBuiltin = items.some((i) => i.type !== 'custom');

  if (!hasBuiltin) {
    // 只有 custom 项 → 内置保持默认，custom 按 position 追加
    const startItems = items
      .filter(
        (i): i is CustomActionItem<T> => i.type === 'custom' && i.position === 'start',
      )
      .map(({ label, onClick, separator, variant }) => ({
        label,
        onClick,
        separator,
        variant,
      }));
    const endItems = items
      .filter(
        (i): i is CustomActionItem<T> => i.type === 'custom' && i.position !== 'start',
      )
      .map(({ label, onClick, separator, variant }) => ({
        label,
        onClick,
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
  title,
  description,
  schema,
  resource,
  fields,
  table: tableConfig,
  form: formConfig,
  permissions,
  actions: actionItems,
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
  const [selectedCount, setSelectedCount] = React.useState(0);
  const [exporting, setExporting] = React.useState(false);
  const getSelectedRowsRef = React.useRef<(() => z.output<TSchema>[]) | null>(null);
  const dynamicFilterOptions = useDynamicFilterOptions(resolvedFields);

  // 从 schema 提取可导入的列名（排除 deny 字段）
  const importColumns = React.useMemo(() => {
    const shape = resolvedSchema.shape;
    const denySet = new Set(denyFields ?? []);
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

  // 构建表格和表单的 overrides（memoized）
  const tableOverrides = React.useMemo(
    () =>
      buildTableOverrides(resolvedFields, tableConfig?.overrides, dynamicFilterOptions),
    [resolvedFields, tableConfig?.overrides, dynamicFilterOptions],
  );
  // Critical #2: 传入 denyFields 到表单 overrides
  const formOverrides = React.useMemo(
    () => buildFormOverrides(resolvedFields, formConfig?.overrides, denyFields),
    [resolvedFields, formConfig?.overrides, denyFields],
  );
  const hiddenColumns = React.useMemo(
    () => buildHiddenColumns(resolvedFields, tableConfig?.hidden, denyFields),
    [resolvedFields, tableConfig?.hidden, denyFields],
  );
  const searchConfig = React.useMemo(() => {
    const tableSearch = tableConfig?.search;
    if (tableSearch === false) return false;
    if (tableSearch && typeof tableSearch === 'object') return tableSearch;
    return Object.values(resolvedFields).some((field) => field?.search === true)
      ? true
      : false;
  }, [resolvedFields, tableConfig?.search]);
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
            type: 'import' | 'export' | 'create',
            overrides?: { onClick?: () => void; label?: string },
          ): React.ReactNode => {
            if (type === 'import' && canImport) {
              return (
                <Button
                  key="import"
                  variant="outline"
                  size="sm"
                  onClick={overrides?.onClick ?? (() => setImportOpen(true))}
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
                  onClick={overrides?.onClick ?? handleExportClick}
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
                <Button
                  key="create"
                  onClick={overrides?.onClick ?? onCreate ?? resource.handlers.openCreate}
                >
                  {overrides?.label ?? locale.toolbar.create}
                </Button>
              );
            }
            return null;
          };

          // 1. 解析传入的 function
          const resolvedToolbarActions =
            typeof toolbarActions === 'function'
              ? toolbarActions([
                  { type: 'import' },
                  { type: 'export' },
                  { type: 'create' },
                ])
              : toolbarActions;

          // 2. 未配置 toolbarActions → 渲染默认内置按钮
          if (!resolvedToolbarActions || resolvedToolbarActions.length === 0) {
            return (
              <div className="flex items-center gap-2">
                {renderBuiltinButton('import')}
                {renderBuiltinButton('export')}
                {renderBuiltinButton('create')}
              </div>
            );
          }

          const hasBuiltin = resolvedToolbarActions.some((i) => i.type !== 'custom');

          // 3. 只有 custom 项 → 保留所有内置，custom 按 position 首尾拼接
          if (!hasBuiltin) {
            const startNodes = resolvedToolbarActions
              .filter((i) => i.type === 'custom' && i.position === 'start')
              .map((a, i) => (
                <React.Fragment key={`start-${i}`}>{a.component}</React.Fragment>
              ));
            const endNodes = resolvedToolbarActions
              .filter((i) => i.type === 'custom' && i.position !== 'start')
              .map((a, i) => (
                <React.Fragment key={`end-${i}`}>{a.component}</React.Fragment>
              ));
            return (
              <div className="flex items-center gap-2">
                {startNodes}
                {renderBuiltinButton('import')}
                {renderBuiltinButton('export')}
                {renderBuiltinButton('create')}
                {endNodes}
              </div>
            );
          }

          // 4. 包含内置项 → 完全接管：未列出的内置不渲染，顺序严格按数组
          return (
            <div className="flex items-center gap-2">
              {resolvedToolbarActions.map((action, index) => {
                if (action.type === 'custom') {
                  return (
                    <React.Fragment key={`custom-${index}`}>
                      {action.component}
                    </React.Fragment>
                  );
                }
                const builtinVisible =
                  action.type === 'import'
                    ? canImport
                    : action.type === 'export'
                      ? canExport
                      : can.create;
                if (!builtinVisible) {
                  return null;
                }
                // 内置项：支持完全替换组件
                if (action.component) {
                  return (
                    <React.Fragment key={action.type}>{action.component}</React.Fragment>
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
        actions={resolveActions(
          actionItems,
          {
            openView: resource.handlers.openView,
            openEdit: can.update ? resource.handlers.openEdit : undefined,
            copyRow: can.create ? resource.handlers.copyRow : undefined,
            openDelete: can.delete ? resource.handlers.openDelete : undefined,
          },
          locale.rowActions,
        )}
        onDeleteSelected={can.delete ? resource.handlers.deleteMany : undefined}
        onUpdateSelected={can.update ? resource.handlers.updateMany : undefined}
        batchUpdateFields={can.update ? batchFields : undefined}
        actionBarActions={tableConfig?.batchActions}
        enableExport={canExport}
        showDefaultExport={false}
        initialSorting={tableConfig?.defaultSort}
        onSelectedCountChange={setSelectedCount}
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
