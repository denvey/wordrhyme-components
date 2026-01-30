import * as React from "react";
import type { Column, ColumnDef } from "@tanstack/react-table";

import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import {
  applyReadableFilters,
  parseReadableFilters,
} from "@/lib/readable-filters";
import {
  getUrlParams,
  setSearchParams,
  type UrlStateOptions,
} from "@/hooks/use-url-state";
import type { ExtendedColumnFilter, FilterVariant } from "@/types/data-table";

const URL_CHANGE_EVENT = "urlchange";

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
        | ((
          prev: ExtendedColumnFilter<TData>[],
        ) => ExtendedColumnFilter<TData>[]),
    ) => void,
  ] {
  const { debounceMs = 300, history = "replace", scroll = false } = options;

  const columnSnapshot = React.useMemo(() => columns, [columns]);

  const skipWriteRef = React.useRef(true);
  const [filters, setFilters] = React.useState<ExtendedColumnFilter<TData>[]>(() =>
    parseReadableFilters(getUrlParams(), columnSnapshot),
  );

  React.useEffect(() => {
    const handleUrlChange = () => {
      skipWriteRef.current = true;
      setFilters(parseReadableFilters(getUrlParams(), columnSnapshot));
    };

    window.addEventListener("popstate", handleUrlChange);
    window.addEventListener(URL_CHANGE_EVENT, handleUrlChange);
    return () => {
      window.removeEventListener("popstate", handleUrlChange);
      window.removeEventListener(URL_CHANGE_EVENT, handleUrlChange);
    };
  }, [columnSnapshot]);

  const writeFilters = React.useCallback(
    (next: ExtendedColumnFilter<TData>[]) => {
      const params = getUrlParams();
      applyReadableFilters(params, columnSnapshot, next);
      setSearchParams(params, { history, scroll });
    },
    [columnSnapshot, history, scroll],
  );

  const updateFilters = React.useCallback(
    (
      updater:
        | ExtendedColumnFilter<TData>[]
        | ((
          prev: ExtendedColumnFilter<TData>[],
        ) => ExtendedColumnFilter<TData>[]),
    ) => {
      setFilters((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        return next;
      });
    },
    [],
  );

  const debouncedWrite = useDebouncedCallback(writeFilters, debounceMs);

  React.useEffect(() => {
    if (skipWriteRef.current) {
      skipWriteRef.current = false;
      return;
    }
    if (debounceMs > 0) {
      debouncedWrite(filters);
    } else {
      writeFilters(filters);
    }
  }, [filters, debounceMs, debouncedWrite, writeFilters]);

  return [filters, updateFilters];
}
