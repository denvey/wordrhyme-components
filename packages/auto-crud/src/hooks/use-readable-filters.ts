import type { Column, ColumnDef } from '@tanstack/react-table';
import type { UrlStateOptions } from '@/hooks/use-url-state';

import type {
  ExtendedColumnFilter,
  FilterVariant,
  TableFilterState,
} from '@/types/data-table';
import * as React from 'react';
import { getUrlParams, setSearchParams } from '@/hooks/use-url-state';
import {
  applyReadableFilters,
  getColumnId,
  getColumnVariant,
  parseReadableFilters,
} from '@/lib/readable-filters';

const URL_CHANGE_EVENT = 'urlchange';

function toSearchString(params: URLSearchParams): string {
  const queryString = params.toString().replace(/%2C/gu, ',');
  return queryString ? `?${queryString}` : '';
}

type ColumnLike<TData> =
  | Column<TData>
  | ColumnDef<TData, unknown>
  | { id?: string; accessorKey?: string; meta?: { variant?: FilterVariant } };

// AND/OR conditions are unordered; filter IDs and display order are UI state.
function filterSignature<TData>(filters: ExtendedColumnFilter<TData>[]): string {
  return JSON.stringify(
    filters
      .map(({ id, operator, value, variant }) => {
        let normalized = value;
        if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
          normalized = {
            include: [...value.include].sort(),
            exclude: [...value.exclude].sort(),
            match: value.match,
          };
        } else if (variant === 'multiSelect' && Array.isArray(value)) {
          normalized = [...value].sort();
        }
        return JSON.stringify([id, operator, normalized]);
      })
      .sort(),
  );
}

interface UseReadableFiltersOptions<TData> extends UrlStateOptions {
  debounceMs?: number;
  /** Reset server-side pagination when effective filters change. */
  resetPageKey?: string | false;
  state?: TableFilterState<TData>;
  /** Conditions kept in the filter state without serializing their values into the URL. */
  localFilterIds?: readonly string[];
}

const NO_LOCAL_FILTERS: readonly string[] = [];

export function useReadableFilters<TData>(
  columns: ColumnLike<TData>[],
  options: UseReadableFiltersOptions<TData> = {},
): [
  ExtendedColumnFilter<TData>[],
  (
    value:
      | ExtendedColumnFilter<TData>[]
      | ((prev: ExtendedColumnFilter<TData>[]) => ExtendedColumnFilter<TData>[]),
  ) => void,
] {
  const {
    history = 'replace',
    scroll = false,
    resetPageKey = 'page',
    state,
    localFilterIds = NO_LOCAL_FILTERS,
  } = options;

  const columnSnapshot = React.useMemo(() => columns, [columns]);
  const columnSignature = JSON.stringify(
    columnSnapshot.map((column) => [getColumnId(column), getColumnVariant(column)]),
  );
  const hydratedColumnsRef = React.useRef(columnSignature);

  // Snapshot of the last URL search string we wrote, used to skip self-triggered urlchange events
  const lastWrittenUrlRef = React.useRef<string | null>(null);
  const filtersRef = React.useRef<ExtendedColumnFilter<TData>[]>(null!);
  const [filters, setFilters] = React.useState<ExtendedColumnFilter<TData>[]>(() => {
    const initial = parseReadableFilters(getUrlParams(), columnSnapshot);
    filtersRef.current = initial;
    return initial;
  });

  const readFilters = React.useCallback(() => {
    const validIds = new Set(columnSnapshot.map(getColumnId));
    return [
      ...parseReadableFilters(getUrlParams(), columnSnapshot),
      ...filtersRef.current.filter(
        (filter) => localFilterIds.includes(filter.filterId) && validIds.has(filter.id),
      ),
    ];
  }, [columnSnapshot, localFilterIds]);

  // Providers/metadata may introduce fields after the first render. Hydrate them
  // from the URL without writing it or resetting pagination.
  React.useEffect(() => {
    if (state) return;
    // Recreated column objects must not discard local, unfinished tag conditions.
    if (hydratedColumnsRef.current === columnSignature) return;
    hydratedColumnsRef.current = columnSignature;
    const next = readFilters();
    filtersRef.current = next;
    setFilters((previous) =>
      JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
    );
  }, [columnSignature, readFilters, state]);

  // Listen for external URL changes (popstate, other hooks)
  React.useEffect(() => {
    if (state) return undefined;
    const handleUrlChange = () => {
      // Skip if current URL matches what we last wrote (self-triggered event)
      if (
        lastWrittenUrlRef.current !== null &&
        window.location.search === lastWrittenUrlRef.current
      ) {
        lastWrittenUrlRef.current = null;
        return;
      }
      const next = readFilters();
      filtersRef.current = next;
      setFilters(next);
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener(URL_CHANGE_EVENT, handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener(URL_CHANGE_EVENT, handleUrlChange);
    };
  }, [readFilters, state]);

  // Write filters to URL synchronously — caller controls debounce timing
  const writeToUrl = React.useCallback(
    (next: ExtendedColumnFilter<TData>[], previous: ExtendedColumnFilter<TData>[]) => {
      const params = getUrlParams();
      const previousFilters = [
        ...parseReadableFilters(params, columnSnapshot),
        ...previous.filter((filter) => localFilterIds.includes(filter.filterId)),
      ];
      applyReadableFilters(
        params,
        columnSnapshot,
        next.filter((filter) => !localFilterIds.includes(filter.filterId)),
      );
      const nextFilters = [
        ...parseReadableFilters(params, columnSnapshot),
        ...next.filter((filter) => localFilterIds.includes(filter.filterId)),
      ];
      if (
        resetPageKey !== false &&
        resetPageKey.length > 0 &&
        filterSignature(previousFilters) !== filterSignature(nextFilters)
      ) {
        params.delete(resetPageKey);
      }
      lastWrittenUrlRef.current = toSearchString(params);
      setSearchParams(params, { history, scroll });
    },
    [columnSnapshot, history, resetPageKey, scroll, localFilterIds],
  );

  const updateFilters = React.useCallback(
    (
      updater:
        | ExtendedColumnFilter<TData>[]
        | ((prev: ExtendedColumnFilter<TData>[]) => ExtendedColumnFilter<TData>[]),
    ) => {
      const previous = filtersRef.current;
      const next = typeof updater === 'function' ? updater(previous) : updater;
      filtersRef.current = next;
      setFilters(next);
      writeToUrl(next, previous);
    },
    [writeToUrl],
  );

  return state ? [state.filters, state.onFiltersChange] : [filters, updateFilters];
}
