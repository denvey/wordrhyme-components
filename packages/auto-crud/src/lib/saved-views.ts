import type { ViewStorage } from '@/components/auto-crud/auto-crud-provider';
import { z } from 'zod';
import { filterItemSchema } from '@/lib/parsers';

export const viewQuerySchema = z.object({
  filters: z.array(filterItemSchema).max(100),
  joinOperator: z.enum(['and', 'or']),
  search: z.string().max(1000),
  sort: z.array(z.object({ id: z.string(), desc: z.boolean() })).max(20),
});
/** Opaque storage scope; its meaning and authorization belong to the adapter. */
export const viewScopeSchema = z.string().min(1).max(80);
export const viewCapabilitiesSchema = z.object({
  update: z.boolean(),
  delete: z.boolean(),
  reorder: z.boolean(),
});
export const viewStorageCapabilitiesSchema = z.object({
  createScopes: z
    .array(viewScopeSchema)
    .refine((scopes) => new Set(scopes).size === scopes.length, '创建范围不能重复'),
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
  /** Omitted on create uses the adapter default; omitted on update preserves the scope. */
  scope: viewScopeSchema.optional(),
});
export const savedViewSchema = viewInputSchema.extend({
  id: z.string().min(1),
  capabilities: viewCapabilitiesSchema.optional(),
});
/** Code presets have no persistence scope or storage capabilities. */
export const presetViewSchema = viewInputSchema
  .omit({ scope: true })
  .extend({
    id: savedViewSchema.shape.id,
  })
  .strict();
export type ViewQuery = z.infer<typeof viewQuerySchema>;
export type ViewScope = z.infer<typeof viewScopeSchema>;
export type ViewCapabilities = z.infer<typeof viewCapabilitiesSchema>;
export type ViewStorageCapabilities = z.infer<typeof viewStorageCapabilitiesSchema>;
export type ViewInput = z.infer<typeof viewInputSchema>;
export type SavedView = z.infer<typeof savedViewSchema>;
export type PresetView = z.infer<typeof presetViewSchema>;
export type ResolvedView =
  | (PresetView & { source: 'preset' })
  | (SavedView & { source: 'saved' });

/** Preserve legacy adapters; scoped permissions must be supplied by the Host. */
export function getViewCapabilities(view: SavedView): ViewCapabilities {
  return (
    view.capabilities ?? {
      update: true,
      delete: true,
      reorder: true,
    }
  );
}

/** IDs and slugs share a lookup namespace within a resource. */
function validateViewReferences<T extends Pick<SavedView, 'id' | 'slug'>>(
  views: T[],
): T[] {
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

export function parseSavedViews(value: unknown): SavedView[] {
  return validateViewReferences(z.array(savedViewSchema).parse(value));
}

export function resolveViews(
  presets: readonly PresetView[],
  views: SavedView[],
): ResolvedView[] {
  return validateViewReferences([
    ...z
      .array(presetViewSchema)
      .parse(presets)
      .map((view) => ({ ...view, source: 'preset' as const })),
    ...views.map((view) => ({ ...view, source: 'saved' as const })),
  ]);
}

/** Require a complete permutation so stale lists cannot silently drop views. */
export function reorderSavedViews(views: SavedView[], ids: string[]): SavedView[] {
  const byId = new Map(
    views
      .filter((view) => getViewCapabilities(view).reorder)
      .map((view) => [view.id, view]),
  );
  if (
    ids.length !== byId.size ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !byId.has(id))
  )
    throw new Error('视图列表已变化，请取消后重新调整顺序');
  let index = 0;
  return views.map((view) => (byId.has(view.id) ? byId.get(ids[index++]!)! : view));
}

const viewPreferenceIdsSchema = z.array(z.string().min(1)).optional().catch(undefined);
const viewPreferencesSchema = z
  .object({
    selector: z.enum(['dropdown', 'tabs']),
    viewId: z.string().min(1).nullable(),
    /** Personal display order across all sources, independent of storage permissions. */
    viewOrder: viewPreferenceIdsSchema,
    hiddenViewIds: viewPreferenceIdsSchema,
    /** Migrate older browser preferences; new writes use hiddenViewIds only. */
    hiddenPresetIds: viewPreferenceIdsSchema,
  })
  .transform(({ hiddenPresetIds, ...preferences }) => {
    if (preferences.hiddenViewIds === undefined && hiddenPresetIds !== undefined)
      return { ...preferences, hiddenViewIds: hiddenPresetIds };
    return preferences;
  });
export type ViewPreferences = z.infer<typeof viewPreferencesSchema>;

/** Ignore removed/duplicate IDs and append new views in their configured order. */
export function orderViews(
  views: ResolvedView[],
  ids: readonly string[] = [],
): ResolvedView[] {
  const remaining = new Map(views.map((view) => [view.id, view]));
  const ordered: ResolvedView[] = [];
  for (const id of ids) {
    const view = remaining.get(id);
    if (view) {
      ordered.push(view);
      remaining.delete(id);
    }
  }
  return [...ordered, ...remaining.values()];
}

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
      const valid = viewInputSchema.parse(input);
      const view = { ...valid, id: crypto.randomUUID() };
      write(resourceId, [...read(resourceId), view]);
      return view;
    },
    async update(resourceId, id, input) {
      const views = read(resourceId);
      const current = views.find((view) => view.id === id);
      if (!current) throw new Error('View not found');
      if (!getViewCapabilities(current).update) throw new Error('无权修改此视图');
      const valid = viewInputSchema.parse(input);
      if (valid.scope !== undefined && valid.scope !== current.scope)
        throw new Error('修改视图不能变更保存范围，请另存为新视图');
      const view = {
        ...current,
        ...valid,
        scope: current.scope,
        slug: valid.slug ?? current.slug,
        id,
      };
      write(
        resourceId,
        views.map((item) => (item.id === id ? view : item)),
      );
      return view;
    },
    async remove(resourceId, id) {
      const views = read(resourceId);
      const current = views.find((view) => view.id === id);
      if (!current) return;
      if (!getViewCapabilities(current).delete) throw new Error('无权删除此视图');
      write(
        resourceId,
        views.filter((view) => view.id !== id),
      );
    },
    async reorder(resourceId, ids) {
      write(resourceId, reorderSavedViews(read(resourceId), ids));
    },
  };
}
