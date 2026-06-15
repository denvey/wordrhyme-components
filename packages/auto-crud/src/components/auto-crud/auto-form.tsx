'use client';

import { z } from 'zod';
import { useEffect, useMemo, useImperativeHandle, forwardRef, useState } from 'react';
import type { ComponentProps } from 'react';
import type { Field, Form as FormilyCoreForm } from '@formily/core';
import { createForm, onFieldValueChange } from '@formily/core';
import { Form, JsonSchemaField, type FormLayoutOptions } from '@pixpilot/formily-shadcn';
import { connect, mapProps } from '@formily/react';
import { Button, cn, Switch as UiSwitch } from '@pixpilot/shadcn';
import { createEditFormSchema } from '@/lib/schema-bridge/zod-to-formily';
import type { FormSchemaOverrides } from '@/lib/schema-bridge/types';
import { MultiCombobox, type MultiComboboxProps } from '@/components/ui/multi-combobox';
import {
  components,
  dataSources,
  normalizeDataSourceConfig,
  normalizeOptions,
  type AutoCrudDataSourceConfig,
} from '@/lib/registries';

interface AutoFormProps<T extends z.ZodObject<z.ZodRawShape>> {
  schema: T;
  initialValues?: Partial<z.infer<T>>;
  onSubmit: (values: z.infer<T>) => void | Promise<void>;
  overrides?: FormSchemaOverrides;
  mode?: 'create' | 'edit';
  loading?: boolean;
  gridColumns?: number;
  /** Label 对齐方式 */
  labelAlign?: 'left' | 'top' | 'right';
  /** Label 宽度（labelAlign 为 left 时有效） */
  labelWidth?: number | string;
  /** 是否显示提交按钮（默认 true） */
  showSubmitButton?: boolean;
}

export interface AutoFormRef {
  submit: () => Promise<void>;
}

type AutoCrudComboboxOption = {
  value: string;
  label: string;
  searchText?: string | string[];
  keywords?: string[];
  count?: number;
  disabled?: boolean;
};

type AutoCrudComboboxProps = Omit<
  MultiComboboxProps,
  'onChange' | 'options' | 'selectionMode' | 'value'
> & {
  value?: string;
  onChange?: (value: string) => void;
  options?: AutoCrudComboboxOption[];
};

type AutoCrudMultiComboboxProps = Omit<
  ComponentProps<typeof MultiCombobox>,
  'options'
> & {
  options?: AutoCrudComboboxOption[];
};

const COMBOBOX_LIST_CLASS =
  '[&_[cmdk-list]]:max-h-[360px] [&_[cmdk-list]]:overflow-x-hidden [&_[cmdk-list]]:overflow-y-auto';

// 使用与应用一致的 Switch 样式
const FormilySwitch = connect(
  UiSwitch,
  mapProps({
    value: 'checked',
    onInput: 'onCheckedChange',
  }),
);

const FormilyCombobox = connect(
  AutoCrudCombobox,
  mapProps({
    dataSource: 'options',
  }),
);

const FormilyMultiCombobox = connect(
  AutoCrudMultiCombobox,
  mapProps(
    {
      dataSource: 'options',
      onInput: 'onChange',
    },
    (props, field) => {
      const fieldValue = (field as Field).value;

      return {
        ...props,
        value: Array.isArray(fieldValue) ? fieldValue.map(String) : [],
      };
    },
  ),
);

function AutoCrudCombobox({
  options = [],
  className,
  value,
  onChange,
  ...props
}: AutoCrudComboboxProps) {
  return (
    <MultiCombobox
      {...props}
      value={value ? [value] : []}
      options={options}
      selectionMode="single"
      onChange={(nextValues) => onChange?.(nextValues[0] ?? '')}
      className={cn(COMBOBOX_LIST_CLASS, className)}
    />
  );
}

function AutoCrudMultiCombobox({ options = [], ...props }: AutoCrudMultiComboboxProps) {
  return <MultiCombobox {...props} options={options} />;
}

const defaultFieldComponents = {
  Combobox: { component: FormilyCombobox, decorator: 'FormItem' },
  MultiCombobox: {
    component: FormilyMultiCombobox,
    decorator: 'FormItem',
  },
  Switch: { component: FormilySwitch, decorator: 'FormItem' },
};

function useRegistryVersion(subscribe: (listener: () => void) => () => void) {
  const [version, setVersion] = useState(0);

  useEffect(() => subscribe(() => setVersion((current) => current + 1)), [subscribe]);

  return version;
}

function isDataSourceConfig(value: unknown): value is AutoCrudDataSourceConfig {
  return typeof value === 'string' && value.length > 0;
}

function collectDataSourceConfigs(
  schema: Record<string, any>,
  result: Record<string, AutoCrudDataSourceConfig> = {},
): Record<string, AutoCrudDataSourceConfig> {
  const properties = schema.properties;
  if (!properties || typeof properties !== 'object') return result;

  for (const [key, property] of Object.entries(properties)) {
    if (!property || typeof property !== 'object' || Array.isArray(property)) continue;

    const record = property as Record<string, unknown>;
    const customDataSource = record['x-data-source'];
    const schemaDataSource = record.dataSource;
    const dataSourceConfig = isDataSourceConfig(customDataSource)
      ? customDataSource
      : isDataSourceConfig(schemaDataSource)
        ? schemaDataSource
        : undefined;

    if (dataSourceConfig) result[key] = dataSourceConfig;
    collectDataSourceConfigs(record, result);
  }

  return result;
}

function useFormDataSources(form: FormilyCoreForm<any>, schema: Record<string, any>) {
  const registryVersion = useRegistryVersion(dataSources.subscribe);

  useEffect(() => {
    type SourceEntry = readonly [
      string,
      NonNullable<ReturnType<typeof normalizeDataSourceConfig>>,
    ];
    const sourceEntries = Object.entries(collectDataSourceConfigs(schema))
      .map(([fieldName, config]) => {
        const normalized = normalizeDataSourceConfig(config);
        return normalized ? ([fieldName, normalized] as const) : undefined;
      })
      .filter((entry): entry is SourceEntry => entry !== undefined);

    if (sourceEntries.length === 0) return;

    let active = true;
    const effectId = Symbol('autoCrudDataSources');
    const loadVersions = new Map<string, number>();
    const controller =
      typeof AbortController === 'undefined' ? undefined : new AbortController();

    const loadFieldOptions = async (
      fieldName: string,
      source: NonNullable<ReturnType<typeof normalizeDataSourceConfig>>,
    ) => {
      const version = (loadVersions.get(fieldName) ?? 0) + 1;
      loadVersions.set(fieldName, version);

      const entry = dataSources.get(source.key);
      if (!entry) {
        form.setFieldState(fieldName, (state) => {
          state.dataSource = [];
        });
        return;
      }

      try {
        const options = normalizeOptions(
          await entry.load({
            field: fieldName,
            values: Object.fromEntries(
              entry.dependencies.map((dependency) => [
                dependency,
                form.getValuesIn(dependency),
              ]),
            ),
            signal: controller?.signal,
          }),
        );

        if (!active || loadVersions.get(fieldName) !== version) return;
        form.setFieldState(fieldName, (state) => {
          state.dataSource = options;
        });
      } catch (error) {
        if (!active || controller?.signal.aborted) return;
        console.warn(`[AutoCrud] Failed to load data source "${source.key}".`, error);
        form.setFieldState(fieldName, (state) => {
          state.dataSource = [];
        });
      }
    };

    for (const [fieldName, source] of sourceEntries) {
      void loadFieldOptions(fieldName, source);
    }

    form.addEffects(effectId, () => {
      for (const dependency of new Set(
        sourceEntries.flatMap(
          ([, source]) => dataSources.get(source.key)?.dependencies ?? [],
        ),
      )) {
        onFieldValueChange(dependency, () => {
          for (const [fieldName, source] of sourceEntries) {
            const entry = dataSources.get(source.key);
            if (!entry?.dependencies.includes(dependency)) continue;
            if (entry.reset) form.setValuesIn(fieldName, undefined);
            void loadFieldOptions(fieldName, source);
          }
        });
      }
    });

    return () => {
      active = false;
      controller?.abort();
      form.removeEffects(effectId);
    };
  }, [form, schema, registryVersion]);
}

function AutoFormInner<T extends z.ZodObject<z.ZodRawShape>>(
  {
    schema: zodSchema,
    initialValues,
    onSubmit,
    overrides,
    mode = 'create',
    loading = false,
    gridColumns = 1,
    labelAlign = 'top',
    labelWidth,
    showSubmitButton = true,
  }: AutoFormProps<T>,
  ref: React.Ref<AutoFormRef>,
) {
  const form = useMemo(
    () => createForm({ initialValues }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(initialValues)],
  );

  const formSchema = useMemo(
    () =>
      createEditFormSchema(zodSchema, {
        overrides,
        layout: 'grid',
        gridColumns,
      }),
    [zodSchema, overrides, gridColumns],
  );
  const formLayout = useMemo<FormLayoutOptions>(() => {
    const inlineLabel = labelAlign === 'left' || labelAlign === 'right';

    return {
      labelPlacement: inlineLabel ? 'start' : 'top',
      itemProps: inlineLabel
        ? {
            label: {
              className: labelAlign === 'right' ? 'text-right' : undefined,
              style: labelWidth != null ? { width: labelWidth } : undefined,
            },
          }
        : undefined,
    };
  }, [labelAlign, labelWidth]);
  const formComponentVersion = useRegistryVersion(components.subscribe);
  const fieldComponents = useMemo(
    () => ({
      fields: {
        ...defaultFieldComponents,
        ...components.all(),
      },
    }),
    [formComponentVersion],
  );

  useFormDataSources(form, formSchema);

  const handleSubmit = async () => {
    await form.validate();
    if (form.valid) {
      await onSubmit(form.values as z.infer<T>);
    }
  };

  useImperativeHandle(ref, () => ({
    submit: handleSubmit,
  }));

  return (
    <Form form={form} layout={formLayout}>
      <JsonSchemaField schema={formSchema} components={fieldComponents} />
      {showSubmitButton && (
        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" onClick={handleSubmit} disabled={loading}>
            {loading ? '处理中...' : mode === 'create' ? '创建' : '保存'}
          </Button>
        </div>
      )}
    </Form>
  );
}

export const AutoForm = forwardRef(AutoFormInner) as <
  T extends z.ZodObject<z.ZodRawShape>,
>(
  props: AutoFormProps<T> & { ref?: React.Ref<AutoFormRef> },
) => ReturnType<typeof AutoFormInner>;
