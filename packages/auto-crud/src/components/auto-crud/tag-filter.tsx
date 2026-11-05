'use client';

import type { ReactNode } from 'react';
import type { TagOption, TagScope } from './auto-crud-provider';
import type { RowActionDialogProps } from '@/lib/row-action-dialog';
import type { TagFilterValue } from '@/lib/tag-filter';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@wordrhyme/shadcn';
import { Plus, Settings } from 'lucide-react';
import { useContext, useEffect, useState } from 'react';
import { normalizeHasMore, normalizeOptions } from '@/lib/registries';
import { emptyTagFilter, tagFilterIds } from '@/lib/tag-filter';
import { CrudResourceContext, useAutoCrudConfig } from './auto-crud-provider';

export interface TagFilterProps {
  field: string;
  title: string;
  value: TagFilterValue;
  onChange: (value: TagFilterValue) => void;
}

export function TagFilter({ field, title, value, onChange }: TagFilterProps) {
  const resourceId = useContext(CrudResourceContext);
  const config = useAutoCrudConfig();
  if (resourceId === undefined || resourceId === '' || !config?.tagService)
    throw new Error('Tag fields require a CRUD id and AutoCrudProvider.tagService');
  return (
    <TagPicker
      key={`${config.cacheKey}:${resourceId}:${field}`}
      scope={{ resourceId, field }}
      title={title}
      value={value}
      onChange={onChange}
      purpose="filter"
    />
  );
}

interface TagSelection {
  selected: string[];
  mixed: string[];
}

type TagPickerProps = {
  scope: TagScope;
  title: string;
  disabled?: boolean;
  footer?: ReactNode;
} & (
  | {
      purpose: 'filter';
      value: TagFilterValue;
      onChange: (value: TagFilterValue) => void;
    }
  | { purpose: 'assign'; value: TagSelection; onChange: (value: TagSelection) => void }
);

function TagPicker(props: TagPickerProps) {
  const { scope, title, purpose, disabled, footer } = props;
  const config = useAutoCrudConfig()!;
  const service = config.tagService!;
  const client = useQueryClient();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const [open, setOpen] = useState(false);
  const [manager, setManager] = useState(false);
  const [requestError, setRequestError] = useState<Error | null>(null);
  const onRequestError = (reason: unknown) =>
    setRequestError(reason instanceof Error ? reason : new Error(String(reason)));
  const prefix = ['auto-crud-tags', config.cacheKey, scope.resourceId, scope.field];
  const ids =
    props.purpose === 'filter'
      ? tagFilterIds(props.value)
      : [...props.value.selected, ...props.value.mixed];
  const options = useInfiniteQuery({
    queryKey: [...prefix, 'list', debouncedQuery],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      service.list({
        ...scope,
        type: 'filter',
        page: pageParam,
        pageSize: 30,
        query: debouncedQuery,
        signal,
      }),
    getNextPageParam: (last, pages) =>
      normalizeHasMore(last) ? pages.length + 1 : undefined,
    enabled: purpose === 'assign' || open || manager,
  });
  const selected = useQuery({
    queryKey: [...prefix, 'resolve', ids],
    queryFn: () => service.resolve({ ...scope, ids }),
    enabled: ids.length > 0,
  });
  const merged = new Map(
    [
      ...(selected.data ?? []),
      ...(options.data?.pages.flatMap(normalizeOptions) ?? []),
    ].map((option) => [option.value, option]),
  );
  let unresolvedLabel = '已失效标签';
  if (selected.isPending) unresolvedLabel = '加载中';
  else if (selected.error !== null) unresolvedLabel = '无法加载';
  for (const id of ids)
    if (!merged.has(id))
      merged.set(id, {
        value: id,
        label: `${unresolvedLabel} (${id})`,
        disabled: true,
      });
  const change = (id: string, mode: 'include' | 'exclude' | 'none') => {
    if (props.purpose === 'assign') {
      props.onChange({
        selected: [
          ...props.value.selected.filter((tag) => tag !== id),
          ...(mode === 'include' ? [id] : []),
        ],
        mixed: props.value.mixed.filter((tag) => tag !== id),
      });
      return;
    }
    props.onChange({
      ...props.value,
      include: [
        ...props.value.include.filter((tag) => tag !== id),
        ...(mode === 'include' ? [id] : []),
      ],
      exclude: [
        ...props.value.exclude.filter((tag) => tag !== id),
        ...(mode === 'exclude' ? [id] : []),
      ],
    });
  };
  const failure = requestError ?? options.error ?? selected.error;
  const picker = (
    <>
      <Input
        aria-label={`搜索${title}`}
        placeholder={`搜索${title}`}
        value={query}
        disabled={disabled}
        onChange={(event) => setQuery(event.target.value)}
      />
      {purpose === 'assign' && (
        <div aria-live="polite">
          {ids.length > 0 ? (
            <ul aria-label="已选标签" className="flex flex-wrap gap-2 pt-3">
              {ids.map((id) => {
                const option = merged.get(id)!;
                return (
                  <li
                    key={id}
                    className="inline-flex items-center gap-1 rounded border px-2 py-1 text-sm"
                  >
                    <span
                      className="size-2 shrink-0 rounded"
                      style={{
                        backgroundColor: option.color ?? 'var(--muted-foreground)',
                      }}
                    />
                    {option.label}
                    {props.purpose === 'assign' && props.value.mixed.includes(id) && (
                      <span className="text-muted-foreground">（部分记录）</span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="pt-3 text-sm text-muted-foreground">尚未选择标签</p>
          )}
        </div>
      )}
      {failure && (
        <p role="alert" className="text-sm text-destructive">
          {failure.message}
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setRequestError(null);
              Promise.all([options.refetch(), selected.refetch()]).catch(onRequestError);
            }}
          >
            重试
          </Button>
        </p>
      )}
      <div
        className="my-2 max-h-72 overflow-auto"
        onScroll={(event) => {
          const el = event.currentTarget;
          if (
            el.scrollHeight - el.scrollTop - el.clientHeight < 24 &&
            options.hasNextPage &&
            !options.isFetchingNextPage
          )
            options.fetchNextPage().catch(onRequestError);
        }}
      >
        {[...merged.values()].map((option) => {
          let mode: 'include' | 'exclude' | 'none' = 'none';
          if (props.purpose === 'filter') {
            if (props.value.include.includes(option.value)) mode = 'include';
            else if (props.value.exclude.includes(option.value)) mode = 'exclude';
          } else if (props.value.selected.includes(option.value)) mode = 'include';
          const mixed =
            props.purpose === 'assign' && props.value.mixed.includes(option.value);
          return (
            <div key={option.value} className="flex items-center gap-2 py-2">
              <Checkbox
                aria-label={`选择 ${option.label}`}
                checked={mixed ? 'indeterminate' : mode !== 'none'}
                disabled={
                  disabled || (option.disabled === true && mode === 'none' && !mixed)
                }
                onCheckedChange={(checked) =>
                  change(option.value, checked === true ? 'include' : 'none')
                }
              />
              <span
                className="size-3 shrink-0 rounded"
                style={{ backgroundColor: option.color ?? 'var(--muted-foreground)' }}
              />
              <span className="min-w-0 flex-1 truncate text-sm" title={option.label}>
                {option.label}
              </span>
              {purpose === 'filter' && mode !== 'none' && (
                <select
                  aria-label={`${option.label}匹配方式`}
                  className="rounded border bg-background p-1 text-sm"
                  value={mode}
                  onChange={(event) =>
                    change(option.value, event.target.value as 'include' | 'exclude')
                  }
                >
                  <option value="include">正选</option>
                  <option value="exclude">反选</option>
                </select>
              )}
            </div>
          );
        })}
        {options.isFetching && (
          <p role="status" className="text-sm text-muted-foreground">
            加载中…
          </p>
        )}
        {!options.isFetching && !merged.size && (
          <p className="py-3 text-sm text-muted-foreground">暂无标签</p>
        )}
      </div>
      {props.purpose === 'filter' && (
        <Label className="flex items-center gap-2">
          <Checkbox
            checked={props.value.match === 'all'}
            onCheckedChange={(checked) =>
              props.onChange({ ...props.value, match: checked === true ? 'all' : 'any' })
            }
          />
          多选取交集
        </Label>
      )}
      <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => {
            if (props.purpose === 'filter') props.onChange(emptyTagFilter());
            else props.onChange({ selected: [], mixed: [] });
          }}
        >
          清空
        </Button>
        <div className="flex items-center gap-2">
          {(service.create || service.update || service.remove) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => setManager(true)}
            >
              <Settings className="size-4" />
              自定义设置
            </Button>
          )}
          {footer}
        </div>
      </div>
    </>
  );
  return (
    <>
      {purpose === 'assign' ? (
        <div>{picker}</div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 border-dashed"
            >
              <Plus className="size-4" />
              {title}
              {ids.length > 0 && (
                <span className="text-muted-foreground">{ids.length}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-3">
            {picker}
          </PopoverContent>
        </Popover>
      )}
      {manager && (
        <TagManager
          key={`${scope.resourceId}:${scope.field}`}
          open={manager}
          onOpenChange={setManager}
          scope={scope}
          options={[...merged.values()].filter(
            (option): option is TagOption => typeof option.color === 'string',
          )}
          onSaved={() => client.invalidateQueries({ queryKey: prefix })}
          listControls={
            <>
              <Input
                aria-label="搜索要管理的标签"
                placeholder="搜索标签"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {options.error && (
                <p role="alert" className="text-destructive">
                  {options.error.message}
                  <Button
                    variant="link"
                    onClick={() => {
                      options.refetch().catch(onRequestError);
                    }}
                  >
                    重试
                  </Button>
                </p>
              )}
            </>
          }
          pagination={
            options.hasNextPage && (
              <Button
                type="button"
                variant="ghost"
                disabled={options.isFetchingNextPage}
                onClick={() => {
                  options.fetchNextPage().catch(onRequestError);
                }}
              >
                加载更多标签
              </Button>
            )
          }
        />
      )}
    </>
  );
}

function TagManager({
  open,
  onOpenChange,
  scope,
  options,
  onSaved,
  listControls,
  pagination,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: TagScope;
  options: TagOption[];
  onSaved: () => Promise<void>;
  listControls: ReactNode;
  pagination: ReactNode;
}) {
  const service = useAutoCrudConfig()!.tagService!;
  const [editing, setEditing] = useState<TagOption | null>(null);
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [deleting, setDeleting] = useState<TagOption | null>(null);
  const mutation = useMutation({
    mutationFn: async (operation: 'save' | 'delete') => {
      if (operation === 'delete') {
        await service.remove!({ ...scope, id: deleting!.value });
        return;
      }
      if (!label.trim()) throw new Error('请输入标签名称');
      if ((editing && !service.update) || (!editing && !service.create))
        throw new Error('没有管理标签的权限');
      if (editing)
        await service.update!({
          ...scope,
          id: editing.value,
          label: label.trim(),
          color,
        });
      else await service.create!({ ...scope, label: label.trim(), color });
    },
    onSuccess: async () => {
      setEditing(null);
      setDeleting(null);
      setLabel('');
      await onSaved();
    },
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!mutation.isPending) {
          onOpenChange(next);
          setDeleting(null);
        }
      }}
    >
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>自定义分类</DialogTitle>
        </DialogHeader>
        {listControls}
        <div className="max-h-60 overflow-auto">
          {options.map((option) => (
            <div className="flex items-center gap-2 py-1" key={option.value}>
              <span
                className="size-3 rounded"
                style={{ backgroundColor: option.color }}
              />
              <span className="flex-1">{option.label}</span>
              {service.update && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(option);
                    setLabel(option.label);
                    setColor(option.color);
                    setDeleting(null);
                    mutation.reset();
                  }}
                >
                  编辑
                </Button>
              )}
              {service.remove && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={mutation.isPending}
                  onClick={() => setDeleting(option)}
                >
                  删除
                </Button>
              )}
            </div>
          ))}
        </div>
        {pagination}
        {deleting ? (
          <div className="grid gap-2">
            <p>删除「{deleting.label}」及其数据关联？引用此标签的视图将提示标签失效。</p>
            <Button
              type="button"
              variant="destructive"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate('delete')}
            >
              确认删除
            </Button>
            <Button type="button" variant="outline" onClick={() => setDeleting(null)}>
              取消
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate('save');
            }}
            className="grid gap-3"
          >
            <Label>
              标签名称
              <Input
                value={label}
                maxLength={80}
                required
                onChange={(event) => setLabel(event.target.value)}
              />
            </Label>
            <Label>
              颜色
              <Input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-9 w-20"
              />
            </Label>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setLabel('');
                }}
              >
                新建标签
              </Button>
              <Button
                type="submit"
                disabled={
                  mutation.isPending || !(editing ? service.update : service.create)
                }
              >
                {editing ? '保存修改' : '创建标签'}
              </Button>
            </DialogFooter>
          </form>
        )}
        {mutation.error && (
          <p role="alert" className="text-destructive">
            {mutation.error.message}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export interface TagAssignmentProps
  extends TagScope, Pick<RowActionDialogProps, 'open' | 'onOpenChange'> {
  title: string;
  /** Current record tags, snapshotted when the editor opens. */
  entities: { id: string; tagIds: string[] }[];
  onSaved?: () => unknown | Promise<unknown>;
}

/** Controlled dialog. Callers own the trigger, its appearance and its placement. */
export function TagAssignment(props: TagAssignmentProps) {
  const config = useAutoCrudConfig();
  if (!props.open || !config?.tagService?.assign) return null;
  return (
    <TagAssignmentEditor
      key={JSON.stringify([
        config.cacheKey,
        props.resourceId,
        props.field,
        props.entities.map((entity) => entity.id),
      ])}
      {...props}
    />
  );
}

function TagAssignmentEditor({
  resourceId,
  field,
  title,
  entities,
  open,
  onOpenChange,
  onSaved,
}: TagAssignmentProps) {
  const config = useAutoCrudConfig()!;
  const [initial] = useState(() => {
    const counts = new Map<string, number>();
    for (const entity of entities)
      for (const id of new Set(entity.tagIds)) counts.set(id, (counts.get(id) ?? 0) + 1);
    return {
      entityIds: entities.map((entity) => entity.id),
      ids: [...counts.keys()],
      selection: {
        selected: [...counts.keys()].filter((id) => counts.get(id) === entities.length),
        mixed: [...counts.keys()].filter((id) => counts.get(id)! < entities.length),
      },
    };
  });
  const [value, setValue] = useState<TagSelection>(initial.selection);
  const add = value.selected.filter((id) => !initial.selection.selected.includes(id));
  const remove = initial.ids.filter(
    (id) => !value.selected.includes(id) && !value.mixed.includes(id),
  );
  const hasChanges = add.length > 0 || remove.length > 0;
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      if (resourceId === undefined || resourceId === '' || !config?.tagService?.assign)
        throw new Error('Tag assignment is not available');
      if (!initial.entityIds.length) throw new Error('Select at least one record');
      await config.tagService.assign({
        resourceId,
        field,
        entityIds: initial.entityIds,
        add,
        remove,
      });
    },
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: ['auto-crud-tags', config?.cacheKey, resourceId, field],
      });
      await onSaved?.();
      onOpenChange(false);
    },
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!mutation.isPending) onOpenChange(next);
      }}
    >
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            设置{title}（{initial.entityIds.length} 条）
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {initial.entityIds.length > 1
            ? '勾选或取消勾选以设置标签；半选表示仅部分记录拥有，未改动的标签会保留。'
            : '勾选需要的标签，取消勾选即可移除。'}
        </p>
        {mutation.error && (
          <p role="alert" className="text-destructive">
            {mutation.error.message}
          </p>
        )}
        <TagPicker
          key={`${config.cacheKey}:${resourceId}:${field}`}
          scope={{ resourceId, field }}
          title={title}
          value={value}
          onChange={setValue}
          purpose="assign"
          disabled={mutation.isPending}
          footer={
            <Button
              type="button"
              disabled={mutation.isPending || !initial.entityIds.length || !hasChanges}
              onClick={() => mutation.mutate()}
            >
              保存
            </Button>
          }
        />
      </DialogContent>
    </Dialog>
  );
}

export function TagCell({ field, ids }: { field: string; ids: string[] }) {
  const resourceId = useContext(CrudResourceContext);
  const config = useAutoCrudConfig();
  const data = useQuery({
    queryKey: ['auto-crud-tags', config?.cacheKey, resourceId, field, 'resolve', ids],
    queryFn: () => config!.tagService!.resolve({ resourceId: resourceId!, field, ids }),
    enabled: Boolean(config?.tagService) && Boolean(resourceId) && ids.length > 0,
  });
  return (
    <div className="flex flex-wrap items-center gap-1">
      {ids.map((id) => {
        const tag = data.data?.find((item) => item.value === id);
        return (
          <span
            key={id}
            className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs"
          >
            <span
              className="size-2 rounded"
              style={{ backgroundColor: tag?.color ?? 'var(--muted-foreground)' }}
            />
            {tag?.label ?? id}
          </span>
        );
      })}
      {data.error && (
        <span role="alert" className="text-destructive">
          {data.error.message}
        </span>
      )}
    </div>
  );
}
