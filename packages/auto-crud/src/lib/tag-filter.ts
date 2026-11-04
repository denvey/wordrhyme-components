import { z } from 'zod';
import { getDefaultFilterOperator } from '@/lib/data-table';

export const tagFilterValueSchema = z
  .object({
    include: z.array(z.string().min(1)).max(100),
    exclude: z.array(z.string().min(1)).max(100),
    match: z.enum(['any', 'all']),
  })
  .strict()
  .refine(
    ({ include, exclude }) => !include.some((id) => exclude.includes(id)),
    'A tag cannot be both included and excluded',
  );

export type TagFilterValue = z.infer<typeof tagFilterValueSchema>;

export function emptyTagFilter(): TagFilterValue {
  return { include: [], exclude: [], match: 'any' };
}

export function isTagFilterValue(value: unknown): value is TagFilterValue {
  return tagFilterValueSchema.safeParse(value).success;
}

export function tagFilterIds(value: TagFilterValue): string[] {
  return [...new Set([...value.include, ...value.exclude])];
}

export function createColumnFilter<TData>(
  id: Extract<keyof TData, string>,
  variant: import('@/types/data-table').FilterVariant,
  value: string | string[] = '',
): import('@/types/data-table').ExtendedColumnFilter<TData> {
  if (variant === 'tags')
    return {
      id,
      variant,
      operator: 'matches',
      value: emptyTagFilter(),
      filterId: crypto.randomUUID(),
    };
  return {
    id,
    variant,
    value,
    operator: getDefaultFilterOperator(variant) as Exclude<
      import('@/types/data-table').FilterOperator,
      'matches'
    >,
    filterId: crypto.randomUUID(),
  };
}
