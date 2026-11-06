'use client';

import type { Table } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import type { SavedView, ViewInput, ViewPreferences, ViewQuery } from '@/lib/saved-views';
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
  ToggleGroup,
  ToggleGroupItem,
} from '@wordrhyme/shadcn';
import {
  AppWindow,
  ChevronDown,
  Copy,
  PanelsTopLeft,
  Pencil,
  Plus,
  Settings,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getUrlParams, setSearchParams } from '@/hooks/use-url-state';
import { getSortingStateParser } from '@/lib/parsers';
import { applyReadableFilters, parseReadableFilters } from '@/lib/readable-filters';
import { cn } from '@/lib/utils';
import {
  queryFingerprint,
  readViewPreferences,
  savedViewSchema,
  viewInputSchema,
  writeViewPreferences,
} from '@/lib/saved-views';
import { useAutoCrudConfig } from './auto-crud-provider';

export interface SavedViewsConfig {
  /** Wait for asynchronous field metadata before restoring or selecting a view. */
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
  ) => ReactNode;
}

export function SavedViews<TData>({
  resourceId,
  table,
  fieldsReady,
  selector,
  tabs,
  counts,
  onApply,
  children,
}: SavedViewsProps<TData>) {
  const config = useAutoCrudConfig();
  if (!config?.viewStorage)
    throw new Error('Saved views require AutoCrudProvider.viewStorage');
  return (
    <ViewMenu
      key={`${config.cacheKey}:${resourceId}`}
      resourceId={resourceId}
      table={table}
      fieldsReady={fieldsReady}
      onApply={onApply}
      selector={selector}
      tabs={tabs}
      counts={counts}
      children={children}
    />
  );
}

function ViewMenu<TData>({
  resourceId,
  table,
  fieldsReady = true,
  selector = 'dropdown',
  tabs,
  counts,
  onApply,
  children,
}: SavedViewsProps<TData>) {
  const config = useAutoCrudConfig()!;
  const storage = config.viewStorage!;
  const client = useQueryClient();
  const queryKey = ['auto-crud-views', config.cacheKey, resourceId];
  const views = useQuery({
    queryKey,
    queryFn: async () =>
      (await storage.list(resourceId)).map((view) => savedViewSchema.parse(view)),
  });
  const countQueries = useMemo(
    () => [
      { key: 'all', filters: [], joinOperator: 'and' as const, search: '' },
      ...(views.data ?? []).map((view, index) => ({
        key: `view:${index}`,
        filters: view.query.filters,
        joinOperator: view.query.joinOperator,
        search: view.query.search,
      })),
    ],
    [views.data],
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
    enabled: Boolean(counts) && views.isSuccess && fieldsReady,
  });
  const data = table.options.data;
  const previousSource = useRef({ data, counts });
  const refetchCounts = totals.refetch;
  useEffect(() => {
    const previous = previousSource.current;
    previousSource.current = { data, counts };
    if (previous.data === data && previous.counts === counts) return;
    if (counts && views.isSuccess && fieldsReady)
      void client
        .cancelQueries({
          queryKey: ['auto-crud-view-counts', config.cacheKey, resourceId],
        })
        .then(() => refetchCounts());
  }, [
    data,
    counts,
    views.isSuccess,
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
        className="text-muted-foreground tabular-nums"
        aria-label={label}
        title={label}
      >
        {totals.isPending ? '…' : totals.isError || !valid ? '—' : value}
      </span>
    );
  };
  const [selected, setSelected] = useState<SavedView | null>(null);
  const [display, setDisplay] = useState(selector);
  const initialPreferences = useRef<ViewPreferences | null>(null);
  useEffect(() => {
    const preferences = readViewPreferences(config.scope, resourceId);
    initialPreferences.current = preferences;
    if (preferences) setDisplay(preferences.selector);
  }, [config.scope, resourceId]);
  const [dialog, setDialog] = useState<
    'create' | 'rename' | 'duplicate' | 'delete' | null
  >(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(() => getUrlParams().toString());
  useEffect(() => {
    const update = () => setSearch(getUrlParams().toString());
    window.addEventListener('urlchange', update);
    window.addEventListener('popstate', update);
    return () => {
      window.removeEventListener('urlchange', update);
      window.removeEventListener('popstate', update);
    };
  }, []);
  const columns = table.getAllColumns().filter((column) => column.getCanFilter());
  const keys = table.options.meta?.queryKeys;
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
    (query: ViewQuery, history: 'push' | 'replace' = 'push') => {
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
      setSearchParams(params, { history });
      onApply?.();
    },
    [columns, keys, validateQuery, onApply],
  );
  const preferencesRestored = useRef(false);
  useEffect(() => {
    if (preferencesRestored.current || !views.isSuccess || !fieldsReady) return;
    const savedViews = views.data;
    let cancelled = false;
    // Cached views can be ready on mount, before ancestor URL hooks subscribe.
    queueMicrotask(() => {
      if (cancelled || preferencesRestored.current) return;
      preferencesRestored.current = true;
      const preferences = initialPreferences.current;
      if (!preferences || preferences.viewId === null) return;
      const view = savedViews.find((item) => item.id === preferences.viewId);
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
          if (!hasUrlQuery) apply(view.query, 'replace');
          setSelected(view);
          return;
        }
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : String(reason));
      }
      writeViewPreferences(config.scope, resourceId, { ...preferences, viewId: null });
    });
    return () => {
      cancelled = true;
    };
  }, [
    views.isSuccess,
    views.data,
    fieldsReady,
    config.scope,
    resourceId,
    keys,
    readQuery,
    apply,
    validateQuery,
  ]);
  const mutation = useMutation({
    mutationFn: async ({
      operation,
      input,
    }: {
      operation: 'create' | 'update' | 'delete';
      input?: ViewInput;
    }) => {
      if (operation === 'delete') {
        await storage.remove(resourceId, selected!.id);
        return null;
      }
      const valid = viewInputSchema.parse(input);
      return savedViewSchema.parse(
        operation === 'create'
          ? await storage.create(resourceId, valid)
          : await storage.update(resourceId, selected!.id, valid),
      );
    },
    onSuccess: async (view) => {
      if (!view) apply({ filters: [], joinOperator: 'and', search: '', sort: [] });
      setSelected(view);
      writeViewPreferences(config.scope, resourceId, {
        selector: display,
        viewId: view?.id ?? null,
      });
      setDialog(null);
      setError(null);
      await client.invalidateQueries({ queryKey });
    },
    onError: (reason) => setError(reason.message),
  });
  const select = (view: SavedView | null) => {
    try {
      apply(view?.query ?? { filters: [], joinOperator: 'and', search: '', sort: [] });
      setSelected(view);
      writeViewPreferences(config.scope, resourceId, {
        selector: display,
        viewId: view?.id ?? null,
      });
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };
  const open = (operation: NonNullable<typeof dialog>) => {
    setName(operation === 'create' ? '' : (selected?.name ?? ''));
    setError(null);
    setDialog(operation);
  };
  const selectValue = (value: string) => {
    if (value === 'all') select(null);
    else {
      const view = views.data?.find((item) => `view:${item.id}` === value);
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
              {views.data?.map((view, index) => (
                <ToggleGroupItem
                  key={view.id}
                  value={`view:${view.id}`}
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
              size={display === 'tabs' ? 'icon-sm' : 'sm'}
              className="shrink-0"
              aria-label={display === 'tabs' ? '视图设置' : undefined}
              title={display === 'tabs' ? '视图设置' : undefined}
              disabled={!fieldsReady || views.isPending || mutation.isPending}
            >
              {display === 'tabs' ? (
                <Settings className="size-4" />
              ) : (
                <>
                  {selected?.name ?? '全部'}
                  {renderCount(
                    selected
                      ? `view:${views.data?.findIndex((view) => view.id === selected.id)}`
                      : 'all',
                  )}
                  {dirty && (
                    <span
                      aria-label="有未保存修改"
                      className="size-1.5 rounded-full bg-current"
                    />
                  )}
                  <ChevronDown className="size-4" />
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
                  {views.data?.map((view, index) => (
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
            <DropdownMenuItem disabled={views.isError} onSelect={() => open('create')}>
              <Plus className="size-4" />
              另存为新视图
            </DropdownMenuItem>
            {selected && (
              <>
                <DropdownMenuItem onSelect={() => open('rename')}>
                  <Pencil className="size-4" />
                  重命名视图
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => open('duplicate')}>
                  <Copy className="size-4" />
                  复制视图
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => open('delete')}>
                  <Trash2 className="size-4" />
                  删除视图
                </DropdownMenuItem>
              </>
            )}
            {selected && <DropdownMenuSeparator />}
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
                      writeViewPreferences(config.scope, resourceId, {
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
          <Button
            type="button"
            size="sm"
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate({
                operation: 'update',
                input: { name: selected.name, query: current },
              })
            }
          >
            保存修改
          </Button>
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
      {(error !== null || views.error !== null) && (
        <span role="alert" className="text-sm text-destructive">
          {error ?? views.error?.message}
          <Button
            variant="link"
            size="sm"
            onClick={() => {
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
      {children(controls, display)}
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
                  }[dialog]}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              let operation: 'delete' | 'update' | 'create' = 'create';
              if (dialog === 'delete') operation = 'delete';
              else if (dialog === 'rename') operation = 'update';
              mutation.mutate({
                operation,
                input: {
                  name,
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
            ) : (
              <label className="grid gap-2">
                视图名称
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={40}
                  required
                  autoFocus
                />
              </label>
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
