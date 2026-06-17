'use client';

import * as React from 'react';
import type { ColumnDef, Row } from '@tanstack/react-table';
import { z } from 'zod';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { Badge } from '@pixpilot/shadcn';
import { Button } from '@pixpilot/shadcn';
import { Checkbox } from '@pixpilot/shadcn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@pixpilot/shadcn';
import { Ellipsis } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { humanize } from '@/lib/humanize';
import type {
  ColumnOverrides,
  CreateTableSchemaOptions,
  FieldType,
  FilterVariant,
  ParsedZodField,
} from './types';
import { fieldTypeToFilterVariant, inferFilterVariantByFieldName } from './types';

const parsedFieldCache = new WeakMap<z.ZodType, ParsedZodField>();
const baseTableSchemaCache = new WeakMap<z.ZodObject<z.ZodRawShape>, ColumnDef<any>[]>();

/**
 * 解析 Zod 字段类型
 */
export function parseZodField(schema: z.ZodType): ParsedZodField {
  const cached = parsedFieldCache.get(schema);
  if (cached) return cached;

  const finalize = (result: ParsedZodField) => {
    parsedFieldCache.set(schema, result);
    return result;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = (schema as any)._zod?.def ?? (schema as any)._def;

  // 优先检查 Zod 内部类型名称（更准确）
  const typeName = def?.typeName;
  const isOptional = def?.type === 'optional' || typeName === 'ZodOptional';
  const isNullable = def?.type === 'nullable' || typeName === 'ZodNullable';

  // 处理 nullable/optional 类型 - 解包获取内部类型
  if (isOptional || isNullable) {
    const innerType = def?.innerType;
    if (innerType) {
      const innerParsed = parseZodField(innerType);
      return finalize({ ...innerParsed, required: false });
    }
  }

  // 检查是否 optional - 优先从类型结构判断，仅 fallback 时 safeParse
  let required: boolean;
  if (isOptional || isNullable) {
    required = false;
  } else {
    const testNull = schema.safeParse(null);
    const testUndefined = schema.safeParse(undefined);
    required = !testUndefined.success && !testNull.success;
  }

  // 检查 drizzle-zod 生成的简化结构
  if (def?.type === 'boolean') {
    return finalize({ type: 'boolean', required });
  }

  if (def?.type === 'number') {
    return finalize({ type: 'number', required });
  }

  if (def?.type === 'date') {
    return finalize({ type: 'date', required });
  }

  // 检查 enum 类型
  if (def?.type === 'enum') {
    let enumValues: string[] | undefined;
    if (def?.entries) {
      const entries = def.entries;
      if (Array.isArray(entries)) {
        enumValues = entries.map(String);
      } else if (typeof entries === 'object') {
        enumValues = Object.keys(entries);
      }
    } else if (def?.values) {
      const values = def.values;
      if (Array.isArray(values)) {
        enumValues = values.map(String);
      }
    }
    if (enumValues && enumValues.length > 0) {
      return finalize({ type: 'enum', required, enumValues });
    }
  }

  if (def?.type === 'string') {
    return finalize({ type: 'string', required });
  }

  // 显式检查标准 Zod 类型
  if (typeName === 'ZodBoolean') {
    return finalize({ type: 'boolean', required });
  }

  // 尝试获取 enum 值 (Zod v3/v4 兼容)
  let enumValues: string[] | undefined;

  if (def?.entries) {
    // Zod v4 format - entries 可能是对象或数组
    const entries = def.entries;
    if (Array.isArray(entries)) {
      enumValues = entries.map(String);
    } else if (typeof entries === 'object') {
      enumValues = Object.keys(entries);
    }
  } else if (def?.values) {
    // Zod v3 format
    const values = def.values;
    if (Array.isArray(values)) {
      enumValues = values.map(String);
    }
  }

  if (enumValues && Array.isArray(enumValues) && enumValues.length > 0) {
    return finalize({ type: 'enum', required, enumValues });
  }

  // 显式检查其他 Zod 类型
  if (typeName === 'ZodNumber') {
    return finalize({ type: 'number', required });
  }

  if (typeName === 'ZodDate') {
    return finalize({ type: 'date', required });
  }

  if (typeName === 'ZodArray') {
    return finalize({ type: 'array', required });
  }

  if (typeName === 'ZodObject') {
    return finalize({ type: 'object', required });
  }

  // 回退到 safeParse 检测（兼容性）
  const testString = schema.safeParse('test');
  const testNumber = schema.safeParse(123);
  const testBoolean = schema.safeParse(true);
  // 使用时间戳避免 Next.js 警告
  const testDate = schema.safeParse(1704067200000); // 2024-01-01 的时间戳

  if (testBoolean.success && !testString.success && !testNumber.success) {
    return finalize({ type: 'boolean', required });
  }

  if (testDate.success && !testString.success) {
    return finalize({ type: 'date', required });
  }

  if (testNumber.success && !testString.success) {
    return finalize({ type: 'number', required });
  }

  const testArray = schema.safeParse([]);
  if (testArray.success && !testString.success) {
    return finalize({ type: 'array', required });
  }

  return finalize({ type: 'string', required });
}

/**
 * 渲染单元格内容
 */
function renderCell(
  value: unknown,
  type: FieldType,
  options?: Array<{ label: string; value: string }>,
) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }

  const formatOptionValue = (optionValue: unknown) => {
    const stringValue = String(optionValue);
    return options?.find((option) => option.value === stringValue)?.label ?? stringValue;
  };

  if (options && options.length > 0) {
    if (Array.isArray(value)) {
      return (
        <div className="flex gap-1 flex-wrap">
          {value.slice(0, 3).map((v, i) => (
            <Badge key={i} variant="secondary">
              {formatOptionValue(v)}
            </Badge>
          ))}
          {value.length > 3 && <Badge variant="outline">+{value.length - 3}</Badge>}
        </div>
      );
    }

    return (
      <Badge variant="outline" className="capitalize">
        {formatOptionValue(value)}
      </Badge>
    );
  }

  switch (type) {
    case 'boolean':
      return value ? '✓' : '✗';
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
          {value.slice(0, 3).map((v, i) => (
            <Badge key={i} variant="secondary">
              {String(v)}
            </Badge>
          ))}
          {value.length > 3 && <Badge variant="outline">+{value.length - 3}</Badge>}
        </div>
      ) : null;
    case 'number':
      return <span className="tabular-nums">{String(value)}</span>;
    default:
      return <span className="truncate max-w-48">{String(value)}</span>;
  }
}

/**
 * 从 Zod Schema 创建 Table Schema (ColumnDef 数组)
 */
export function createTableSchema<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  options?: CreateTableSchemaOptions<z.infer<T>>,
): ColumnDef<z.infer<T>>[] {
  const { overrides, exclude = [] } = options ?? {};
  const hasOverrides = !!overrides && Object.keys(overrides).length > 0;
  const canCache = !hasOverrides && exclude.length === 0;

  if (canCache) {
    const cached = baseTableSchemaCache.get(schema);
    if (cached) return [...cached] as ColumnDef<z.infer<T>>[];
  }

  const shape = schema.shape;
  const columnEntries: Array<{
    order: number;
    sourceIndex: number;
    column: ColumnDef<z.infer<T>>;
  }> = [];

  for (const [key, fieldSchema] of Object.entries(shape)) {
    if (exclude.includes(key as keyof z.infer<T>)) continue;

    const override = overrides?.[key as keyof z.infer<T>];
    if (override?.hidden) continue;

    const parsed = parseZodField(fieldSchema as z.ZodType);
    const label = override?.label ?? humanize(key);

    // 智能推断筛选器类型：override > 字段名模式 > 字段类型
    const inferredVariant = inferFilterVariantByFieldName(key);
    const variant: FilterVariant =
      override?.meta?.variant ?? inferredVariant ?? fieldTypeToFilterVariant[parsed.type];

    // 自动生成的 options
    const autoOptions = Array.isArray(parsed.enumValues)
      ? parsed.enumValues.map((v) => ({ label: humanize(v), value: v }))
      : undefined;

    // 合并 meta，保留自动生成的 options
    const meta = {
      label,
      variant,
      ...(autoOptions && { options: autoOptions }),
      ...override?.meta,
      // 如果 override.meta 没有 options，使用自动生成的
      options: override?.meta?.options ?? autoOptions,
    };

    // 从 override 中排除 meta，单独处理
    const { meta: _ignoredMeta, ...restOverride } = override ?? {};
    const sourceIndex = columnEntries.length;
    const order =
      typeof restOverride.index === 'number'
        ? restOverride.index
        : typeof meta.index === 'number'
          ? meta.index
          : 10000 + sourceIndex;

    columnEntries.push({
      order,
      sourceIndex,
      column: {
        id: key,
        accessorKey: key,
        header: ({ column }) => <DataTableColumnHeader column={column} label={label} />,
        cell: ({ row }) =>
          renderCell(
            row.getValue(key),
            parsed.type,
            meta.options as Array<{ label: string; value: string }> | undefined,
          ),
        enableColumnFilter: true,
        enableSorting: true,
        meta,
        ...restOverride,
      } as ColumnDef<z.infer<T>>,
    });
  }

  const columns = columnEntries
    .sort((a, b) => {
      const orderDiff = a.order - b.order;
      if (orderDiff !== 0) return orderDiff;
      return a.sourceIndex - b.sourceIndex;
    })
    .map((entry) => entry.column);

  if (canCache) {
    baseTableSchemaCache.set(schema, columns as ColumnDef<any>[]);
  }

  return columns;
}

/**
 * 创建选择列
 */
export function createSelectColumn<T>(): ColumnDef<T> {
  return {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all"
        className="translate-y-0.5"
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label="Select row"
        className="translate-y-0.5"
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
    enableHiding: false,
    enableSorting: false,
    size: 40,
  };
}

/**
 * 操作列配置
 */
/**
 * 已解析的操作项（渲染层使用）
 */
export interface ResolvedActionItem<T, TContext = any> {
  label?: string;
  onClick?: (row: T) => void;
  component?: React.ReactNode | ((context: TContext) => React.ReactNode);
  getContext?: (row: T) => TContext;
  separator?: boolean;
  variant?: 'default' | 'destructive';
}

/**
 * 操作列配置（ResolvedActionItem 数组）
 */
export type ActionsColumnConfig<T> = ResolvedActionItem<T, any>[];

/**
 * 创建操作列
 */
export function createActionsColumn<T>(items: ActionsColumnConfig<T>): ColumnDef<T> {
  const renderActionComponent = (item: ResolvedActionItem<T>, row: Row<T>) => {
    if (!item.component) return null;

    return typeof item.component === 'function'
      ? item.component(item.getContext?.(row.original))
      : item.component;
  };

  return {
    id: 'actions',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Open menu"
            variant="ghost"
            className="flex size-8 p-0 data-[state=open]:bg-muted"
          >
            <Ellipsis className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {items.map((item, i) => (
            <React.Fragment key={i}>
              {item.separator && <DropdownMenuSeparator />}
              {item.component ? (
                renderActionComponent(item, row)
              ) : item.label && item.onClick ? (
                <DropdownMenuItem
                  className={item.variant === 'destructive' ? 'text-destructive' : ''}
                  onClick={() => item.onClick?.(row.original)}
                >
                  {item.label}
                </DropdownMenuItem>
              ) : null}
            </React.Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    size: 40,
  };
}
