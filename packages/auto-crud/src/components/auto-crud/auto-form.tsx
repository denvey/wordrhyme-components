'use client';

import { z } from 'zod';
import {
  useCallback,
  useEffect,
  useMemo,
  useImperativeHandle,
  forwardRef,
  useState,
} from 'react';
import type { Field } from '@formily/core';
import { createForm } from '@formily/core';
import { action, observable } from '@formily/reactive';
import {
  connect,
  Form,
  JsonSchemaField,
  mapProps,
  type FormLayoutOptions,
  type JsonSchemaFormScope,
} from '@wordrhyme/formily-shadcn';
import { Button, cn, Switch as UiSwitch } from '@wordrhyme/shadcn';
import { createEditFormSchema } from '@/lib/schema-bridge/zod-to-formily';
import type { FormSchemaOverrides } from '@/lib/schema-bridge/types';
import { buildFormOverrides, type Fields } from '@/lib/field-config';
import {
  Select,
  type SelectSearchableMultipleProps,
  type SelectSearchableSingleProps,
} from '@wordrhyme/shadcn-ui';
import {
  components,
  dataSources,
  normalizeHasMore,
  normalizeDataSourceConfig,
  normalizeOptions,
  type AutoCrudDataSourceConfig,
  type AutoCrudDataSourceEntry,
} from '@/lib/registries';

export interface AutoFormProps<T extends z.ZodObject<z.ZodRawShape>> {
  schema: T;
  initialValues?: Partial<z.infer<T>>;
  onSubmit: (values: z.infer<T>) => void | Promise<void>;
  /** 统一字段配置，推荐用于描述 auto-crud 字段级表单行为 */
  fields?: Fields;
  /** Formily 字段 schema 覆盖配置，保留兼容旧 API */
  overrides?: FormSchemaOverrides;
  /** Formily schema expression/reaction scope */
  scope?: JsonSchemaFormScope;
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
  SelectSearchableSingleProps,
  'mode' | 'multiple' | 'onChange' | 'options' | 'value'
> & {
  value?: string;
  onChange?: (value: string) => void;
  options?: AutoCrudComboboxOption[];
};

type AutoCrudMultiComboboxProps = Omit<
  SelectSearchableMultipleProps,
  'mode' | 'multiple' | 'options'
> & {
  options?: AutoCrudComboboxOption[];
};

const COMBOBOX_LIST_CLASS =
  '[&_[data-multi-combobox-viewport]]:max-h-[360px] [&_[data-multi-combobox-viewport]]:overflow-x-hidden [&_[data-multi-combobox-viewport]]:overflow-y-auto';

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
      const fieldValue =
        field && typeof field === 'object' && 'value' in field
          ? (field as Field).value
          : props.value;

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
    <Select
      {...props}
      mode="searchable"
      value={value ?? ''}
      options={options}
      onChange={(nextValue: string) => onChange?.(nextValue)}
      className={cn(COMBOBOX_LIST_CLASS, className)}
    />
  );
}

function AutoCrudMultiCombobox({ options = [], ...props }: AutoCrudMultiComboboxProps) {
  return <Select {...props} mode="searchable" multiple options={options} />;
}

const defaultFieldComponents = {
  Combobox: { component: FormilyCombobox, decorator: 'FormItem' },
  MultiCombobox: {
    component: FormilyMultiCombobox,
    decorator: 'FormItem',
  },
  Switch: { component: FormilySwitch, decorator: 'FormItem' },
};

const AUTO_CRUD_DATA_SOURCE_SCOPE_KEY = '$autoCrudDataSource';

type AutoCrudDataSourceReactionState = {
  controller?: AbortController;
  dependencyKey?: string;
  initialized: boolean;
  hasMore: boolean;
  loadKey?: string;
  appendLoading: boolean;
  options: AutoCrudComboboxOption[];
  page: number;
  registryVersion?: number;
  requestVersion: number;
  search?: string;
  searchTimer?: ReturnType<typeof setTimeout>;
};

type AutoCrudDataSourceRegistryState = {
  version: number;
};

const POPUP_SCROLL_LOAD_THRESHOLD = 24;

const dataSourceReactionStates = new WeakMap<Field, AutoCrudDataSourceReactionState>();

function createBoundAction<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
): (...args: TArgs) => void {
  return action.bound?.(callback) ?? ((...args) => action(() => callback(...args)));
}

function useRegistryVersion(
  subscribe: (listener: () => void) => () => void,
  onChange?: () => void,
) {
  const [version, setVersion] = useState(0);

  useEffect(
    () =>
      subscribe(() => {
        onChange?.();
        setVersion((current) => current + 1);
      }),
    [onChange, subscribe],
  );

  return version;
}

function isDataSourceConfig(value: unknown): value is AutoCrudDataSourceConfig {
  return typeof value === 'string' && value.length > 0;
}

function getSchemaDataSourceConfig(
  schema: Record<string, unknown>,
): AutoCrudDataSourceConfig | undefined {
  const customDataSource = schema['x-data-source'];
  const schemaDataSource = schema.dataSource;

  return isDataSourceConfig(customDataSource)
    ? customDataSource
    : isDataSourceConfig(schemaDataSource)
      ? schemaDataSource
      : undefined;
}

function mergeReactions(existing: unknown, reaction: string): unknown {
  if (existing == null) return reaction;
  if (existing === reaction) return existing;
  if (Array.isArray(existing)) {
    return existing.includes(reaction) ? existing : [...existing, reaction];
  }

  return [existing, reaction];
}

function applyDataSourceReactions(schema: Record<string, any>): void {
  const dataSourceConfig = getSchemaDataSourceConfig(schema);
  if (dataSourceConfig) {
    const reaction = `{{${AUTO_CRUD_DATA_SOURCE_SCOPE_KEY}(${JSON.stringify(
      dataSourceConfig,
    )})}}`;
    schema['x-reactions'] = mergeReactions(schema['x-reactions'], reaction);
  }

  const properties = schema.properties;
  if (properties && typeof properties === 'object' && !Array.isArray(properties)) {
    for (const property of Object.values(properties)) {
      if (property && typeof property === 'object' && !Array.isArray(property)) {
        applyDataSourceReactions(property as Record<string, any>);
      }
    }
  }

  const items = schema.items;
  if (Array.isArray(items)) {
    for (const item of items) {
      if (item && typeof item === 'object') {
        applyDataSourceReactions(item as Record<string, any>);
      }
    }
  } else if (items && typeof items === 'object') {
    applyDataSourceReactions(items as Record<string, any>);
  }
}

function getDataSourceReactionState(field: Field): AutoCrudDataSourceReactionState {
  const existing = dataSourceReactionStates.get(field);
  if (existing) return existing;

  const next: AutoCrudDataSourceReactionState = {
    hasMore: false,
    initialized: false,
    appendLoading: false,
    options: [],
    page: 0,
    requestVersion: 0,
  };
  dataSourceReactionStates.set(field, next);
  return next;
}

function mergeDataSourceOptions(
  current: AutoCrudComboboxOption[],
  incoming: AutoCrudComboboxOption[],
) {
  const optionsByValue = new Map(current.map((option) => [option.value, option]));
  for (const option of incoming) {
    optionsByValue.set(option.value, option);
  }

  return Array.from(optionsByValue.values());
}

function isNearPopupScrollBottom(target: HTMLElement) {
  return (
    target.scrollHeight - target.scrollTop - target.clientHeight <=
    POPUP_SCROLL_LOAD_THRESHOLD
  );
}

function getDataSourceDependencyValues(entry: AutoCrudDataSourceEntry, field: Field) {
  return Object.fromEntries(
    entry.dependencies.map((dependency) => [
      dependency,
      field.form.getValuesIn(dependency),
    ]),
  );
}

function loadAutoCrudDataSource({
  entry,
  field,
  registryVersion,
  search,
  sourceKey,
  state,
  append = false,
}: {
  entry: AutoCrudDataSourceEntry;
  field: Field;
  registryVersion: number;
  search?: string;
  sourceKey: string;
  state: AutoCrudDataSourceReactionState;
  append?: boolean;
}) {
  const values = getDataSourceDependencyValues(entry, field);
  const dependencyKey = JSON.stringify(values);
  const searchValue = entry.search ? (search ?? '') : undefined;
  const page = entry.loadMore ? (append ? state.page + 1 : 1) : undefined;
  const loadKey = JSON.stringify({
    values,
    search: searchValue,
  });

  if (!append && state.loadKey === loadKey && state.registryVersion === registryVersion) {
    return;
  }

  if (
    entry.reset &&
    state.dependencyKey !== undefined &&
    state.dependencyKey !== dependencyKey
  ) {
    field.setValue(undefined);
  }

  state.dependencyKey = dependencyKey;
  if (!append) {
    state.loadKey = loadKey;
    state.options = [];
    state.page = 0;
    state.hasMore = false;
  }
  state.registryVersion = registryVersion;
  state.controller?.abort();

  const requestVersion = state.requestVersion + 1;
  state.requestVersion = requestVersion;
  const controller =
    typeof AbortController === 'undefined' ? undefined : new AbortController();
  state.controller = controller;

  if (append) {
    state.appendLoading = true;
    field.setComponentProps({ loading: true });
  } else {
    field.setLoading(true);
    field.setComponentProps({
      loading: true,
      ...(entry.loadMore ? { hasMore: false } : {}),
    });
  }

  void Promise.resolve(
    entry.load({
      field: field.path.toString(),
      type: 'form',
      page,
      pageSize: entry.loadMore ? entry.pageSize : undefined,
      query: searchValue,
      search: searchValue,
      values,
      signal: controller?.signal,
    }),
  ).then(
    createBoundAction((result) => {
      if (
        dataSourceReactionStates.get(field)?.requestVersion !== requestVersion ||
        controller?.signal.aborted
      ) {
        return;
      }

      const options = normalizeOptions(result);
      const nextOptions = append
        ? mergeDataSourceOptions(state.options, options)
        : options;
      state.options = nextOptions;
      state.page = page ?? 0;
      state.hasMore = entry.loadMore ? normalizeHasMore(result) : false;
      state.appendLoading = false;
      field.setDataSource(nextOptions);
      field.setLoading(false);
      field.setComponentProps({
        loading: false,
        ...(entry.loadMore ? { hasMore: state.hasMore } : {}),
      });
    }),
    createBoundAction((error: unknown) => {
      if (
        dataSourceReactionStates.get(field)?.requestVersion !== requestVersion ||
        controller?.signal.aborted
      ) {
        return;
      }

      console.warn(`[AutoCrud] Failed to load data source "${sourceKey}".`, error);
      if (!append) {
        state.options = [];
        state.hasMore = false;
        field.setDataSource([]);
      }
      state.appendLoading = false;
      field.setLoading(false);
      field.setComponentProps({
        loading: false,
        ...(entry.loadMore ? { hasMore: state.hasMore } : {}),
      });
    }),
  );
}

function applySearchComponentProps({
  entry,
  field,
  registryState,
  sourceKey,
  state,
}: {
  entry: AutoCrudDataSourceEntry;
  field: Field;
  registryState: AutoCrudDataSourceRegistryState;
  sourceKey: string;
  state: AutoCrudDataSourceReactionState;
}) {
  if (!entry.search) return;

  field.setComponentProps({
    searchValue: state.search ?? '',
    shouldFilter: false,
    onSearch: (search: string) => {
      if (state.search === search) return;

      state.search = search;
      field.setComponentProps({ searchValue: search });

      if (state.searchTimer) {
        clearTimeout(state.searchTimer);
      }

      state.searchTimer = setTimeout(() => {
        const currentEntry = dataSources.get(sourceKey);
        if (!currentEntry) {
          state.controller?.abort();
          field.setDataSource([]);
          field.setLoading(false);
          field.setComponentProps({ loading: false });
          return;
        }

        loadAutoCrudDataSource({
          entry: currentEntry,
          field,
          registryVersion: registryState.version,
          search,
          sourceKey,
          state,
        });
      }, entry.debounceMs);
    },
  });
}

function applyLoadMoreComponentProps({
  entry,
  field,
  registryState,
  sourceKey,
  state,
}: {
  entry: AutoCrudDataSourceEntry;
  field: Field;
  registryState: AutoCrudDataSourceRegistryState;
  sourceKey: string;
  state: AutoCrudDataSourceReactionState;
}) {
  if (!entry.loadMore) return;

  field.setComponentProps({
    hasMore: state.hasMore,
    loading: state.appendLoading,
    onPopupScroll: (event: React.UIEvent<HTMLElement>) => {
      if (!isNearPopupScrollBottom(event.currentTarget)) return;
      if (!state.hasMore || state.appendLoading) return;

      const currentEntry = dataSources.get(sourceKey);
      if (!currentEntry) {
        state.controller?.abort();
        state.hasMore = false;
        state.appendLoading = false;
        field.setDataSource([]);
        field.setLoading(false);
        field.setComponentProps({ hasMore: false, loading: false });
        return;
      }

      loadAutoCrudDataSource({
        append: true,
        entry: currentEntry,
        field,
        registryVersion: registryState.version,
        search: state.search,
        sourceKey,
        state,
      });
    },
  });
}

function createAutoCrudDataSourceReaction(
  config: AutoCrudDataSourceConfig,
  registryState: AutoCrudDataSourceRegistryState,
) {
  const source = normalizeDataSourceConfig(config);

  return (field: Field) => {
    const registryVersion = registryState.version;
    const state = getDataSourceReactionState(field);
    if (!state.initialized) {
      field.disposers.push(() => {
        state.controller?.abort();
        if (state.searchTimer) clearTimeout(state.searchTimer);
      });
      state.initialized = true;
    }

    if (!source) {
      field.setDataSource([]);
      field.setLoading(false);
      return;
    }

    const entry = dataSources.get(source.key);
    if (!entry) {
      state.controller?.abort();
      field.setDataSource([]);
      field.setLoading(false);
      return;
    }

    applySearchComponentProps({
      entry,
      field,
      registryState,
      sourceKey: source.key,
      state,
    });
    applyLoadMoreComponentProps({
      entry,
      field,
      registryState,
      sourceKey: source.key,
      state,
    });
    loadAutoCrudDataSource({
      entry,
      field,
      registryVersion,
      search: state.search,
      sourceKey: source.key,
      state,
    });
  };
}

function AutoFormInner<T extends z.ZodObject<z.ZodRawShape>>(
  {
    schema: zodSchema,
    initialValues,
    onSubmit,
    fields,
    overrides,
    scope: scopeProp,
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
  const dataSourceRegistryState = useMemo(
    () => observable<AutoCrudDataSourceRegistryState>({ version: 0 }),
    [],
  );
  const updateDataSourceRegistryState = useCallback(() => {
    action(() => {
      dataSourceRegistryState.version += 1;
    });
  }, [dataSourceRegistryState]);
  const dataSourceRegistryVersion = useRegistryVersion(
    dataSources.subscribe,
    updateDataSourceRegistryState,
  );
  const formOverrides = useMemo(
    () => buildFormOverrides(fields, overrides),
    [fields, overrides],
  );

  const formSchema = useMemo(() => {
    const nextSchema = createEditFormSchema(zodSchema, {
      overrides: formOverrides,
      layout: 'grid',
      gridColumns,
    });

    applyDataSourceReactions(nextSchema);

    return nextSchema;
  }, [zodSchema, formOverrides, gridColumns, dataSourceRegistryVersion]);
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
  const scope = useMemo<JsonSchemaFormScope>(
    () => ({
      ...scopeProp,
      [AUTO_CRUD_DATA_SOURCE_SCOPE_KEY]: (config: AutoCrudDataSourceConfig) =>
        createAutoCrudDataSourceReaction(config, dataSourceRegistryState),
    }),
    [dataSourceRegistryState, scopeProp],
  );

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
      <JsonSchemaField schema={formSchema} components={fieldComponents} scope={scope} />
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
