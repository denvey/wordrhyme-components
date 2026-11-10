'use client';

import type { Table } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import type {
  PresetView,
  ResolvedView,
  SavedView,
  ViewInput,
  ViewPreferences,
  ViewQuery,
  ViewScope,
} from '@/lib/saved-views';
import type { ExtendedColumnFilter } from '@/types/data-table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ToggleGroup,
  ToggleGroupItem,
} from '@wordrhyme/shadcn';
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
} from '@wordrhyme/shadcn-ui';
import {
  AppWindow,
  ArrowDownUp,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  PanelsTopLeft,
  Pencil,
  Plus,
  Settings,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { getUrlParams, setSearchParams } from '@/hooks/use-url-state';
import { getSortingStateParser } from '@/lib/parsers';
import { applyReadableFilters, parseReadableFilters } from '@/lib/readable-filters';
import {
  getViewCapabilities,
  orderViews,
  parseSavedViews,
  queryFingerprint,
  readViewPreferences,
  resolveViews,
  savedViewSchema,
  viewInputSchema,
  viewStorageCapabilitiesSchema,
  writeViewPreferences,
} from '@/lib/saved-views';
import { cn } from '@/lib/utils';
import { useAutoCrudConfig } from './auto-crud-provider';

export interface SavedViewsConfig {
  /** Code-defined queries; users may hide/reorder their display locally. IDs/slugs must be unique across sources. */
  presets?: readonly PresetView[];
  /** Page-hidden view IDs or slugs from any source. Overrides personal preferences; excluded from restore. */
  hiddenViews?: readonly string[];
  /** Opt into scope selection with Host-defined values and labels. Single options stay hidden. */
  scopeOptions?: readonly { value: ViewScope; label: string }[];
  /** Initial view slug or ID when the URL and local preferences do not select a view. */
  defaultView?: string;
  /** Wait for async fields in standalone AutoTable; AutoCrudTable derives readiness from resource metadata. */
  fieldsReady?: boolean;
  /** Initial display mode when no local preference exists. */
  selector?: ViewPreferences['selector'];
  /** Appearance of the tab selector; supplied classes override the defaults. */
  tabs?: {
    variant?: 'default' | 'line';
    /** Position of the active line. Defaults to bottom; only applies to line tabs. */
    linePosition?: 'top' | 'bottom';
    classNames?: {
      list?: string;
      trigger?: string;
      indicator?: string;
    };
  };
  /** Count saved queries (including All), in batches of at most 100. Keys are opaque. */
  counts?: (input: {
    queries: Array<
      Pick<ViewQuery, 'filters' | 'joinOperator' | 'search'> & { key: string }
    >;
    signal: AbortSignal;
  }) => Promise<Record<string, number>>;
}

interface SavedViewsProps<TData> extends SavedViewsConfig {
  resourceId: string;
  table: Table<TData>;
  onApply?: () => void;
  children: (
    controls: ReactNode,
    display: NonNullable<SavedViewsConfig['selector']>,
    onInteract: () => void,
  ) => ReactNode;
}

function suggestSlug(name: string, views: SavedView[]): string {
  if (!name.trim()) return '';
  const base =
    name
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/gu, '')
      .slice(0, 70)
      .replace(/-$/gu, '') || 'view';
  const references = new Set(views.flatMap((view) => [view.id, view.slug]));
  let slug = base;
  let suffix = 2;
  while (references.has(slug)) slug = `${base}-${suffix++}`;
  return slug;
}

export function SavedViews<TData>(props: SavedViewsProps<TData>) {
  const config = useAutoCrudConfig();
  if (!config?.viewStorage)
    throw new Error('Saved views require AutoCrudProvider.viewStorage');
  return <ViewMenu {...props} key={`${config.cacheKey}:${props.resourceId}`} />;
}

function ViewMenu<TData>({
  resourceId,
  table,
  fieldsReady = true,
  defaultView,
  presets,
  hiddenViews,
  scopeOptions,
  selector = 'dropdown',
  tabs,
  counts,
  onApply,
  children,
}: SavedViewsProps<TData>) {
  const config = useAutoCrudConfig()!;
  const storage = config.viewStorage!;
  const client = useQueryClient();
  const scopeLabelId = useId();
  const [display, setDisplay] = useState(selector);
  const [preferences, setPreferences] = useState<ViewPreferences | null>();
  const preferencesRef = useRef<ViewPreferences | null>(null);
  useEffect(() => {
    const stored = readViewPreferences(config.scope, resourceId);
    preferencesRef.current = stored;
    setPreferences(stored);
    if (stored) setDisplay(stored.selector);
  }, [config.scope, resourceId]);
  const savePreferences = useCallback(
    (patch: Partial<ViewPreferences>) => {
      const next = {
        selector,
        viewId: null,
        ...preferencesRef.current,
        ...patch,
      };
      preferencesRef.current = next;
      setPreferences(next);
      writeViewPreferences(config.scope, resourceId, next);
    },
    [config.scope, resourceId, selector],
  );
  const queryKey = ['auto-crud-views', config.cacheKey, resourceId];
  const views = useQuery({
    queryKey,
    queryFn: async () => parseSavedViews(await storage.list(resourceId)),
  });
  const capabilities = useQuery({
    queryKey: ['auto-crud-view-capabilities', config.cacheKey, resourceId],
    queryFn: async () =>
      storage.getCapabilities
        ? viewStorageCapabilitiesSchema.parse(await storage.getCapabilities(resourceId))
        : null,
  });
  const createScopes = capabilities.isSuccess
    ? (capabilities.data?.createScopes ?? [])
    : [];
  const canCreate =
    capabilities.isSuccess && (capabilities.data === null || createScopes.length > 0);
  const availableScopeOptions = (scopeOptions ?? []).filter((option) =>
    createScopes.includes(option.value),
  );
  const collection = useMemo(() => {
    try {
      return { items: resolveViews(presets ?? [], views.data ?? []), error: null };
    } catch (reason) {
      return {
        items: [],
        error: reason instanceof Error ? reason.message : String(reason),
      };
    }
  }, [presets, views.data]);
  const allViewItems = useMemo(
    () => orderViews(collection.items, preferences?.viewOrder),
    [collection.items, preferences?.viewOrder],
  );
  const configuredHiddenIds = useMemo(() => {
    const references = new Set(hiddenViews);
    return new Set(
      allViewItems
        .filter(
          (view) =>
            references.has(view.id) ||
            (view.slug !== undefined && references.has(view.slug)),
        )
        .map((view) => view.id),
    );
  }, [allViewItems, hiddenViews]);
  const hiddenItems = useMemo(
    () =>
      allViewItems.filter(
        (view) =>
          configuredHiddenIds.has(view.id) ||
          preferences?.hiddenViewIds?.includes(view.id),
      ),
    [allViewItems, configuredHiddenIds, preferences?.hiddenViewIds],
  );
  const restorableViews = useMemo(
    () => hiddenItems.filter((view) => !configuredHiddenIds.has(view.id)),
    [hiddenItems, configuredHiddenIds],
  );
  const viewItems = useMemo(
    () => allViewItems.filter((view) => !hiddenItems.includes(view)),
    [allViewItems, hiddenItems],
  );
  const savedItems = useMemo(
    () =>
      collection.items.filter(
        (view): view is SavedView & { source: 'saved' } => view.source === 'saved',
      ),
    [collection.items],
  );
  const ready = views.isSuccess && collection.error === null && preferences !== undefined;
  const countQueries = useMemo(
    () => [
      { key: 'all', filters: [], joinOperator: 'and' as const, search: '' },
      ...viewItems.map((view, index) => ({
        key: `view:${index}`,
        filters: view.query.filters,
        joinOperator: view.query.joinOperator,
        search: view.query.search,
      })),
    ],
    [viewItems],
  );
  const totals = useQuery({
    queryKey: ['auto-crud-view-counts', config.cacheKey, resourceId, countQueries],
    queryFn: async ({ signal }) => {
      if (!counts) throw new Error('View counts require a counts callback');
      const result: Record<string, number> = {};
      for (let offset = 0; offset < countQueries.length; offset += 100) {
        signal.throwIfAborted();
        Object.assign(
          result,
          await counts({ queries: countQueries.slice(offset, offset + 100), signal }),
        );
      }
      return result;
    },
    enabled: Boolean(counts) && ready && fieldsReady,
  });
  const data = table.options.data;
  const previousSource = useRef({ data, counts });
  const refetchCounts = totals.refetch;
  useEffect(() => {
    const previous = previousSource.current;
    previousSource.current = { data, counts };
    if (previous.data === data && previous.counts === counts) return;
    if (counts && ready && fieldsReady)
      void client
        .cancelQueries({
          queryKey: ['auto-crud-view-counts', config.cacheKey, resourceId],
        })
        .then(() => refetchCounts());
  }, [
    data,
    counts,
    ready,
    fieldsReady,
    refetchCounts,
    client,
    config.cacheKey,
    resourceId,
  ]);
  const renderCount = (key: string) => {
    if (!counts) return null;
    const value = totals.data?.[key];
    const valid = typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
    const label = totals.isPending
      ? '数量加载中'
      : totals.isError
        ? '统计失败'
        : valid
          ? `${value} 条记录`
          : '暂无统计';
    return (
      <span
        className="text-xs text-muted-foreground tabular-nums"
        aria-label={label}
        title={label}
      >
        {totals.isPending ? '…' : totals.isError || !valid ? '—' : value}
      </span>
    );
  };
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = viewItems.find((view) => view.id === selectedId) ?? null;
  const setSelected = (view: Pick<ResolvedView, 'id'> | null) =>
    setSelectedId(view?.id ?? null);
  const canUpdate = selected?.source === 'saved' && getViewCapabilities(selected).update;
  const canDelete = selected?.source === 'saved' && getViewCapabilities(selected).delete;
  const [dialog, setDialog] = useState<
    'create' | 'rename' | 'duplicate' | 'delete' | 'reorder' | null
  >(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [scope, setScope] = useState<ViewScope>();
  const [orderedViews, setOrderedViews] = useState<ResolvedView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(() => getUrlParams().toString());
  const defaultPending = useRef(search === '');
  const onInteract = () => {
    // Batch conditions and unfinished search input may not be reflected in the URL.
    defaultPending.current = false;
  };
  useEffect(() => {
    const update = (event: Event) => {
      const next = getUrlParams().toString();
      if (next !== '' || event.type === 'popstate') defaultPending.current = false;
      setSearch(next);
    };
    window.addEventListener('urlchange', update);
    window.addEventListener('popstate', update);
    return () => {
      window.removeEventListener('urlchange', update);
      window.removeEventListener('popstate', update);
    };
  }, []);
  const columns = table.getAllColumns().filter((column) => column.getCanFilter());
  const keys = table.options.meta?.queryKeys;
  const viewKey = keys?.view ?? 'view';
  const lastViewParam = useRef<string | null>(null);
  const readQuery = useCallback((): ViewQuery => {
    const params = getUrlParams();
    return {
      filters: parseReadableFilters(params, columns),
      joinOperator:
        params.get(keys?.joinOperator ?? 'joinOperator') === 'or' ? 'or' : 'and',
      search: params.get('search') ?? '',
      sort: table.getState().sorting,
    };
  }, [columns, table, keys]);
  const current = useMemo(() => readQuery(), [readQuery, search]);
  const dirty =
    selected !== null && queryFingerprint(selected.query) !== queryFingerprint(current);
  const validateQuery = useCallback(
    (query: ViewQuery) => {
      const allowed = new Set(columns.map((column) => column.id));
      if (
        query.filters.some((filter) => !allowed.has(filter.id)) ||
        query.sort.some((sort) => !table.getColumn(sort.id)?.getCanSort())
      ) {
        throw new Error('视图包含已删除或不可用的字段，请修改视图条件');
      }
      if (
        query.filters.some(
          (filter) =>
            (table.getColumn(filter.id)?.columnDef.meta?.variant ?? 'text') !==
            filter.variant,
        )
      ) {
        throw new Error('视图中的字段类型已变化，请重新配置筛选条件');
      }
    },
    [columns, table],
  );
  const apply = useCallback(
    (query: ViewQuery, history: 'push' | 'replace' = 'push', reference?: string) => {
      validateQuery(query);
      const params = getUrlParams();
      applyReadableFilters(
        params,
        columns,
        query.filters as ExtendedColumnFilter<TData>[],
      );
      params.set(keys?.joinOperator ?? 'joinOperator', query.joinOperator);
      if (query.search) params.set('search', query.search);
      else params.delete('search');
      if (query.sort.length)
        params.set(
          keys?.sort ?? 'sort',
          getSortingStateParser<Record<string, unknown>>().serialize(query.sort),
        );
      else params.set(keys?.sort ?? 'sort', '');
      params.set(keys?.page ?? 'page', '1');
      if (reference !== undefined) {
        params.set(viewKey, reference);
        lastViewParam.current = reference;
      }
      setSearchParams(params, { history });
      onApply?.();
    },
    [columns, keys, validateQuery, onApply, viewKey],
  );
  useEffect(() => {
    if (
      !ready ||
      !fieldsReady ||
      selectedId === null ||
      !hiddenItems.some((view) => view.id === selectedId)
    )
      return;
    try {
      apply({ filters: [], joinOperator: 'and', search: '', sort: [] }, 'replace', '');
      setSelectedId(null);
      savePreferences({ viewId: null });
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }, [ready, fieldsReady, selectedId, hiddenItems, apply, savePreferences]);
  const preferencesRestored = useRef(false);
  useEffect(() => {
    if (!ready || !fieldsReady || preferences === undefined) return;
    const first = !preferencesRestored.current;
    const urlReference = getUrlParams().get(viewKey);
    // Extensions may register the default and its preset after initial restoration.
    const lateDefault =
      !first &&
      defaultPending.current &&
      preferencesRef.current === null &&
      getUrlParams().toString() === '' &&
      !!defaultView &&
      viewItems.some((view) => view.id === defaultView || view.slug === defaultView);
    if (
      !first &&
      !lateDefault &&
      urlReference === lastViewParam.current &&
      (selectedId !== null ||
        !viewItems.some((view) => view.id === urlReference || view.slug === urlReference))
    )
      return;
    const savedViews = viewItems;
    let cancelled = false;
    // Cached views can be ready on mount, before ancestor URL hooks subscribe.
    queueMicrotask(() => {
      if (cancelled) return;
      if (
        lateDefault &&
        (!defaultPending.current ||
          preferencesRef.current !== null ||
          getUrlParams().toString() !== '')
      )
        return;
      preferencesRestored.current = true;
      lastViewParam.current = urlReference;
      const storedPreferences = preferencesRef.current;
      let reference = urlReference;
      if ((first || lateDefault) && urlReference === null)
        reference = storedPreferences ? storedPreferences.viewId : (defaultView ?? null);
      if (reference === null || reference === '') {
        setSelected(null);
        setError(null);
        if (!first || urlReference !== null)
          savePreferences({
            selector: display,
            viewId: null,
          });
        return;
      }
      const view = savedViews.find(
        (item) => item.id === reference || item.slug === reference,
      );
      try {
        if (view) {
          validateQuery(view.query);
          const params = getUrlParams();
          const hasUrlQuery =
            readQuery().filters.length > 0 ||
            [
              'search',
              keys?.sort ?? 'sort',
              keys?.joinOperator ?? 'joinOperator',
              keys?.page ?? 'page',
              keys?.perPage ?? 'perPage',
            ].some((key) => params.has(key));
          const canonical = view.slug ?? view.id;
          if (!hasUrlQuery) apply(view.query, 'replace', canonical);
          else if (urlReference !== canonical) {
            params.set(viewKey, canonical);
            lastViewParam.current = canonical;
            setSearchParams(params, { history: 'replace' });
          }
          setSelected(view);
          defaultPending.current = false;
          savePreferences({
            selector: display,
            viewId: view.id,
          });
          setError(null);
          return;
        }
        if (urlReference !== null && urlReference !== '') {
          const hiddenView = hiddenItems.find(
            (item) => item.id === reference || item.slug === reference,
          );
          let message = '链接指定的视图不存在或不可用';
          if (hiddenView)
            message = configuredHiddenIds.has(hiddenView.id)
              ? '此视图已由页面配置隐藏'
              : '此视图已隐藏，请在视图设置中恢复';
          setError(message);
        }
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : String(reason));
      }
      setSelected(null);
      if (first && urlReference === null && storedPreferences)
        savePreferences({ viewId: null });
    });
    return () => {
      cancelled = true;
    };
  }, [
    ready,
    viewItems,
    fieldsReady,
    config.scope,
    resourceId,
    keys,
    readQuery,
    apply,
    validateQuery,
    search,
    viewKey,
    defaultView,
    display,
    preferences,
    selectedId,
    hiddenItems,
    configuredHiddenIds,
    savePreferences,
  ]);
  const mutation = useMutation({
    mutationFn: async (
      request:
        | { operation: 'create' | 'update'; input: ViewInput }
        | { operation: 'delete' },
    ) => {
      if (!ready) throw new Error('请等待视图列表加载成功');
      if (request.operation === 'delete') {
        if (!canDelete || selected?.source !== 'saved') throw new Error('无权删除此视图');
        await storage.remove(resourceId, selected!.id);
        return null;
      }
      const valid = viewInputSchema.parse(request.input);
      if (request.operation === 'create') {
        if (
          !canCreate ||
          (capabilities.data !== null && !createScopes.includes(valid.scope ?? ''))
        )
          throw new Error('无权在此范围创建视图');
      } else {
        if (!canUpdate || selected?.source !== 'saved') throw new Error('无权修改此视图');
        if (valid.scope !== undefined && valid.scope !== selected.scope)
          throw new Error('修改视图不能变更保存范围，请另存为新视图');
      }
      const remaining = savedItems.filter(
        (view) => request.operation === 'create' || view.id !== selected!.id,
      );
      resolveViews(presets ?? [], [
        ...remaining,
        {
          ...valid,
          id: request.operation === 'create' ? crypto.randomUUID() : selected!.id,
        },
      ]);
      const result = savedViewSchema.parse(
        request.operation === 'create'
          ? await storage.create(resourceId, valid)
          : await storage.update(resourceId, selected!.id, valid),
      );
      resolveViews(presets ?? [], [...remaining, result]);
      return result;
    },
    onSuccess: async (view) => {
      if (view) {
        client.setQueryData<SavedView[]>(queryKey, (cached = []) =>
          cached.some((item) => item.id === view.id)
            ? cached.map((item) => (item.id === view.id ? view : item))
            : [...cached, view],
        );
      }
      if (!view)
        apply({ filters: [], joinOperator: 'and', search: '', sort: [] }, 'push', '');
      else {
        const reference = view.slug ?? view.id;
        const params = getUrlParams();
        params.set(viewKey, reference);
        lastViewParam.current = reference;
        setSearchParams(params, { history: 'replace' });
      }
      setSelected(view);
      savePreferences({
        selector: display,
        viewId: view?.id ?? null,
      });
      setDialog(null);
      setError(null);
      await Promise.all([
        client.invalidateQueries({ queryKey }),
        client.invalidateQueries({
          queryKey: ['auto-crud-view-capabilities', config.cacheKey, resourceId],
        }),
      ]);
    },
    onError: (reason) => setError(reason.message),
  });
  const select = (view: ResolvedView | null) => {
    try {
      apply(
        view?.query ?? { filters: [], joinOperator: 'and', search: '', sort: [] },
        'push',
        view?.slug ?? view?.id ?? '',
      );
      setSelected(view);
      savePreferences({
        selector: display,
        viewId: view?.id ?? null,
      });
      setError(null);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      return false;
    }
  };
  const hideView = () => {
    if (!ready || !selected) return;
    const { id } = selected;
    if (!select(null)) return;
    savePreferences({
      hiddenViewIds: [...new Set([...(preferencesRef.current?.hiddenViewIds ?? []), id])],
    });
  };
  const saveOrder = () => {
    const ids = orderedViews.map((view) => view.id);
    if (
      !ready ||
      ids.length !== viewItems.length ||
      new Set(ids).size !== ids.length ||
      ids.some((id) => !viewItems.some((view) => view.id === id))
    ) {
      setError('视图列表已变化，请取消后重新调整顺序');
      return;
    }
    let index = 0;
    savePreferences({
      // Keep hidden views in their slots so restoring one retains its position.
      viewOrder: allViewItems.map((view) =>
        hiddenItems.includes(view) ? view.id : ids[index++]!,
      ),
    });
    setDialog(null);
    setError(null);
  };
  const open = (operation: NonNullable<typeof dialog>) => {
    setName(operation === 'create' ? '' : (selected?.name ?? ''));
    let nextSlug = '';
    if (operation === 'rename') nextSlug = selected?.slug ?? '';
    else if (operation === 'duplicate')
      nextSlug = suggestSlug(selected?.name ?? '', allViewItems);
    setSlug(nextSlug);
    setScope(availableScopeOptions[0]?.value ?? createScopes[0]);
    if (operation === 'reorder') setOrderedViews(viewItems);
    setError(null);
    setDialog(operation);
  };
  const selectValue = (value: string) => {
    if (value === 'all') select(null);
    else {
      const view = viewItems.find((item) => `view:${item.id}` === value);
      if (view) select(view);
    }
  };
  const lineTabs = tabs?.variant === 'line';
  const linePosition = tabs?.linePosition ?? 'bottom';
  const tabClassName = cn(
    lineTabs
      ? 'relative h-11 rounded-none px-4 text-muted-foreground hover:bg-transparent data-[state=on]:bg-transparent data-[state=on]:text-foreground data-[state=on]:shadow-none'
      : 'data-[state=on]:bg-background data-[state=on]:shadow-sm',
    tabs?.classNames?.trigger,
  );
  const renderIndicator = (active: boolean) =>
    lineTabs && active ? (
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-0 h-1 bg-primary',
          linePosition === 'top' ? 'top-0' : 'bottom-0',
          tabs?.classNames?.indicator,
        )}
      />
    ) : null;
  const triggerLabel =
    display === 'tabs' ? '视图设置' : selected === null ? '切换视图' : undefined;
  const controls = (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div
        className={cn(
          'flex min-w-0 max-w-full items-center gap-1',
          display === 'tabs' &&
            lineTabs && [
              'relative w-full before:pointer-events-none before:absolute before:inset-x-0 before:h-px before:bg-border',
              linePosition === 'top' ? 'before:top-0' : 'before:bottom-0',
            ],
        )}
      >
        {display === 'tabs' && (
          <div className={cn('min-w-0 max-w-full overflow-x-auto', lineTabs && 'flex-1')}>
            <ToggleGroup
              type="single"
              size="sm"
              spacing={1}
              value={selected ? `view:${selected.id}` : 'all'}
              onValueChange={selectValue}
              disabled={!fieldsReady || views.isPending || mutation.isPending}
              aria-label="已保存的视图"
              className={cn(
                lineTabs
                  ? 'min-w-full justify-start gap-0 rounded-none bg-transparent p-0'
                  : 'rounded-lg bg-muted p-1',
                tabs?.classNames?.list,
              )}
            >
              <ToggleGroupItem value="all" className={tabClassName}>
                全部
                {renderCount('all')}
                {renderIndicator(selected === null)}
              </ToggleGroupItem>
              {viewItems.map((view, index) => (
                <ToggleGroupItem
                  key={view.id}
                  value={`view:${view.id}`}
                  title={
                    view.source === 'preset' ? `${view.name}（预设视图）` : view.name
                  }
                  className={tabClassName}
                >
                  {view.name}
                  {renderCount(`view:${index}`)}
                  {renderIndicator(selected?.id === view.id)}
                  {selected?.id === view.id && dirty && (
                    <span
                      aria-label="有未保存修改"
                      className="size-1.5 rounded-full bg-current"
                    />
                  )}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant={display === 'tabs' ? 'ghost' : 'outline'}
              size={display === 'tabs' || selected === null ? 'icon-sm' : 'sm'}
              className={cn(
                'relative shrink-0',
                display === 'dropdown' && selected === null && counts && 'w-auto px-2',
              )}
              aria-label={triggerLabel}
              title={triggerLabel}
              disabled={!fieldsReady || views.isPending || mutation.isPending}
            >
              {display === 'tabs' ? (
                <Settings className="size-4" />
              ) : (
                <>
                  {selected ? (
                    selected.name
                  ) : (
                    <Layers aria-hidden="true" className="size-4" />
                  )}
                  {renderCount(
                    selected
                      ? `view:${viewItems.findIndex((view) => view.id === selected.id)}`
                      : 'all',
                  )}
                  {dirty && (
                    <span
                      aria-label="有未保存修改"
                      className={cn(
                        'size-1.5 rounded-full bg-current',
                        selected === null && 'absolute right-1 top-1',
                      )}
                    />
                  )}
                  {selected && <ChevronDown className="size-4" />}
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {display === 'dropdown' && (
              <>
                <DropdownMenuRadioGroup
                  value={selected ? `view:${selected.id}` : 'all'}
                  onValueChange={selectValue}
                >
                  <DropdownMenuRadioItem value="all">
                    全部
                    {renderCount('all')}
                  </DropdownMenuRadioItem>
                  {viewItems.map((view, index) => (
                    <DropdownMenuRadioItem key={view.id} value={`view:${view.id}`}>
                      {view.name}
                      {renderCount(`view:${index}`)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuLabel>视图设置</DropdownMenuLabel>
            <DropdownMenuItem
              disabled={!ready || !canCreate}
              onSelect={() => open('create')}
            >
              <Plus className="size-4" />
              另存为新视图
            </DropdownMenuItem>
            {selected && (
              <>
                {canUpdate && (
                  <DropdownMenuItem onSelect={() => open('rename')}>
                    <Pencil className="size-4" />
                    重命名视图
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  disabled={!ready || !canCreate}
                  onSelect={() => open('duplicate')}
                >
                  <Copy className="size-4" />
                  复制视图
                </DropdownMenuItem>
                {canDelete && (
                  <DropdownMenuItem onSelect={() => open('delete')}>
                    <Trash2 className="size-4" />
                    删除视图
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem disabled={!ready} onSelect={hideView}>
                  <EyeOff className="size-4" />
                  隐藏视图
                </DropdownMenuItem>
              </>
            )}
            {selected && <DropdownMenuSeparator />}
            <DropdownMenuItem
              disabled={!ready || viewItems.length < 2}
              onSelect={() => open('reorder')}
            >
              <ArrowDownUp className="size-4" />
              调整顺序
            </DropdownMenuItem>
            {restorableViews.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={!ready}>
                  <Eye className="size-4" />
                  恢复隐藏视图
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {restorableViews.map((view) => (
                    <DropdownMenuItem
                      key={view.id}
                      onSelect={() => {
                        preferencesRestored.current = false;
                        savePreferences({
                          hiddenViewIds: preferencesRef.current?.hiddenViewIds?.filter(
                            (id) => id !== view.id,
                          ),
                        });
                        setError(null);
                      }}
                    >
                      <Eye className="size-4" />
                      {view.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <PanelsTopLeft className="size-4" />
                展示方式
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={display}
                  onValueChange={(value) => {
                    if (value === 'dropdown' || value === 'tabs') {
                      setDisplay(value);
                      savePreferences({
                        selector: value,
                        viewId: selected?.id ?? null,
                      });
                    }
                  }}
                >
                  <DropdownMenuRadioItem value="dropdown">
                    <ChevronDown className="size-4" />
                    下拉
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="tabs">
                    <AppWindow className="size-4" />
                    Tab
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {dirty && (
        <>
          {canUpdate ? (
            <Button
              type="button"
              size="sm"
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate({
                  operation: 'update',
                  input: {
                    name: selected.name,
                    slug: selected.slug,
                    scope: selected.source === 'saved' ? selected.scope : undefined,
                    query: current,
                  },
                })
              }
            >
              保存修改
            </Button>
          ) : (
            canCreate && (
              <Button
                type="button"
                size="sm"
                disabled={mutation.isPending}
                onClick={() => open('create')}
              >
                另存为新视图
              </Button>
            )
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={mutation.isPending}
            onClick={() => select(selected)}
          >
            还原
          </Button>
        </>
      )}
      {(error !== null || views.error !== null || collection.error !== null) && (
        <span role="alert" className="text-sm text-destructive">
          {error ?? collection.error ?? views.error?.message}
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              preferencesRestored.current = false;
              views
                .refetch()
                .catch((reason: unknown) =>
                  setError(reason instanceof Error ? reason.message : String(reason)),
                );
            }}
          >
            重试
          </Button>
        </span>
      )}
      {capabilities.isError && (
        <span role="alert" className="text-sm text-destructive">
          创建权限加载失败
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => capabilities.refetch()}
          >
            重试
          </Button>
        </span>
      )}
      {counts && totals.isError && (
        <span role="alert" className="text-sm text-destructive">
          数量统计失败
          <Button type="button" variant="link" size="sm" onClick={() => totals.refetch()}>
            重试
          </Button>
        </span>
      )}
    </div>
  );
  return (
    <>
      {children(controls, display, onInteract)}
      <Dialog
        open={dialog !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen && !mutation.isPending) setDialog(null);
        }}
      >
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {dialog === null
                ? '视图'
                : {
                    delete: '删除视图',
                    rename: '重命名视图',
                    create: '另存为新视图',
                    duplicate: '复制视图',
                    reorder: '调整视图顺序',
                  }[dialog]}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (mutation.isPending) return;
              if (
                (dialog === 'rename' || dialog === 'duplicate' || dialog === 'delete') &&
                !selected
              ) {
                setError('视图已不存在或不可用，请关闭后重试');
                return;
              }
              if (dialog === 'reorder') {
                saveOrder();
                return;
              }
              if (dialog === 'delete') {
                mutation.mutate({ operation: 'delete' });
                return;
              }
              let operation: 'update' | 'create' = 'create';
              if (dialog === 'rename') operation = 'update';
              mutation.mutate({
                operation,
                input: {
                  name,
                  slug: slug.trim() || undefined,
                  scope:
                    dialog === 'rename' && selected?.source === 'saved'
                      ? selected.scope
                      : scope,
                  query:
                    dialog === 'rename' || dialog === 'duplicate'
                      ? selected!.query
                      : current,
                },
              });
            }}
          >
            {dialog === 'delete' ? (
              <p>删除「{selected?.name}」？数据和标签会保留。</p>
            ) : dialog === 'reorder' ? (
              <div className="grid gap-3">
                <p className="text-sm text-muted-foreground">
                  拖动手柄调整所有可见视图的显示顺序，仅对自己生效。“全部”固定在最前。保存后生效。
                </p>
                <Sortable
                  value={orderedViews}
                  onValueChange={setOrderedViews}
                  getItemValue={(view: ResolvedView) => view.id}
                >
                  <SortableContent className="grid max-h-80 gap-2 overflow-y-auto">
                    {orderedViews.map((view) => (
                      <SortableItem
                        key={view.id}
                        value={view.id}
                        disabled={mutation.isPending}
                        className="flex items-center gap-2 rounded-md border bg-background p-2"
                      >
                        <SortableItemHandle asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`拖动排序：${view.name}`}
                          >
                            <GripVertical className="size-4" />
                          </Button>
                        </SortableItemHandle>
                        <span className="min-w-0 truncate">{view.name}</span>
                      </SortableItem>
                    ))}
                  </SortableContent>
                </Sortable>
              </div>
            ) : (
              <div className="grid gap-4">
                {(dialog === 'create' || dialog === 'duplicate') &&
                  availableScopeOptions.length > 1 && (
                    <div className="grid gap-2">
                      <span id={scopeLabelId}>保存范围</span>
                      <Select
                        value={scope ?? ''}
                        onValueChange={(value) => {
                          if (
                            availableScopeOptions.some((option) => option.value === value)
                          )
                            setScope(value);
                        }}
                        disabled={mutation.isPending || !canCreate}
                      >
                        <SelectTrigger aria-labelledby={scopeLabelId}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableScopeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                <label className="grid gap-2">
                  视图名称
                  <Input
                    value={name}
                    onChange={(event) => {
                      const { value } = event.target;
                      if (dialog !== 'rename' && slug === suggestSlug(name, allViewItems))
                        setSlug(suggestSlug(value, allViewItems));
                      setName(value);
                    }}
                    maxLength={40}
                    required
                    autoFocus
                  />
                </label>
                <label className="grid gap-2">
                  链接标识（slug）
                  <Input
                    value={slug}
                    onChange={(event) => setSlug(event.target.value)}
                    maxLength={80}
                    required={dialog === 'rename' && selected?.slug !== undefined}
                    placeholder="例如 vip-customers"
                  />
                  <span className="text-sm text-muted-foreground">
                    用于分享链接，同一列表内唯一。修改后旧链接将失效。
                  </span>
                </label>
              </div>
            )}
            {error !== null && (
              <p role="alert" className="text-destructive">
                {error}
              </p>
            )}
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                onClick={() => setDialog(null)}
              >
                取消
              </Button>
              <Button
                type="submit"
                variant={dialog === 'delete' ? 'destructive' : 'default'}
                disabled={mutation.isPending}
              >
                {dialog === 'delete' ? '删除' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
