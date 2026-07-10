import { z } from 'zod';
import type { ISchema } from '@formily/json-schema';

/**
 * 统一的 Schema 类型
 */
export type UnifiedSchema =
  | z.ZodObject<any> // Zod Schema
  | JSONSchema // JSON Schema
  | SimpleFieldsConfig; // 简化配置

/**
 * JSON Schema 类型
 */
export interface JSONSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
}

export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  title?: string;
  description?: string;
  enum?: any[];
  format?: string;
  default?: any;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

/**
 * 简化字段配置
 */
export interface SimpleFieldsConfig {
  [key: string]: SimpleFieldConfig;
}

export interface SimpleFieldConfig {
  type:
    | 'string'
    | 'number'
    | 'boolean'
    | 'select'
    | 'multiselect'
    | 'date'
    | 'datetime'
    | 'textarea'
    | 'email'
    | 'url';
  label?: string;
  description?: string;
  required?: boolean;
  default?: any;
  options?: Array<string | { label: string; value: any }>;
  placeholder?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
}

/**
 * 内部统一的字段定义
 */
export interface UnifiedField {
  name: string;
  type: string;
  label?: string;
  description?: string;
  required?: boolean;
  default?: any;
  validation?: any;
  options?: Array<{ label: string; value: any }>;
  component?: string;
  componentProps?: Record<string, any>;
}

/**
 * Schema 适配器 - 将各种格式转换为统一格式
 */
export class SchemaAdapter {
  /**
   * 检测 Schema 类型
   */
  static detectType(schema: UnifiedSchema): 'zod' | 'json' | 'simple' {
    if (schema instanceof z.ZodObject) {
      return 'zod';
    }
    if ('type' in schema && schema.type === 'object' && 'properties' in schema) {
      return 'json';
    }
    return 'simple';
  }

  /**
   * 转换为统一格式
   */
  static toUnified(schema: UnifiedSchema): UnifiedField[] {
    const type = this.detectType(schema);

    switch (type) {
      case 'zod':
        return this.fromZod(schema as z.ZodObject<any>);
      case 'json':
        return this.fromJSON(schema as JSONSchema);
      case 'simple':
        return this.fromSimple(schema as SimpleFieldsConfig);
    }
  }

  /**
   * 从 Zod Schema 转换
   */
  private static fromZod(schema: z.ZodObject<any>): UnifiedField[] {
    const shape = schema.shape;
    const fields: UnifiedField[] = [];

    for (const [name, zodType] of Object.entries(shape)) {
      const field = this.parseZodField(name, zodType as z.ZodTypeAny);
      fields.push(field);
    }

    return fields;
  }

  /**
   * 从 JSON Schema 转换
   */
  private static fromJSON(schema: JSONSchema): UnifiedField[] {
    const fields: UnifiedField[] = [];

    for (const [name, prop] of Object.entries(schema.properties)) {
      const field: UnifiedField = {
        name,
        type: prop.type,
        label: prop.title,
        description: prop.description,
        required: schema.required?.includes(name),
        default: prop.default,
      };

      // 处理枚举
      if (prop.enum) {
        field.options = prop.enum.map((value) => ({
          label: String(value),
          value,
        }));
        field.component = 'Select';
      }

      // 处理格式
      if (prop.format) {
        switch (prop.format) {
          case 'email':
            field.component = 'Input';
            field.componentProps = { type: 'email' };
            break;
          case 'date':
            field.component = 'DatePicker';
            break;
          case 'date-time':
            field.component = 'DateTimePicker';
            break;
          case 'uri':
            field.component = 'Input';
            field.componentProps = { type: 'url' };
            break;
        }
      }

      // 处理验证规则
      if (prop.minLength || prop.maxLength || prop.pattern) {
        field.validation = {
          minLength: prop.minLength,
          maxLength: prop.maxLength,
          pattern: prop.pattern,
        };
      }

      fields.push(field);
    }

    return fields;
  }

  /**
   * 从简化配置转换
   */
  private static fromSimple(config: SimpleFieldsConfig): UnifiedField[] {
    const fields: UnifiedField[] = [];

    for (const [name, fieldConfig] of Object.entries(config)) {
      const field: UnifiedField = {
        name,
        type: fieldConfig.type,
        label: fieldConfig.label,
        description: fieldConfig.description,
        required: fieldConfig.required,
        default: fieldConfig.default,
      };

      // 映射组件
      switch (fieldConfig.type) {
        case 'string':
          field.component = 'Input';
          break;
        case 'number':
          field.component = 'NumberInput';
          break;
        case 'boolean':
          field.component = 'Switch';
          break;
        case 'select':
          field.component = 'Select';
          field.options = this.normalizeOptions(fieldConfig.options);
          break;
        case 'multiselect':
          field.component = 'Select';
          field.componentProps = { multiple: true };
          field.options = this.normalizeOptions(fieldConfig.options);
          break;
        case 'date':
          field.component = 'DatePicker';
          break;
        case 'datetime':
          field.component = 'DateTimePicker';
          break;
        case 'textarea':
          field.component = 'Textarea';
          break;
        case 'email':
          field.component = 'Input';
          field.componentProps = { type: 'email' };
          break;
        case 'url':
          field.component = 'Input';
          field.componentProps = { type: 'url' };
          break;
      }

      // 处理验证规则
      if (
        fieldConfig.min ||
        fieldConfig.max ||
        fieldConfig.minLength ||
        fieldConfig.maxLength ||
        fieldConfig.pattern
      ) {
        field.validation = {
          min: fieldConfig.min,
          max: fieldConfig.max,
          minLength: fieldConfig.minLength,
          maxLength: fieldConfig.maxLength,
          pattern: fieldConfig.pattern,
        };
      }

      // 处理占位符
      if (fieldConfig.placeholder) {
        field.componentProps = {
          ...field.componentProps,
          placeholder: fieldConfig.placeholder,
        };
      }

      fields.push(field);
    }

    return fields;
  }

  /**
   * 解析 Zod 字段（简化版，复用现有逻辑）
   */
  private static parseZodField(name: string, zodType: z.ZodTypeAny): UnifiedField {
    // 这里可以复用现有的 parseZodField 逻辑
    return {
      name,
      type: 'string', // 简化处理，实际应该解析 zodType
      label: name,
    };
  }

  /**
   * 标准化选项格式
   */
  private static normalizeOptions(
    options?: Array<string | { label: string; value: any }>,
  ): Array<{ label: string; value: any }> | undefined {
    if (!options) return undefined;

    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { label: opt, value: opt };
      }
      return opt;
    });
  }

  /**
   * 转换为 Formily Schema
   */
  static toFormily(fields: UnifiedField[]): ISchema {
    const properties: Record<string, ISchema> = {};

    for (const field of fields) {
      properties[field.name] = {
        type: field.type,
        title: field.label,
        description: field.description,
        default: field.default,
        'x-component': field.component,
        'x-component-props': field.componentProps,
        'x-decorator': 'FormItem',
        ...(field.required && { required: true }),
        ...(field.options && {
          enum: field.options.map((opt) => opt.value),
          'x-component-props': {
            ...field.componentProps,
            options: field.options,
          },
        }),
      };
    }

    return {
      type: 'object',
      properties,
    };
  }
}
