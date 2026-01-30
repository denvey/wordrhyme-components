import type { Column, ColumnDef } from "@tanstack/react-table";
import { getDefaultFilterOperator } from "@/lib/data-table";
import { generateId } from "@/lib/id";
import type {
  ExtendedColumnFilter,
  FilterOperator,
  FilterVariant,
} from "@/types/data-table";

const OP_SUFFIX = "__op";
const INDEX_SEPARATOR = "__";
const RANGE_VARIANTS = new Set<FilterVariant>(["range", "dateRange"]);

type ColumnLike<TData> =
  | Column<TData>
  | ColumnDef<TData, unknown>
  | { id?: string; accessorKey?: string; meta?: { variant?: FilterVariant } };

function getColumnId<TData>(column: ColumnLike<TData>): string | null {
  if ("id" in column && column.id) return String(column.id);
  if ("accessorKey" in column && column.accessorKey) {
    return String(column.accessorKey);
  }
  return null;
}

function getColumnVariant<TData>(
  column: ColumnLike<TData>,
): FilterVariant | undefined {
  if ("columnDef" in column) {
    return column.columnDef.meta?.variant as FilterVariant | undefined;
  }
  return (column as { meta?: { variant?: FilterVariant } }).meta?.variant;
}

function splitKey(key: string): { base: string; index?: number } {
  const match = key.match(/^(.*?)(?:__(\d+))?$/);
  if (!match) return { base: key };
  const index = match[2] ? Number(match[2]) : undefined;
  return { base: match[1] ?? key, index };
}

function isFilterKey(key: string, columnIds: Set<string>): boolean {
  const rawKey = key.endsWith(OP_SUFFIX) ? key.slice(0, -OP_SUFFIX.length) : key;
  const { base } = splitKey(rawKey);
  return columnIds.has(base);
}

function parseValueByVariant(
  value: string,
  variant: FilterVariant,
): string | string[] {
  if (variant === "multiSelect") {
    return value ? value.split(",").filter(Boolean) : [];
  }

  if (RANGE_VARIANTS.has(variant)) {
    const parts = value.split(",");
    return [parts[0] ?? "", parts[1] ?? ""];
  }

  if (variant === "select") {
    const parts = value.split(",").filter(Boolean);
    return parts[0] ?? "";
  }

  return value;
}

function serializeValue(
  value: string | string[],
  variant: FilterVariant,
): string {
  if (Array.isArray(value)) {
    if (RANGE_VARIANTS.has(variant)) {
      return [value[0] ?? "", value[1] ?? ""].join(",");
    }
    return value.join(",");
  }
  return value;
}

export function parseReadableFilters<TData>(
  params: URLSearchParams,
  columns: ColumnLike<TData>[],
): ExtendedColumnFilter<TData>[] {
  const columnsById = new Map<string, ColumnLike<TData>>();
  for (const column of columns) {
    const id = getColumnId(column);
    if (id) columnsById.set(id, column);
  }

  const filters: ExtendedColumnFilter<TData>[] = [];
  for (const [key, rawValue] of params.entries()) {
    if (key.endsWith(OP_SUFFIX)) continue;

    const { base } = splitKey(key);
    const column = columnsById.get(base);
    if (!column) continue;

    const variant = (getColumnVariant(column) ?? "text") as FilterVariant;
    const opKey = `${key}${OP_SUFFIX}`;
    const operator =
      (params.get(opKey) as FilterOperator | null) ??
      getDefaultFilterOperator(variant);

    if (!rawValue && operator !== "isEmpty" && operator !== "isNotEmpty") {
      continue;
    }

    const parsedValue =
      operator === "isEmpty" || operator === "isNotEmpty"
        ? ""
        : parseValueByVariant(rawValue, variant);

    filters.push({
      id: base as Extract<keyof TData, string>,
      value: parsedValue,
      variant,
      operator,
      filterId: key || generateId({ length: 8 }),
    });
  }

  return filters;
}

export function applyReadableFilters<TData>(
  params: URLSearchParams,
  columns: ColumnLike<TData>[],
  filters: ExtendedColumnFilter<TData>[],
): URLSearchParams {
  const columnIds = new Set(
    columns.map((column) => getColumnId(column)).filter(Boolean) as string[],
  );

  for (const key of Array.from(params.keys())) {
    if (isFilterKey(key, columnIds)) {
      params.delete(key);
    }
  }

  const counters = new Map<string, number>();
  for (const filter of filters) {
    const columnId = String(filter.id);
    const count = (counters.get(columnId) ?? 0) + 1;
    counters.set(columnId, count);

    const key = count === 1 ? columnId : `${columnId}${INDEX_SEPARATOR}${count}`;
    const variant = filter.variant ?? "text";
    const value = serializeValue(filter.value, variant);

    params.set(
      key,
      filter.operator === "isEmpty" || filter.operator === "isNotEmpty"
        ? ""
        : value,
    );

    const defaultOperator = getDefaultFilterOperator(variant);
    if (filter.operator !== defaultOperator) {
      params.set(`${key}${OP_SUFFIX}`, filter.operator);
    }
  }

  return params;
}
