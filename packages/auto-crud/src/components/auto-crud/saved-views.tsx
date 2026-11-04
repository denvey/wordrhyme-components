'use client';

import type { Table } from '@tanstack/react-table';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from '@wordrhyme/shadcn';
import { ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getUrlParams, setSearchParams } from '@/hooks/use-url-state';
import { getSortingStateParser } from '@/lib/parsers';
import { applyReadableFilters, parseReadableFilters } from '@/lib/readable-filters';
import { queryFingerprint, savedViewSchema, viewInputSchema } from '@/lib/saved-views';
import { useAutoCrudConfig } from './auto-crud-provider';

export function SavedViews<TData>({
  resourceId,
  table,
}: {
  resourceId: string;
  table: Table<TData>;
}) {
  const config = useAutoCrudConfig();
  if (!config?.viewStorage)
    throw new Error('Saved views require AutoCrudProvider.viewStorage');
  return (
    <ViewMenu
      key={`${config.cacheKey}:${resourceId}`}
      resourceId={resourceId}
      table={table}
    />
  );
}

function ViewMenu<TData>({
  resourceId,
  table,
}: {
  resourceId: string;
  table: Table<TData>;
}) {
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
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={views.isPending || mutation.isPending}
          >
            {selected?.name ?? '全部'}
            {dirty ? ' *' : ''}
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => select(null)}>全部</DropdownMenuItem>
          {views.data?.map((view) => (
            <DropdownMenuItem key={view.id} onSelect={() => select(view)}>
              {view.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={views.isError} onSelect={() => open('create')}>
            视图另存为
          </DropdownMenuItem>
          {selected && (
            <>
              <DropdownMenuItem onSelect={() => open('rename')}>
                重命名视图
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => open('duplicate')}>
                复制视图
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => open('delete')}>
                删除视图
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {dirty && (
        <>
          <Button
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
            size="sm"
            variant="ghost"
            disabled={mutation.isPending}
            onClick={() => select(selected)}
          >
            放弃修改
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
                    create: '视图另存为',
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
    </div>
  );
}
