import type { ColumnDef } from "@tanstack/react-table";
import type { ISchema } from "@formily/json-schema";

/**
 * 字段类型映射
 */
export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "enum"
  | "array"
  | "object";

/**
 * DataTable Filter Variant
 */
export type FilterVariant =
  | "text"
  | "number"
  | "boolean"
  | "select"
  | "multiSelect"
  | "date"
  | "dateRange"
  | "range";

/**
 * 解析后的 Zod 字段信息
 */
export interface ParsedZodField {
  type: FieldType;
  required: boolean;
  enumValues?: string[];
  description?: string;
  defaultValue?: unknown;
}

/**
 * 列定义覆盖选项
 */
export type ColumnOverrides<T> = Partial<{
  [K in keyof T]: Partial<ColumnDef<T, unknown>> & {
    hidden?: boolean;
    label?: string;
  };
}>;

/**
 * Formily Schema 覆盖选项
 */
export type FormSchemaOverrides = Record<string, Partial<ISchema>>;

/**
 * createTableSchema 选项
 */
export interface CreateTableSchemaOptions<T> {
  overrides?: ColumnOverrides<T>;
  exclude?: (keyof T)[];
}

/**
 * createFormSchema 选项
 */
export interface CreateFormSchemaOptions {
  overrides?: FormSchemaOverrides;
  exclude?: string[];
  layout?: "vertical" | "horizontal" | "grid";
  gridColumns?: number;
  /** Label 对齐方式 */
  labelAlign?: "left" | "top" | "right";
  /** Label 宽度（labelAlign 为 left 时有效） */
  labelWidth?: number | string;
  /** Label 栅格占位 */
  labelCol?: number;
  /** 输入框栅格占位 */
  wrapperCol?: number;
}

/**
 * Enum 选项类型
 */
export interface EnumOption {
  label: string;
  value: string;
}

/**
 * 字段类型到 Filter Variant 映射
 * - enum 默认 multiSelect（通常需要多选）
 * - date 默认 dateRange（通常需要范围筛选）
 * - number 默认 range（通常需要范围筛选）
 */
export const fieldTypeToFilterVariant: Record<FieldType, FilterVariant> = {
  string: "text",
  number: "range",
  boolean: "boolean",
  date: "dateRange",
  enum: "multiSelect",
  array: "multiSelect",
  object: "text",
};

/**
 * 字段类型到 Formily 组件映射
 */
export const fieldTypeToFormilyComponent: Record<FieldType, string> = {
  string: "Input",
  number: "NumberInput",
  boolean: "Switch",
  date: "DatePicker",
  enum: "Select",
  array: "ArrayCards",
  object: "ObjectField",
};

/**
 * 字段名模式到 Formily 组件映射
 * 优先级高于 fieldTypeToFormilyComponent
 * 使用正则表达式匹配字段名
 */
export const fieldNamePatternToComponent: Array<{
  pattern: RegExp;
  component: string;
  props?: Record<string, unknown>;
}> = [
  // 长文本字段 -> Textarea
  { pattern: /^(description|content|body|notes|summary|bio|about|comment|message|text)$/i, component: "Textarea" },
  { pattern: /(description|content|body|notes|summary|bio|about|comment|message)$/i, component: "Textarea" },

  // 颜色字段 -> ColorSelect
  { pattern: /^color$/i, component: "ColorSelect" },
  { pattern: /color$/i, component: "ColorSelect" },

  // 图标字段 -> IconPicker
  { pattern: /^icon$/i, component: "IconPicker" },
  { pattern: /icon$/i, component: "IconPicker" },
];

/**
 * 根据字段名推断 Formily 组件
 */
export function inferComponentByFieldName(fieldName: string): { component: string; props?: Record<string, unknown> } | null {
  for (const rule of fieldNamePatternToComponent) {
    if (rule.pattern.test(fieldName)) {
      return { component: rule.component, props: rule.props };
    }
  }
  return null;
}

/**
 * 字段名模式到 Filter Variant 映射
 * 优先级高于 fieldTypeToFilterVariant
 */
export const fieldNamePatternToFilterVariant: Array<{
  pattern: RegExp;
  variant: FilterVariant;
}> = [
  // 长文本字段 -> text (不适合 multiSelect)
  { pattern: /^(description|content|body|notes|summary|bio|about|comment|message|text)$/i, variant: "text" },
  { pattern: /(description|content|body|notes|summary|bio|about|comment|message)$/i, variant: "text" },

  // 日期字段（非范围）-> date
  { pattern: /^(date|day)$/i, variant: "date" },

  // 时间戳字段 -> dateRange
  { pattern: /(at|time|timestamp)$/i, variant: "dateRange" },
];

/**
 * 根据字段名推断 Filter Variant
 */
export function inferFilterVariantByFieldName(fieldName: string): FilterVariant | null {
  for (const rule of fieldNamePatternToFilterVariant) {
    if (rule.pattern.test(fieldName)) {
      return rule.variant;
    }
  }
  return null;
}
