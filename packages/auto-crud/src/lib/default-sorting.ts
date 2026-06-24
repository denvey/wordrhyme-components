import type { z } from 'zod';

export type AutoCrudSorting = Array<{ id: string; desc: boolean }>;

export function getDefaultSortingForSchema(
  schema: z.ZodObject<z.ZodRawShape>,
): AutoCrudSorting {
  return Object.prototype.hasOwnProperty.call(schema.shape, 'createdAt')
    ? [{ id: 'createdAt', desc: true }]
    : [];
}
