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
import { parseZodField } from "@/lib/schema-bridge/zod-to-columns";
import { formatDate } from "@/lib/format";
import { humanize } from "@/lib/humanize";
import { Badge } from "@pixpilot/shadcn";
import { ImportDialog } from "./import-dialog";
import { ExportDialog, type ExportMode } from "./export-dialog";
import { Download, Upload } from "lucide-react";
import { exportAllToCSV } from "@/lib/export";
import * as React from "react";

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
   * 独立于 table.meta 控制筛选器行为，不影响表格列显示/隐藏
   */
  filter?: FilterConfig;
  /** 表格特定配置 */
  table?: {
    /** 是否在表格中隐藏 */
    hidden?: boolean;
    /** 筛选器配置 */
    meta?: Record<string, unknown>;
    /** 其他列配置 */
    [key: string]: unknown;
  };
  /** 表单特定配置 */
  form?: {
    /** 是否在表单中隐藏 */
    "x-hidden"?: boolean;
    /** 组件类型 */
    "x-component"?: string;
    /** 组件属性 */
    "x-component-props"?: Record<string, unknown>;
    /** 其他表单配置 */
    [key: string]: unknown;
  };
}

export type Fields = Record<string, Field>;

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
    /** 表单覆盖配置 */
    overrides?: Record<string, any>;
    /** 表单列数 */
    columns?: number;
  };
  /** 扩展点 */
  slots?: {
    /** 工具栏左侧插槽 */
    toolbarStart?: React.ReactNode;
    /** 工具栏右侧插槽 */
    toolbarEnd?: React.ReactNode;
    /** 自定义行操作 */
    rowActions?: (row: z.output<TSchema>) => Array<{
      label: string;
      onClick: () => void;
    }>;
  };
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
}

/**
 * 从统一配置生成表格 overrides
 * 当 filter 配置存在时，合并到 meta 中（不影响列隐藏）
 */
function buildTableOverrides(fields?: Fields, legacyOverrides?: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = { ...legacyOverrides };

  if (fields) {
    for (const [key, config] of Object.entries(fields)) {
      // 从 filter 配置构建 meta
      let filterMeta: Record<string, unknown> | undefined;
      if (config.filter && config.filter.enabled !== false && !config.filter.hidden) {
        const { enabled: _, hidden: __, ...filterProps } = config.filter;
        if (Object.keys(filterProps).length > 0) {
          filterMeta = filterProps;
        }
      }

      result[key] = {
        ...result[key],
        ...(config.label && { label: config.label }),
        ...(config.hidden && { hidden: true }),
        ...config.table,
        // filter.meta 优先级：filter 配置 > table.meta（filter 独立配置覆盖 table.meta）
        ...(filterMeta && {
          meta: {
            ...(result[key]?.meta ?? {}),
            ...(config.table?.meta as Record<string, unknown> ?? {}),
            ...filterMeta,
          },
        }),
      };

      // 当 filter.enabled === false 或 filter.hidden === true 时，禁用该列的筛选
      if (config.filter?.enabled === false || config.filter?.hidden === true) {
        result[key] = {
          ...result[key],
          enableColumnFilter: false,
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
      result[key] = {
        ...result[key],
        ...(config.label && { title: config.label }),
        ...(config.hidden && { "x-hidden": true }),
        ...config.form,
      };
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
      if (config.hidden || config.table?.hidden) {
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
function renderFieldValue(value: unknown, type: string): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }

  switch (type) {
    case "boolean":
      return value ? "是" : "否";
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: ModalVariant;
  data: z.output<TSchema> | null;
  schema: TSchema;
  fields?: Fields;
  denyFields?: string[];
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
              {renderFieldValue(value, parsed.type)}
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
            <SheetTitle>详情</SheetTitle>
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
          <DialogTitle>详情</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
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
}: AutoCrudTableProps<TSchema>) {
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

  // Import/Export dialog state
  const [importOpen, setImportOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [selectedCount, setSelectedCount] = React.useState(0);
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

  // 构建表格和表单的 overrides
  const tableOverrides = buildTableOverrides(fields, tableConfig?.overrides);
  // Critical #2: 传入 denyFields 到表单 overrides
  const formOverrides = buildFormOverrides(fields, formConfig?.overrides, denyFields);
  const hiddenColumns = buildHiddenColumns(fields, tableConfig?.hidden, denyFields);
  const batchFields = buildBatchUpdateFields(schema, tableConfig?.batchFields, fields);

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
              导入
            </Button>
          )}
          {canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              导出
            </Button>
          )}
          {can.create && (
            <Button onClick={resource.handlers.openCreate}>
              新建
            </Button>
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
        actions={{
          onView: resource.handlers.openView,
          onEdit: can.update ? resource.handlers.openEdit : undefined,
          onCopy: can.create ? resource.handlers.copyRow : undefined,
          onDelete: can.delete ? resource.handlers.openDelete : undefined,
        }}
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
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={resource.modal.deleteOpen}
        onOpenChange={(open) => !open && resource.handlers.closeModals()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。确定要删除这条记录吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={resource.handlers.confirmDelete}
              disabled={resource.mutations.isDeleting}
            >
              {resource.mutations.isDeleting ? "删除中..." : "确认删除"}
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
        />
      )}

      {/* Export Dialog */}
      {canExport && (
        <ExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          selectedCount={selectedCount}
          onExport={handleExport}
          canExportFiltered={!!resource.handlers.export}
        />
      )}
    </div>
  );
}
