import type {
  Field,
  FieldOption,
  Fields,
  FilterConfig,
} from '@/components/auto-crud/auto-crud-table';
import { normalizeDataSourceConfig } from './registries';

export type { Field, FieldOption, Fields, FilterConfig };

export function mergeFieldPart<T>(
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

export function mergeFields(
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

/**
 * 从统一字段配置生成 Formily overrides。
 * `legacyOverrides` 保持兼容旧 API，字段级 `form` 配置优先级最高。
 */
export function buildFormOverrides(
  fields?: Fields,
  legacyOverrides?: Record<string, any>,
  denyFields?: string[],
): Record<string, any> {
  const result: Record<string, any> = { ...legacyOverrides };

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

      if (config.form === false) {
        result[key] = {
          ...result[key],
          'x-hidden': true,
        };
      } else if (config.form && typeof config.form === 'object') {
        result[key] = {
          ...result[key],
          ...config.form,
        };
      }
    }
  }

  return result;
}
