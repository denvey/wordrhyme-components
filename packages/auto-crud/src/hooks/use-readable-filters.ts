import * as React from 'react';
import type { Column, ColumnDef } from '@tanstack/react-table';

import { applyReadableFilters, parseReadableFilters } from '@/lib/readable-filters';
import {
  getUrlParams,
  setSearchParams,
  type UrlStateOptions,
} from '@/hooks/use-url-state';
import type { ExtendedColumnFilter, FilterVariant } from '@/types/data-table';

const URL_CHANGE_EVENT = 'urlchange';

function toSearchString(params: URLSearchParams): string {
  const queryString = params.toString().replace(/%2C/g, ',');
  return queryString ? `?${queryString}` : '';
}

type ColumnLike<TData> =
  | Column<TData>
  | ColumnDef<TData, unknown>
  | { id?: string; accessorKey?: string; meta?: { variant?: FilterVariant } };

interface UseReadableFiltersOptions extends UrlStateOptions {
  debounceMs?: number;
}

export function useReadableFilters<TData>(
  columns: ColumnLike<TData>[],
  options: UseReadableFiltersOptions = {},
): [
  ExtendedColumnFilter<TData>[],
  (
    value:
      | ExtendedColumnFilter<TData>[]
      | ((prev: ExtendedColumnFilter<TData>[]) => ExtendedColumnFilter<TData>[]),
  ) => void,
] {
  const { history = 'replace', scroll = false } = options;

  const columnSnapshot = React.useMemo(() => columns, [columns]);

  // Snapshot of the last URL search string we wrote, used to skip self-triggered urlchange events
  const lastWrittenUrlRef = React.useRef<string | null>(null);
  const filtersRef = React.useRef<ExtendedColumnFilter<TData>[]>(null!);
  const [filters, setFilters] = React.useState<ExtendedColumnFilter<TData>[]>(() => {
    const initial = parseReadableFilters(getUrlParams(), columnSnapshot);
    filtersRef.current = initial;
    return initial;
  });

  // Listen for external URL changes (popstate, other hooks)
  React.useEffect(() => {
    const handleUrlChange = () => {
      // Skip if current URL matches what we last wrote (self-triggered event)
      if (
        lastWrittenUrlRef.current !== null &&
        window.location.search === lastWrittenUrlRef.current
      ) {
        lastWrittenUrlRef.current = null;
        return;
      }
      const next = parseReadableFilters(getUrlParams(), columnSnapshot);
      filtersRef.current = next;
      setFilters(next);
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener(URL_CHANGE_EVENT, handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener(URL_CHANGE_EVENT, handleUrlChange);
    };
  }, [columnSnapshot]);

  // Write filters to URL synchronously — caller controls debounce timing
  const writeToUrl = React.useCallback(
    (next: ExtendedColumnFilter<TData>[]) => {
      const params = getUrlParams();
      applyReadableFilters(params, columnSnapshot, next);
      lastWrittenUrlRef.current = toSearchString(params);
      setSearchParams(params, { history, scroll });
    },
    [columnSnapshot, history, scroll],
  );

  const updateFilters = React.useCallback(
    (
      updater:
        | ExtendedColumnFilter<TData>[]
        | ((prev: ExtendedColumnFilter<TData>[]) => ExtendedColumnFilter<TData>[]),
    ) => {
      const next = typeof updater === 'function' ? updater(filtersRef.current) : updater;
      filtersRef.current = next;
      setFilters(next);
      writeToUrl(next);
    },
    [writeToUrl],
  );

  return [filters, updateFilters];
}
