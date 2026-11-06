import type { ViewStorage } from '@/components/auto-crud/auto-crud-provider';
import { z } from 'zod';
import { filterItemSchema } from '@/lib/parsers';

export const viewQuerySchema = z.object({
  filters: z.array(filterItemSchema).max(100),
  joinOperator: z.enum(['and', 'or']),
  search: z.string().max(1000),
  sort: z.array(z.object({ id: z.string(), desc: z.boolean() })).max(20),
});
export const viewInputSchema = z.object({
  name: z.string().trim().min(1).max(40),
  query: viewQuerySchema,
});
export const savedViewSchema = viewInputSchema.extend({ id: z.string().min(1) });
export type ViewQuery = z.infer<typeof viewQuerySchema>;
export type ViewInput = z.infer<typeof viewInputSchema>;
export type SavedView = z.infer<typeof savedViewSchema>;

const viewPreferencesSchema = z.object({
  selector: z.enum(['dropdown', 'tabs']),
  viewId: z.string().min(1).nullable(),
});
export type ViewPreferences = z.infer<typeof viewPreferencesSchema>;

function viewPreferencesKey(scope: string, resourceId: string): string {
  return `auto-crud:view-preferences:${encodeURIComponent(scope)}:${encodeURIComponent(resourceId)}`;
}

export function readViewPreferences(
  scope: string,
  resourceId: string,
): ViewPreferences | null {
  try {
    return viewPreferencesSchema.parse(
      JSON.parse(localStorage.getItem(viewPreferencesKey(scope, resourceId)) ?? 'null'),
    );
  } catch {
    // Unavailable storage or invalid preferences must not prevent loading a table.
    return null;
  }
}

export function writeViewPreferences(
  scope: string,
  resourceId: string,
  preferences: ViewPreferences,
): void {
  try {
    localStorage.setItem(
      viewPreferencesKey(scope, resourceId),
      JSON.stringify(preferences),
    );
  } catch {
    // Preferences remain usable in memory when browser storage is unavailable.
  }
}

export function queryFingerprint(query: ViewQuery): string {
  const filters = query.filters
    .map(({ filterId: _, ...filter }) => {
      if (filter.variant === 'tags')
        return {
          ...filter,
          value: {
            include: [...filter.value.include].sort(),
            exclude: [...filter.value.exclude].sort(),
            match: filter.value.match,
          },
        };
      return {
        ...filter,
        value:
          filter.variant === 'multiSelect' && Array.isArray(filter.value)
            ? [...filter.value].sort()
            : filter.value,
      };
    })
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return JSON.stringify({ ...query, filters });
}

/** namespace must identify both the user and tenant. No implicit browser fallback. */
export function createLocalViewStorage(namespace: string): ViewStorage {
  if (!namespace.trim()) throw new Error('A user/tenant storage namespace is required');
  const key = (resourceId: string) =>
    `auto-crud:views:${encodeURIComponent(namespace)}:${encodeURIComponent(resourceId)}`;
  const read = (resourceId: string) =>
    z
      .array(savedViewSchema)
      .parse(JSON.parse(localStorage.getItem(key(resourceId)) ?? '[]'));
  const write = (resourceId: string, views: SavedView[]) =>
    localStorage.setItem(key(resourceId), JSON.stringify(views));
  return {
    async list(resourceId) {
      return read(resourceId);
    },
    async create(resourceId, input) {
      const view = { ...viewInputSchema.parse(input), id: crypto.randomUUID() };
      write(resourceId, [...read(resourceId), view]);
      return view;
    },
    async update(resourceId, id, input) {
      const views = read(resourceId);
      if (!views.some((view) => view.id === id)) throw new Error('View not found');
      const view = { ...viewInputSchema.parse(input), id };
      write(
        resourceId,
        views.map((item) => (item.id === id ? view : item)),
      );
      return view;
    },
    async remove(resourceId, id) {
      write(
        resourceId,
        read(resourceId).filter((view) => view.id !== id),
      );
    },
  };
}
