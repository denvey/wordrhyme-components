import * as React from 'react';

/**
 * URL 状态管理 Hook - 替代 nuqs
 * 将 React 状态同步到 URL query string
 *
 * 架构说明：
 * - 使用 queueMicrotask 延迟 URL 更新，确保在渲染完成后执行
 * - 符合 React 渲染规则，不会触发 "Cannot update a component while rendering" 错误
 */

export interface UrlStateOptions {
  /** 历史记录模式: push 添加新记录, replace 替换当前记录 */
  history?: 'push' | 'replace';
  /** 是否浅层更新（不触发页面刷新） */
  shallow?: boolean;
  /** 节流时间（毫秒） */
  throttleMs?: number;
  /** 防抖时间（毫秒） */
  debounceMs?: number;
  /** 当值等于默认值时是否清除 URL 参数 */
  clearOnDefault?: boolean;
  /** 滚动到顶部 */
  scroll?: boolean;
  /** React transition */
  startTransition?: React.TransitionStartFunction;
}

export interface Parser<T> {
  parse: (value: string) => T;
  serialize: (value: T) => string;
}

// ============ 内置 Parser ============

export const parseAsInteger: Parser<number> & {
  withDefault: (defaultValue: number) => Parser<number> & { defaultValue: number };
} = {
  parse: (value: string) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  },
  serialize: (value: number) => String(value),
  withDefault: (defaultValue: number) => ({
    parse: (value: string) => {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? defaultValue : parsed;
    },
    serialize: (value: number) => String(value),
    defaultValue,
  }),
};

export const parseAsString: Parser<string> & {
  withDefault: (defaultValue: string) => Parser<string> & { defaultValue: string };
} = {
  parse: (value: string) => value,
  serialize: (value: string) => value,
  withDefault: (defaultValue: string) => ({
    parse: (value: string) => value || defaultValue,
    serialize: (value: string) => value,
    defaultValue,
  }),
};

export function parseAsStringEnum<T extends string>(
  validValues: readonly T[],
): Parser<T | null> & {
  withDefault: (defaultValue: T) => Parser<T> & { defaultValue: T };
} {
  return {
    parse: (value: string) => {
      return validValues.includes(value as T) ? (value as T) : null;
    },
    serialize: (value: T | null) => value ?? '',
    withDefault: (defaultValue: T) => ({
      parse: (value: string) => {
        return validValues.includes(value as T) ? (value as T) : defaultValue;
      },
      serialize: (value: T) => value,
      defaultValue,
    }),
  };
}

export function parseAsArrayOf<T>(
  itemParser: Parser<T>,
  separator = ',',
): Parser<T[]> & {
  withDefault: (defaultValue: T[]) => Parser<T[]> & { defaultValue: T[] };
} {
  return {
    parse: (value: string) => {
      if (!value) return [];
      return value.split(separator).map((item) => itemParser.parse(item));
    },
    serialize: (value: T[]) => {
      return value.map((item) => itemParser.serialize(item)).join(separator);
    },
    withDefault: (defaultValue: T[]) => ({
      parse: (value: string) => {
        if (!value) return defaultValue;
        return value.split(separator).map((item) => itemParser.parse(item));
      },
      serialize: (value: T[]) => {
        return value.map((item) => itemParser.serialize(item)).join(separator);
      },
      defaultValue,
    }),
  };
}

// ============ URL 操作工具 ============

export function getUrlParams(): URLSearchParams {
  if (typeof window === 'undefined') {
    return new URLSearchParams();
  }
  return new URLSearchParams(window.location.search);
}

const URL_CHANGE_EVENT = 'urlchange';

function updateUrl(
  params: URLSearchParams,
  options: Pick<UrlStateOptions, 'history' | 'scroll'>,
): void {
  if (typeof window === 'undefined') return;

  const queryString = params.toString().replace(/%2C/g, ',');
  const newUrl = queryString
    ? `${window.location.pathname}?${queryString}`
    : window.location.pathname;

  if (options.history === 'push') {
    window.history.pushState(null, '', newUrl);
  } else {
    window.history.replaceState(null, '', newUrl);
  }

  window.dispatchEvent(new Event(URL_CHANGE_EVENT));

  if (options.scroll) {
    window.scrollTo(0, 0);
  }
}

export function setSearchParams(
  params: URLSearchParams,
  options: Pick<UrlStateOptions, 'history' | 'scroll'> = {},
): void {
  updateUrl(params, {
    history: options.history ?? 'replace',
    scroll: options.scroll ?? false,
  });
}

// ============ Core Hooks ============

/**
 * 单个 URL 状态参数
 */
export function useUrlState<T>(
  key: string,
  parser: Parser<T> & { defaultValue?: T },
  options: UrlStateOptions = {},
): [T, (value: T | ((prev: T) => T)) => void] {
  const { history = 'replace', clearOnDefault = true, scroll = false } = options;

  const defaultValue = (parser as { defaultValue?: T }).defaultValue as T;

  const [value, setValueInternal] = React.useState<T>(() => {
    const params = getUrlParams();
    const raw = params.get(key);
    if (raw === null) {
      return defaultValue;
    }
    return parser.parse(raw);
  });

  // 监听浏览器前进/后退
  React.useEffect(() => {
    const handleUrlChange = () => {
      const params = getUrlParams();
      const raw = params.get(key);
      if (raw === null) {
        setValueInternal(defaultValue);
      } else {
        setValueInternal(parser.parse(raw));
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener(URL_CHANGE_EVENT, handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener(URL_CHANGE_EVENT, handleUrlChange);
    };
  }, [key, parser, defaultValue]);

  // 存储配置的 refs，避免在 callback 中捕获过时的值
  const optionsRef = React.useRef({
    key,
    parser,
    defaultValue,
    history,
    clearOnDefault,
    scroll,
  });
  optionsRef.current = { key, parser, defaultValue, history, clearOnDefault, scroll };

  const setValue = React.useCallback((updater: T | ((prev: T) => T)) => {
    setValueInternal((prev) => {
      const newValue =
        typeof updater === 'function' ? (updater as (prev: T) => T)(prev) : updater;

      // 使用 queueMicrotask 延迟 URL 更新到渲染完成后
      queueMicrotask(() => {
        const { key, parser, defaultValue, history, clearOnDefault, scroll } =
          optionsRef.current;
        const params = getUrlParams();
        const serialized = parser.serialize(newValue);
        const defaultSerialized =
          defaultValue !== undefined ? parser.serialize(defaultValue) : '';

        if (clearOnDefault && serialized === defaultSerialized) {
          params.delete(key);
        } else if (serialized) {
          params.set(key, serialized);
        } else {
          params.delete(key);
        }

        updateUrl(params, { history, scroll });
      });

      return newValue;
    });
  }, []);

  return [value, setValue];
}

/**
 * 多个 URL 状态参数
 */
export function useUrlStates<T extends Record<string, unknown>>(
  parsers: { [K in keyof T]: Parser<T[K]> & { defaultValue?: T[K] } },
  options: UrlStateOptions = {},
): [T, (values: Partial<T>) => void] {
  const { history = 'replace', clearOnDefault = true, scroll = false } = options;

  const [values, setValuesInternal] = React.useState<T>(() => {
    const params = getUrlParams();
    const result = {} as T;

    for (const [key, parser] of Object.entries(parsers)) {
      const raw = params.get(key);
      const defaultValue = (parser as { defaultValue?: unknown }).defaultValue;
      if (raw === null) {
        result[key as keyof T] = defaultValue as T[keyof T];
      } else {
        result[key as keyof T] = parser.parse(raw) as T[keyof T];
      }
    }

    return result;
  });

  // 监听浏览器前进/后退
  React.useEffect(() => {
    const handleUrlChange = () => {
      const params = getUrlParams();
      const result = {} as T;

      for (const [key, parser] of Object.entries(parsers)) {
        const raw = params.get(key);
        const defaultValue = (parser as { defaultValue?: unknown }).defaultValue;
        if (raw === null) {
          result[key as keyof T] = defaultValue as T[keyof T];
        } else {
          result[key as keyof T] = parser.parse(raw) as T[keyof T];
        }
      }

      setValuesInternal(result);
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener(URL_CHANGE_EVENT, handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener(URL_CHANGE_EVENT, handleUrlChange);
    };
  }, [parsers]);

  // 存储配置的 refs
  const optionsRef = React.useRef({ parsers, history, clearOnDefault, scroll });
  optionsRef.current = { parsers, history, clearOnDefault, scroll };

  const setValues = React.useCallback((updates: Partial<T>) => {
    setValuesInternal((prev) => {
      const newValues = { ...prev, ...updates };

      // 使用 queueMicrotask 延迟 URL 更新到渲染完成后
      queueMicrotask(() => {
        const { parsers, history, clearOnDefault, scroll } = optionsRef.current;
        const params = getUrlParams();

        for (const [key, value] of Object.entries(updates)) {
          const parser = parsers[key as keyof T];
          if (!parser) continue;

          const serialized = parser.serialize(value as T[keyof T]);
          const defaultValue = (parser as { defaultValue?: unknown }).defaultValue;
          const defaultSerialized =
            defaultValue !== undefined
              ? parser.serialize(defaultValue as T[keyof T])
              : '';

          if (clearOnDefault && serialized === defaultSerialized) {
            params.delete(key);
          } else if (serialized) {
            params.set(key, serialized);
          } else {
            params.delete(key);
          }
        }

        updateUrl(params, { history, scroll });
      });

      return newValues;
    });
  }, []);

  return [values, setValues];
}

// ============ 兼容 nuqs API 的包装器 ============

/**
 * nuqs 兼容层 - useQueryState
 */
export function useQueryState<T>(
  key: string,
  parser: Parser<T> & { defaultValue?: T },
  options: UrlStateOptions = {},
): [T, (value: T | ((prev: T) => T)) => Promise<URLSearchParams>] {
  const [value, setValue] = useUrlState(key, parser, options);

  const setValueAsync = React.useCallback(
    (updater: T | ((prev: T) => T)) => {
      setValue(updater);
      // 返回一个在 microtask 后 resolve 的 Promise
      return new Promise<URLSearchParams>((resolve) => {
        queueMicrotask(() => {
          resolve(getUrlParams());
        });
      });
    },
    [setValue],
  );

  return [value, setValueAsync];
}

/**
 * nuqs 兼容层 - useQueryStates
 */
export function useQueryStates<T extends Record<string, unknown>>(
  parsers: { [K in keyof T]: Parser<T[K]> & { defaultValue?: T[K] } },
  options: UrlStateOptions = {},
): [T, (values: Partial<T>) => Promise<URLSearchParams>] {
  const [values, setValues] = useUrlStates(parsers, options);

  const setValuesAsync = React.useCallback(
    (updates: Partial<T>) => {
      setValues(updates);
      // 返回一个在 microtask 后 resolve 的 Promise
      return new Promise<URLSearchParams>((resolve) => {
        queueMicrotask(() => {
          resolve(getUrlParams());
        });
      });
    },
    [setValues],
  );

  return [values, setValuesAsync];
}
