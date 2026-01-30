import type { ISchema } from "@formily/json-schema";
import { z } from "zod";
import type {
  CreateFormSchemaOptions,
  FieldType,
  ParsedZodField,
} from "./types";
import { fieldTypeToFormilyComponent, inferComponentByFieldName } from "./types";
import { parseZodField } from "./zod-to-columns";

/**
 * 将字符串转为人类可读格式
 */
function humanize(str: string): string {
  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

/**
 * 字段类型到 JSON Schema 类型映射
 */
function mapToJsonSchemaType(type: FieldType): string {
  const map: Record<FieldType, string> = {
    string: "string",
    number: "number",
    boolean: "boolean",
    date: "string",
    enum: "string",
    array: "array",
    object: "object",
  };
  return map[type];
}

/**
 * 获取组件属性
 */
function getComponentProps(
  type: FieldType,
  parsed: ParsedZodField
): Record<string, unknown> {
  switch (type) {
    case "enum":
      return {
        options: parsed.enumValues?.map((v) => ({
          label: humanize(v),
          value: v,
        })),
      };
    case "number":
      return { precision: 0 };
    case "date":
      return { format: "YYYY-MM-DD" };
    default:
      return {};
  }
}

/**
 * 从 Zod Schema 创建 Formily Schema
 */
export function createFormSchema<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  options?: CreateFormSchemaOptions
): ISchema {
  const shape = schema.shape;
  const properties: Record<string, ISchema> = {};
  const {
    overrides,
    exclude = [],
    layout = "vertical",
    gridColumns = 2,
    labelAlign = "top",
    labelWidth,
    labelCol,
    wrapperCol,
  } = options ?? {};

  // 构建 FormItem decorator props
  const decoratorProps: Record<string, unknown> = {
    className: "space-y-2", // 增加 label 和输入框之间的间距
  };
  if (labelAlign) decoratorProps.labelAlign = labelAlign;
  if (labelWidth) decoratorProps.labelWidth = labelWidth;
  if (labelCol) decoratorProps.labelCol = labelCol;
  if (wrapperCol) decoratorProps.wrapperCol = wrapperCol;

  for (const [key, fieldSchema] of Object.entries(shape)) {
    if (exclude.includes(key)) continue;

    const parsed = parseZodField(fieldSchema as z.ZodTypeAny);
    const override = overrides?.[key];

    // 智能推断组件：字段名模式 > 字段类型 > 默认
    const inferredByName = inferComponentByFieldName(key);
    const component = inferredByName?.component ?? fieldTypeToFormilyComponent[parsed.type];
    const inferredProps = inferredByName?.props ?? {};

    properties[key] = {
      type: mapToJsonSchemaType(parsed.type),
      title: humanize(key),
      required: parsed.required,
      "x-decorator": "FormItem",
      "x-decorator-props": decoratorProps,
      "x-component": component,
      "x-component-props": { ...getComponentProps(parsed.type, parsed), ...inferredProps },
      ...(parsed.enumValues && {
        enum: parsed.enumValues.map((v) => ({
          label: humanize(v),
          value: v,
        })),
      }),
      ...override,
    };
  }

  // 根据布局包装
  if (layout === "grid") {
    return {
      type: "object",
      properties: {
        layout: {
          type: "void",
          "x-component": "FormGrid",
          "x-component-props": {
            className: `grid-cols-${gridColumns}`,
          },
          properties,
        },
      },
    };
  }

  return { type: "object", properties };
}

/**
 * 为编辑模式创建 Form Schema（排除 id, createdAt, updatedAt）
 */
export function createEditFormSchema<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  options?: Omit<CreateFormSchemaOptions, "exclude">
): ISchema {
  return createFormSchema(schema, {
    ...options,
    exclude: ["id", "createdAt", "updatedAt"],
  });
}
