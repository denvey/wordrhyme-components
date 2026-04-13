"use client";

import type { z } from "zod";
import type { UseAutoCrudResourceReturn } from "@/hooks/use-auto-crud-resource";
import type { ModalVariant } from "./form-modal";
import type { CrudPermissions } from "@/types/permissions";
import { AutoTable, type FilterMode } from "./auto-table";
import type { BatchUpdateField } from "./auto-table-action-bar";
import { CrudFormModal } from "./crud-form-modal";
import { Button } from "@pixpilot/shadcn";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@pixpilot/shadcn";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@pixpilot/shadcn";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@pixpilot/shadcn";
import { parseZodField, type ResolvedActionItem } from "@/lib/schema-bridge/zod-to-columns";
import { formatDate } from "@/lib/format";
import { humanize } from "@/lib/humanize";
import { Badge } from "@pixpilot/shadcn";
import { ImportDialog } from "./import-dialog";
import type { ExportMode } from "./export-dialog";
import { Download, Loader2, Upload } from "lucide-react";
import { exportAllToCSV } from "@/lib/export";
import * as React from "react";
import { type LocaleProp, resolveLocale } from "@/i18n/locale";

/**
 * 筛选器独立配置
 * 可独立于 table.meta 配置筛选器行为
 */
export interface FilterConfig {
  /** 是否启用筛选（默认跟随 table.meta.variant 推断） */
  enabled?: boolean;
  /** 筛选器类型 */
  variant?: "text" | "number" | "range" | "date" | "dateRange" | "boolean" | "select" | "multiSelect";
  /** select/multiSelect 的选项列表 */
  options?: Array<{ label: string; value: string; count?: number; icon?: React.FC<React.SVGProps<SVGSVGElement>> }>;
  /** range 的最小/最大值 */
  range?: [number, number];
  /** number 的单位 */
  unit?: string;
  /** 过滤器占位符 */
  placeholder?: string;
  /** 是否在筛选栏中隐藏（隐藏筛选但不影响表格列显示） */
  hidden?: boolean;
  /** 控制在哪些筛选模式下显示（未设置则在所有模式显示） */
  modes?: Array<"simple" | "advanced" | "command">;
}

/**
 * 统一字段配置
 * 支持共用配置 + 表格/表单特定配置
 */
export interface Field {
  /** 字段标签（表格和表单共用） */
  label?: string;
  /** 是否隐藏（表格和表单都隐藏） */
  hidden?: boolean;
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
  table?: {
    /** 是否在表格中隐藏 */
    hidden?: boolean;
    /** 筛选器配置 */
    meta?: Record<string, unknown>;
    /** 其他列配置 */
    [key: string]: unknown;
  } | false;
  /**
   * 表单特定配置
   * - object: 详细配置（Formily Schema）
   * - false: 隐藏表单字段（简写，等价于 { "x-hidden": true }）
   */
  form?: {
    /** 是否在表单中隐藏 */
    "x-hidden"?: boolean;
    /** 组件类型 */
    "x-component"?: string;
    /** 组件属性 */
    "x-component-props"?: Record<string, unknown>;
    /** 其他表单配置 */
    [key: string]: unknown;
  } | false;
}

export type Fields = Record<string, Field>;

type BuiltinType = "view" | "edit" | "copy" | "delete";

/** 内置操作项（覆盖默认行为或调整位置） */
type BuiltinActionItem<T> = {
  type: BuiltinType;
  onClick?: (row: T) => void;
  label?: string;
  separator?: boolean;
};

/** 自定义操作项 */
type CustomActionItem<T> = {
  type: "custom";
  label: string;
  onClick: (row: T) => void;
  /** 仅在无内置项时生效：插入到首部还是尾部（默认 end） */
  position?: "start" | "end";
  separator?: boolean;
  variant?: "default" | "destructive";
};

/**
 * 行操作项
 *
 * - **只传 custom**：内置保持默认，custom 追加到首/尾
 * - **包含任意内置 type**：数组完全接管，未列出的隐藏，顺序即渲染顺序
 */
export type ActionItem<T> = BuiltinActionItem<T> | CustomActionItem<T>;

/**
 * AutoCrudTable Props 接口
 */
export interface AutoCrudTableProps<TSchema extends z.ZodObject<z.ZodRawShape>> {
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
    /**
     * 批量更新字段配置
     * - 只需传字段名数组，options 自动从 schema enum 推导
     * - 也可以传完整配置覆盖 label 或 options
     */
    batchFields?: (string | BatchUpdateField)[];
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
  /** 扩展点 */
  slots?: {
    /** 工具栏左侧插槽 */
    toolbarStart?: React.ReactNode;
    /** 工具栏右侧插槽 */
    toolbarEnd?: React.ReactNode;
    /** 覆盖内置的新建按钮组件 */
    createButton?: React.ReactNode;
  };
  /** 行操作配置，见 {@link ActionItem} */
  actions?: ActionItem<z.output<TSchema>>[];
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

/**
 * 从统一配置生成表格 overrides
 * 当 filter 配置存在时，合并到 meta 中（不影响列隐藏）
 */
function buildTableOverrides(fields?: Fields, legacyOverrides?: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = { ...legacyOverrides };

  if (fields) {
    for (const [key, config] of Object.entries(fields)) {
      // 提取 table.meta（无论 filter 配置如何都需要保留）
      const tableMeta = config.table !== false && typeof config.table === 'object'
        ? config.table.meta as Record<string, unknown> | undefined
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
      if (tableMeta || filterMeta) {
        result[key] = {
          ...result[key],
          meta: {
            ...(result[key]?.meta ?? {}),
            ...(tableMeta ?? {}),
            ...(filterMeta ?? {}),  // filter meta 优先级更高
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
  denyFields?: string[]
): Record<string, any> {
  const result: Record<string, any> = { ...legacyOverrides };

  // 将 denyFields 添加到表单 overrides 中，设置 x-hidden
  if (denyFields) {
    for (const field of denyFields) {
      result[field] = {
        ...result[field],
        "x-hidden": true,
      };
    }
  }

  if (fields) {
    for (const [key, config] of Object.entries(fields)) {
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
          "x-hidden": true,
        };
      }

      // 处理 form: false 简写
      if (config.form === false) {
        result[key] = {
          ...result[key],
          "x-hidden": true,
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
  denyFields?: string[]
): string[] {
  const hidden = new Set([
    ...(legacyHidden ?? []),
    ...(denyFields ?? []),
  ]);

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
  fields?: Fields
): BatchUpdateField[] {
  if (!batchFields || batchFields.length === 0) return [];

  const shape = schema.shape;

  return batchFields.map((field) => {
    // 如果是完整配置，直接使用
    if (typeof field !== "string") {
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

    // 如果是 enum 类型，自动生成 options
    if (parsed.type === "enum" && parsed.enumValues) {
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
    console.warn(`[AutoCrudTable] Field "${field}" is not an enum type, options must be provided manually`);
    return { field, label, options: [] };
  }).filter((f) => f.options.length > 0);
}

/**
 * 渲染字段值
 */
function renderFieldValue(
  value: unknown,
  type: string,
  booleanLocale: { true: string; false: string },
): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }

  switch (type) {
    case "boolean":
      return value ? booleanLocale.true : booleanLocale.false;
    case "date":
      return formatDate(value as Date);
    case "enum":
      return (
        <Badge variant="outline" className="capitalize">
          {String(value)}
        </Badge>
      );
    case "array":
      return Array.isArray(value) ? (
        <div className="flex gap-1 flex-wrap">
          {value.slice(0, 5).map((v, i) => (
            <Badge key={i} variant="secondary">
              {String(v)}
            </Badge>
          ))}
          {value.length > 5 && (
            <Badge variant="outline">+{value.length - 5}</Badge>
          )}
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

        return (
          <div key={key} className="grid grid-cols-3 items-start gap-4">
            <dt className="text-sm font-medium text-muted-foreground">
              {label}
            </dt>
            <dd className="col-span-2 text-sm">
              {renderFieldValue(value, parsed.type, locale.boolean)}
            </dd>
          </div>
        );
      })}
    </dl>
  );

  if (variant === "sheet") {
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

function resolveActions<T>(
  items: ActionItem<T>[] | undefined,
  defaults: {
    openView: (row: T) => void;
    openEdit: ((row: T) => void) | undefined;
    copyRow: ((row: T) => void) | undefined;
    openDelete: ((row: T) => void) | undefined;
  },
  rowActionsLocale: { view: string; edit: string; copy: string; delete: string },
): ResolvedActionItem<T>[] {
  const defaultItems: ResolvedActionItem<T>[] = [
    { label: rowActionsLocale.view, onClick: defaults.openView },
    ...(defaults.openEdit ? [{ label: rowActionsLocale.edit, onClick: defaults.openEdit }] : []),
    ...(defaults.copyRow ? [{ label: rowActionsLocale.copy, onClick: defaults.copyRow }] : []),
    ...(defaults.openDelete ? [{ label: rowActionsLocale.delete, onClick: defaults.openDelete, separator: true, variant: "destructive" as const }] : []),
  ];

  if (!items || items.length === 0) return defaultItems;

  const hasBuiltin = items.some((i) => i.type !== "custom");

  if (!hasBuiltin) {
    // 只有 custom 项 → 内置保持默认，custom 按 position 追加
    const startItems = items
      .filter((i): i is CustomActionItem<T> => i.type === "custom" && i.position === "start")
      .map(({ label, onClick, separator, variant }) => ({ label, onClick, separator, variant }));
    const endItems = items
      .filter((i): i is CustomActionItem<T> => i.type === "custom" && i.position !== "start")
      .map(({ label, onClick, separator, variant }) => ({ label, onClick, separator, variant }));
    return [...startItems, ...defaultItems, ...endItems];
  }

  // 包含内置项 → 数组完全接管
  const handlerMap: Record<string, ((row: T) => void) | undefined> = {
    view: defaults.openView,
    edit: defaults.openEdit,
    copy: defaults.copyRow,
    delete: defaults.openDelete,
  };
  const variantMap: Record<string, "destructive" | undefined> = { delete: "destructive" };

  return items.flatMap((item): ResolvedActionItem<T>[] => {
    if (item.type === "custom") {
      return [{ label: item.label, onClick: item.onClick, separator: item.separator, variant: item.variant }];
    }
    const handler = item.onClick ?? handlerMap[item.type];
    if (!handler) return [];
    return [{ label: item.label ?? rowActionsLocale[item.type as keyof typeof rowActionsLocale], onClick: handler, separator: item.separator, variant: variantMap[item.type] }];
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
  slots,
  permissions,
  actions: actionItems,
  locale: localeProp,
  onCreate,
}: AutoCrudTableProps<TSchema>) {
  const locale = resolveLocale(localeProp);
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

  // 从 schema 提取可导入的列名（排除 deny 字段）
  const importColumns = React.useMemo(() => {
    const shape = schema.shape;
    const denySet = new Set(denyFields ?? []);
    return Object.keys(shape).filter((key) => !denySet.has(key));
  }, [schema, denyFields]);

  // 导出处理（支持选中/筛选两种模式）
  const handleExport = React.useCallback(async (mode: ExportMode) => {
    const filename = title ?? "export";
    const excludeColumns = denyFields;

    if (mode === "selected") {
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
  }, [resource.handlers.export, title, denyFields]);

  // 导出按钮点击：根据选中状态智能判断导出模式
  const handleExportClick = React.useCallback(async () => {
    const mode: ExportMode = selectedCount > 0 ? "selected" : "filtered";
    setExporting(true);
    try {
      await handleExport(mode);
    } finally {
      setExporting(false);
    }
  }, [selectedCount, handleExport]);

  // 构建表格和表单的 overrides（memoized）
  const tableOverrides = React.useMemo(
    () => buildTableOverrides(fields, tableConfig?.overrides),
    [fields, tableConfig?.overrides],
  );
  // Critical #2: 传入 denyFields 到表单 overrides
  const formOverrides = React.useMemo(
    () => buildFormOverrides(fields, formConfig?.overrides, denyFields),
    [fields, formConfig?.overrides, denyFields],
  );
  const hiddenColumns = React.useMemo(
    () => buildHiddenColumns(fields, tableConfig?.hidden, denyFields),
    [fields, tableConfig?.hidden, denyFields],
  );
  const batchFields = React.useMemo(
    () => buildBatchUpdateFields(schema, tableConfig?.batchFields, fields),
    [schema, tableConfig?.batchFields, fields],
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {slots?.toolbarStart}
        </div>
        <div className="flex items-center gap-2">
          {slots?.toolbarEnd}
          {canImport && (
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Download className="mr-2 h-4 w-4" />
              {locale.toolbar.import}
            </Button>
          )}
          {canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportClick}
              disabled={exporting || (selectedCount === 0 && !resource.handlers.export)}
            >
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {selectedCount > 0 ? locale.toolbar.exportSelected(selectedCount) : locale.toolbar.export}
            </Button>
          )}
          {can.create && (
            slots?.createButton ? (
              slots.createButton
            ) : (
              <Button onClick={onCreate ?? resource.handlers.openCreate}>
                {locale.toolbar.create}
              </Button>
            )
          )}
        </div>
      </div>

      {/* Table */}
      <AutoTable
        data={resource.tableData.data}
        schema={schema}
        pageCount={resource.tableData.pageCount}
        overrides={tableOverrides as any}
        exclude={hiddenColumns as any}
        filterMode={tableConfig?.filterModes}
        actions={resolveActions(actionItems, {
          openView: resource.handlers.openView,
          openEdit: can.update ? resource.handlers.openEdit : undefined,
          copyRow: can.create ? resource.handlers.copyRow : undefined,
          openDelete: can.delete ? resource.handlers.openDelete : undefined,
        }, locale.rowActions)}
        onDeleteSelected={can.delete ? resource.handlers.deleteMany : undefined}
        onUpdateSelected={can.update ? resource.handlers.updateMany : undefined}
        batchUpdateFields={can.update ? batchFields : undefined}
        enableExport={false}
        initialSorting={tableConfig?.defaultSort}
        onSelectedCountChange={setSelectedCount}
        getSelectedRows={getSelectedRowsRef}
      />

      {/* Modals */}
      {/* Create/Edit Modal */}
      <CrudFormModal
        open={resource.modal.createOpen || resource.modal.editOpen}
        onOpenChange={(open) => !open && resource.handlers.closeModals()}
        mode={resource.modal.createOpen ? "create" : "edit"}
        schema={schema}
        initialValues={
          resource.modal.createOpen
            ? (resource.modal.copySource ?? undefined)
            : (resource.modal.selected ?? undefined)
        }
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
        schema={schema}
        fields={fields}
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
              {resource.mutations.isDeleting ? locale.deleteModal.confirming : locale.deleteModal.confirm}
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
