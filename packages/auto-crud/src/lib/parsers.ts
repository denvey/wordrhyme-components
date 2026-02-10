import { z } from "zod";

import { dataTableConfig } from "@/config/data-table";
import type { Parser } from "@/hooks/use-url-state";

import type {
  ExtendedColumnFilter,
  ExtendedColumnSort,
} from "@/types/data-table";

/**
 * 创建自定义 Parser（替代 nuqs 的 createParser）
 */
function createParser<T>(config: {
  parse: (value: string) => T | null;
  serialize: (value: T) => string;
}): Parser<T | null> & {
  withDefault: (defaultValue: T) => Parser<T> & { defaultValue: T };
} {
  return {
    parse: config.parse,
    serialize: (value: T | null) => (value === null ? "" : config.serialize(value)),
    withDefault: (defaultValue: T) => ({
      parse: (value: string) => {
        const parsed = config.parse(value);
        return parsed === null ? defaultValue : parsed;
      },
      serialize: config.serialize,
      defaultValue,
    }),
  };
}

export const getSortingStateParser = <TData>(
  columnIds?: string[] | Set<string>,
) => {
  const validKeys = columnIds
    ? columnIds instanceof Set
      ? columnIds
      : new Set(columnIds)
    : null;

  return createParser({
    parse: (value) => {
      try {
        if (!value || value.trim() === "") return [];

        // Format: "id.desc,id2.asc" e.g. "createdAt.desc,name.asc"
        const items = value.split(",").map((item) => {
          const lastDot = item.lastIndexOf(".");
          if (lastDot === -1) return null;
          const id = item.slice(0, lastDot);
          const dir = item.slice(lastDot + 1);
          if (!id || (dir !== "asc" && dir !== "desc")) return null;
          return { id, desc: dir === "desc" };
        });

        if (items.some((item) => item === null)) return null;

        const result = items as Array<{ id: string; desc: boolean }>;

        if (validKeys && result.some((item) => !validKeys.has(item.id))) {
          return null;
        }

        return result as ExtendedColumnSort<TData>[];
      } catch {
        return null;
      }
    },
    serialize: (value) =>
      value.map((item) => `${item.id}.${item.desc ? "desc" : "asc"}`).join(","),
  });
};

const filterItemSchema = z.object({
  id: z.string(),
  value: z.union([z.string(), z.array(z.string())]),
  variant: z.enum(dataTableConfig.filterVariants),
  operator: z.enum(dataTableConfig.operators),
  filterId: z.string(),
});

export type FilterItemSchema = z.infer<typeof filterItemSchema>;

export const getFiltersStateParser = <TData>(
  columnIds?: string[] | Set<string>,
) => {
  const validKeys = columnIds
    ? columnIds instanceof Set
      ? columnIds
      : new Set(columnIds)
    : null;

  return createParser({
    parse: (value) => {
      try {
        const parsed = JSON.parse(value);
        const result = z.array(filterItemSchema).safeParse(parsed);

        if (!result.success) return null;

        if (validKeys && result.data.some((item) => !validKeys.has(item.id))) {
          return null;
        }

        return result.data as ExtendedColumnFilter<TData>[];
      } catch {
        return null;
      }
    },
    serialize: (value) => JSON.stringify(value),
  });
};
