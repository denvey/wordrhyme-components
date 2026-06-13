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

export type AutoCrudDataSourceConfig =
  | string
  | {
      key: string;
      dependsOn?: string[];
      resetOnChange?: boolean;
    };

type RegistryListener = () => void;

function createRegistry<T>(label: string) {
  const entries = new Map<string, T>();
  const listeners = new Set<RegistryListener>();

  const notify = () => {
    queueMicrotask(() => {
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
export const dataSources = createRegistry<AutoCrudDataSourceLoader>('data source');

export function normalizeDataSourceConfig(config: AutoCrudDataSourceConfig | undefined):
  | {
      key: string;
      dependsOn: string[];
      resetOnChange: boolean;
    }
  | undefined {
  if (typeof config === 'string') {
    return config.length > 0
      ? {
          key: config,
          dependsOn: [],
          resetOnChange: false,
        }
      : undefined;
  }

  if (!config?.key) return undefined;

  return {
    key: config.key,
    dependsOn: Array.isArray(config.dependsOn) ? config.dependsOn : [],
    resetOnChange: config.resetOnChange === true,
  };
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
