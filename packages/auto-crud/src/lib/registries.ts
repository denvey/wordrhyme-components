import type * as React from 'react';

export type AutoCrudFormComponentConfig = {
  component: React.ComponentType<any>;
  decorator?: string | React.ComponentType<any>;
  [key: string]: unknown;
};

export type AutoCrudOption = {
  value: string;
  label: string;
  searchText?: string | string[];
  keywords?: string[];
  count?: number;
  disabled?: boolean;
};

export type AutoCrudDataSourceContextType = 'form' | 'filter' | 'resolve';

export type AutoCrudDataSourceResolveFields =
  | readonly string[]
  | ((context: { field: string }) => readonly string[]);

export type AutoCrudDataSourceContext = {
  field: string;
  type: AutoCrudDataSourceContextType;
  page?: number;
  pageSize?: number;
  query?: string;
  /** @deprecated Use `query` instead. */
  search?: string;
  values?: Record<string, unknown> | Record<string, unknown>[];
  signal?: AbortSignal;
};

export type AutoCrudDataSourceResult =
  | AutoCrudOption[]
  | {
      hasMore?: boolean;
      options?: AutoCrudOption[];
    };

export type AutoCrudDataSourceLoader = (
  context: AutoCrudDataSourceContext,
) => AutoCrudDataSourceResult | Promise<AutoCrudDataSourceResult>;

export type AutoCrudDataSourceConfig = string;

export type AutoCrudDataSourceRegistration =
  | AutoCrudDataSourceLoader
  | {
      dependencies?: string[];
      reset?: boolean;
      search?: boolean;
      debounceMs?: number;
      loadMore?: boolean;
      pageSize?: number;
      resolveFields?: AutoCrudDataSourceResolveFields;
      load: AutoCrudDataSourceLoader;
    };

export type AutoCrudDataSourceEntry = {
  dependencies: string[];
  reset: boolean;
  search: boolean;
  debounceMs: number;
  loadMore: boolean;
  pageSize: number;
  resolveFields?: AutoCrudDataSourceResolveFields;
  load: AutoCrudDataSourceLoader;
};

type RegistryListener = () => void;

function createRegistry<T>(label: string) {
  const entries = new Map<string, T>();
  const listeners = new Set<RegistryListener>();
  let notifyScheduled = false;

  const notify = () => {
    if (notifyScheduled) return;
    notifyScheduled = true;

    queueMicrotask(() => {
      notifyScheduled = false;
      for (const listener of listeners) {
        listener();
      }
    });
  };

  return {
    register(name: string, value: T): void {
      if (entries.has(name)) {
        console.warn(`[AutoCrud] ${label} "${name}" is already registered.`);
        return;
      }

      entries.set(name, value);
      notify();
    },
    unregister(name: string): void {
      if (!entries.delete(name)) return;
      notify();
    },
    get(name: string): T | undefined {
      return entries.get(name);
    },
    all(): Record<string, T> {
      return Object.fromEntries(entries);
    },
    subscribe(listener: RegistryListener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const formComponents =
  createRegistry<AutoCrudFormComponentConfig>('form component');

export const components = formComponents;

function normalizeDataSourceRegistration(
  registration: AutoCrudDataSourceRegistration,
): AutoCrudDataSourceEntry {
  if (typeof registration === 'function') {
    return {
      dependencies: [],
      reset: false,
      search: false,
      debounceMs: 300,
      loadMore: false,
      pageSize: 20,
      load: registration,
    };
  }

  return {
    dependencies: Array.isArray(registration.dependencies)
      ? registration.dependencies
      : [],
    reset: registration.reset === true,
    search: registration.search === true,
    debounceMs:
      typeof registration.debounceMs === 'number' && registration.debounceMs >= 0
        ? registration.debounceMs
        : 300,
    loadMore: registration.loadMore === true,
    pageSize:
      typeof registration.pageSize === 'number' && registration.pageSize > 0
        ? registration.pageSize
        : 20,
    resolveFields: registration.resolveFields,
    load: registration.load,
  };
}

const dataSourceRegistry = createRegistry<AutoCrudDataSourceEntry>('data source');

export const dataSources = {
  register(name: string, registration: AutoCrudDataSourceRegistration): void {
    dataSourceRegistry.register(name, normalizeDataSourceRegistration(registration));
  },
  unregister: dataSourceRegistry.unregister,
  get: dataSourceRegistry.get,
  all: dataSourceRegistry.all,
  subscribe: dataSourceRegistry.subscribe,
};

export function normalizeDataSourceConfig(config: AutoCrudDataSourceConfig | undefined):
  | {
      key: string;
    }
  | undefined {
  if (typeof config === 'string') {
    return config.length > 0
      ? {
          key: config,
        }
      : undefined;
  }

  return undefined;
}

export function normalizeOptions(
  result: AutoCrudDataSourceResult | undefined,
): AutoCrudOption[] {
  const options = Array.isArray(result) ? result : result?.options;
  if (!Array.isArray(options)) return [];

  return options
    .filter((option): option is AutoCrudOption => {
      return (
        typeof option === 'object' &&
        option !== null &&
        typeof option.value === 'string' &&
        typeof option.label === 'string'
      );
    })
    .map((option) => ({
      ...option,
      value: String(option.value),
    }));
}

export function normalizeHasMore(result: AutoCrudDataSourceResult | undefined): boolean {
  return !Array.isArray(result) && result?.hasMore === true;
}
