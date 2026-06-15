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

export type AutoCrudDataSourceContext = {
  field: string;
  search?: string;
  values?: Record<string, unknown>;
  signal?: AbortSignal;
};

export type AutoCrudDataSourceResult =
  | AutoCrudOption[]
  | {
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
      load: AutoCrudDataSourceLoader;
    };

export type AutoCrudDataSourceEntry = {
  dependencies: string[];
  reset: boolean;
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
      load: registration,
    };
  }

  return {
    dependencies: Array.isArray(registration.dependencies)
      ? registration.dependencies
      : [],
    reset: registration.reset === true,
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
