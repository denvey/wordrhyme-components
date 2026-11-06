import type { z } from 'zod';
import type { FilterItemSchema } from '@/lib/parsers';
import { parseZodField } from '@/lib/schema-bridge/zod-to-columns';

export const BATCH_SEARCH_FILTER_ID = 'batch-search';
export const BATCH_SEARCH_LOCAL_IDS = [BATCH_SEARCH_FILTER_ID] as const;

export function isBatchSearchFilter<TFilter extends FilterItemSchema>(
  filter: TFilter,
): filter is TFilter & BatchSearchFilter {
  return (
    filter.filterId === BATCH_SEARCH_FILTER_ID &&
    filter.operator === 'inArray' &&
    (filter.variant === 'text' || filter.variant === 'number') &&
    Array.isArray(filter.value)
  );
}

export interface BatchSearchConfig {
  /** Maximum unique values per query. Defaults to 2000. */
  maxItems?: number;
}

export interface BatchSearchFilter {
  id: string;
  value: string[];
  variant: 'text' | 'number';
  operator: 'inArray';
  filterId: string;
}

export interface BatchSearchState {
  filter: BatchSearchFilter | null;
  onFilterChange: (filter: BatchSearchFilter | null) => void;
}

export interface BatchSearchField {
  id: string;
  label: string;
}

export type BatchSearchIssue =
  | { type: 'columns' | 'invalid'; lines: number[] }
  | { type: 'limit'; maxItems: number };

/** Preserve string identifiers; normalize numbers only after schema validation. */
export function parseBatchSearchInput(
  input: string,
  schema: z.ZodType,
  maxItems: number,
): { values: string[]; duplicates: number; issue: BatchSearchIssue | null } {
  const { type } = parseZodField(schema);
  const values = new Set<string>();
  const columns: number[] = [];
  const invalid: number[] = [];
  let duplicates = 0;

  input.split(/\r\n|\n|\r/u).forEach((line, index) => {
    if (line.includes('\t')) {
      columns.push(index + 1);
      return;
    }
    const value = line.trim();
    if (!value) return;
    if (
      type === 'number' &&
      !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/iu.test(value)
    ) {
      invalid.push(index + 1);
      return;
    }
    const candidate = type === 'number' ? Number(value) : value;
    const parsed = schema.safeParse(candidate);
    if (!parsed.success || (type === 'number' && !Number.isFinite(candidate))) {
      invalid.push(index + 1);
      return;
    }
    const normalized = type === 'number' ? String(candidate) : value;
    if (values.has(normalized)) duplicates++;
    else values.add(normalized);
  });

  let issue: BatchSearchIssue | null = null;
  if (columns.length) issue = { type: 'columns', lines: columns };
  else if (invalid.length) issue = { type: 'invalid', lines: invalid };
  else if (values.size > maxItems) issue = { type: 'limit', maxItems };
  return { values: [...values], duplicates, issue };
}
