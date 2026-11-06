'use client';

import type { Table } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import type { SavedView, ViewInput, ViewQuery } from '@/lib/saved-views';
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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getUrlParams, setSearchParams } from '@/hooks/use-url-state';
import { getSortingStateParser } from '@/lib/parsers';
import { applyReadableFilters, parseReadableFilters } from '@/lib/readable-filters';
import { queryFingerprint, savedViewSchema, viewInputSchema } from '@/lib/saved-views';
import { useAutoCrudConfig } from './auto-crud-provider';

export interface SavedViewsConfig {
  /** Initial display mode; users can switch modes in the toolbar. */
  selector?: 'dropdown' | 'tabs';
}

interface SavedViewsProps<TData> extends SavedViewsConfig {
  resourceId: string;
  table: Table<TData>;
  children: (
    controls: ReactNode,
    display: NonNullable<SavedViewsConfig['selector']>,
  ) => ReactNode;
}

export function SavedViews<TData>({
  resourceId,
  table,
  selector,
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
      selector={selector}
      children={children}
    />
  );
}

function ViewMenu<TData>({
  resourceId,
  table,
  selector = 'dropdown',
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
  const [selected, setSelected] = useState<SavedView | null>(null);
  const [display, setDisplay] = useState(selector);
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
  const apply = (query: ViewQuery) => {
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
    const params = getUrlParams();
    applyReadableFilters(params, columns, query.filters as ExtendedColumnFilter<TData>[]);
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
    setSearchParams(params, { history: 'push' });
  };
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
  const controls = (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="flex min-w-0 max-w-full items-center gap-1">
        {display === 'tabs' && (
          <div className="min-w-0 max-w-full overflow-x-auto">
            <ToggleGroup
              type="single"
              size="sm"
              spacing={1}
              value={selected ? `view:${selected.id}` : 'all'}
              onValueChange={selectValue}
              disabled={views.isPending || mutation.isPending}
              aria-label="已保存的视图"
              className="rounded-lg bg-muted p-1"
            >
              <ToggleGroupItem
                value="all"
                className="data-[state=on]:bg-background data-[state=on]:shadow-sm"
              >
                全部
              </ToggleGroupItem>
              {views.data?.map((view) => (
                <ToggleGroupItem
                  key={view.id}
                  value={`view:${view.id}`}
                  className="data-[state=on]:bg-background data-[state=on]:shadow-sm"
                >
                  {view.name}
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
              disabled={views.isPending || mutation.isPending}
            >
              {display === 'tabs' ? (
                <Settings className="size-4" />
              ) : (
                <>
                  {selected?.name ?? '全部'}
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
                  <DropdownMenuRadioItem value="all">全部</DropdownMenuRadioItem>
                  {views.data?.map((view) => (
                    <DropdownMenuRadioItem key={view.id} value={`view:${view.id}`}>
                      {view.name}
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
                    if (value === 'dropdown' || value === 'tabs') setDisplay(value);
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
