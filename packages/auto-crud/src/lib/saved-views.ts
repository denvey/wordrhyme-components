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
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(
      /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u,
      'Slug 只能包含文字、数字和连接用的短横线',
    )
    .optional(),
  query: viewQuerySchema,
});
export const savedViewSchema = viewInputSchema.extend({ id: z.string().min(1) });
export type ViewQuery = z.infer<typeof viewQuerySchema>;
export type ViewInput = z.infer<typeof viewInputSchema>;
export type SavedView = z.infer<typeof savedViewSchema>;

/** IDs and slugs share a lookup namespace within a resource. */
export function parseSavedViews(value: unknown): SavedView[] {
  const views = z.array(savedViewSchema).parse(value);
  const ids = new Set<string>();
  const references = new Map<string, string>();
  for (const view of views) {
    if (ids.has(view.id)) throw new Error('视图 ID 重复');
    ids.add(view.id);
    for (const reference of [view.id, view.slug].filter((item) => item !== undefined)) {
      const owner = references.get(reference);
      if (owner !== undefined && owner !== view.id)
        throw new Error('视图 slug 必须唯一，且不能与其他视图的 ID 相同');
      references.set(reference, view.id);
    }
  }
  return views;
}

/** Require a complete permutation so stale lists cannot silently drop views. */
export function reorderSavedViews(views: SavedView[], ids: string[]): SavedView[] {
  const byId = new Map(views.map((view) => [view.id, view]));
  if (
    ids.length !== views.length ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !byId.has(id))
  )
    throw new Error('视图列表已变化，请取消后重新调整顺序');
  return ids.map((id) => byId.get(id)!);
}

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
    parseSavedViews(JSON.parse(localStorage.getItem(key(resourceId)) ?? '[]'));
  const write = (resourceId: string, views: SavedView[]) =>
    localStorage.setItem(key(resourceId), JSON.stringify(parseSavedViews(views)));
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
    async reorder(resourceId, ids) {
      write(resourceId, reorderSavedViews(read(resourceId), ids));
    },
  };
}
