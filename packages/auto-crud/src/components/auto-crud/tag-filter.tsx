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
  DialogHeader,
  DialogTitle,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@wordrhyme/shadcn';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useContext, useEffect, useState } from 'react';
import { emptyTagFilter, tagFilterIds } from '@/lib/tag-filter';
import { cn } from '@/lib/utils';
import { CrudResourceContext, useAutoCrudConfig } from './auto-crud-provider';

export interface TagFilterProps {
  field: string;
  title: string;
  value: TagFilterValue;
  onChange: (value: TagFilterValue) => void;
  /** Toolbar buttons show the field label; inputs fit an existing filter condition. */
  variant?: 'toolbar' | 'input';
  id?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TagFilter({ field, ...props }: TagFilterProps) {
  const resourceId = useContext(CrudResourceContext);
  const config = useAutoCrudConfig();
  if (resourceId === undefined || resourceId === '' || !config?.tagService)
    throw new Error('Tag fields require a CRUD id and AutoCrudProvider.tagService');
  return (
    <TagPicker
      key={`${config.cacheKey}:${resourceId}:${field}`}
      scope={{ resourceId, field }}
      {...props}
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
  footer?: (editing: boolean) => ReactNode;
  onDeleted?: (id: string) => unknown | Promise<unknown>;
} & (
  | ({ purpose: 'filter' } & Omit<TagFilterProps, 'field' | 'title'>)
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
  const [localOpen, setLocalOpen] = useState(false);
  const [editing, setEditing] = useState<TagOption | null>();
  const open = props.purpose === 'filter' ? (props.open ?? localOpen) : false;
  const setOpen = (next: boolean) => {
    setLocalOpen(next);
    if (props.purpose === 'filter') props.onOpenChange?.(next);
    if (!next) setEditing(undefined);
  };
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
        page: pageParam,
        pageSize: 30,
        query: debouncedQuery,
        signal,
      }),
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length + 1 : undefined),
    enabled: purpose === 'assign' || open,
  });
  const selected = useQuery({
    queryKey: [...prefix, 'resolve', ids],
    queryFn: () => service.resolve({ ...scope, ids }),
    enabled: ids.length > 0,
  });
  const merged = new Map(
    [
      ...(selected.data ?? []),
      ...(options.data?.pages.flatMap((page) => page.options) ?? []),
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
        color: 'var(--muted-foreground)',
        disabled: true,
      });
  if (editing && !merged.has(editing.value)) merged.set(editing.value, editing);
  const finishEditing = async (deletedId?: string) => {
    await client.invalidateQueries({ queryKey: prefix });
    if (deletedId !== undefined) await props.onDeleted?.(deletedId);
    setEditing(undefined);
  };
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
  const inputSummary =
    props.purpose === 'filter'
      ? [
          props.value.include.length > 0
            ? `${props.value.match === 'all' ? '包含全部' : '包含任一'}：${props.value.include.map((id) => merged.get(id)?.label ?? id).join('、')}`
            : '',
          props.value.exclude.length > 0
            ? `不包含：${props.value.exclude.map((id) => merged.get(id)?.label ?? id).join('、')}`
            : '',
        ]
          .filter(Boolean)
          .join('；')
      : '';
  const filterValue = props.purpose === 'filter' ? props.value : null;
  const hasFilter = filterValue !== null && ids.length > 0;
  const firstId = ids[0];
  const firstLabel = firstId ? (merged.get(firstId)?.label ?? firstId) : '';
  const summary = firstId
    ? `${filterValue?.exclude.includes(firstId) ? '排除 ' : ''}${firstLabel}`
    : '';
  const filterDescription = [
    (filterValue?.include.length ?? 0) > 0
      ? `包含${filterValue?.match === 'all' ? '全部' : '任一'}：${filterValue?.include.map((id) => merged.get(id)?.label ?? id).join('、')}`
      : '',
    (filterValue?.exclude.length ?? 0) > 0
      ? `排除：${filterValue?.exclude.map((id) => merged.get(id)?.label ?? id).join('、')}`
      : '',
  ]
    .filter(Boolean)
    .join('；');
  const picker = (
    <>
      <Input
        aria-label={`搜索${title}`}
        placeholder={`搜索${title}`}
        value={query}
        disabled={disabled || editing !== undefined}
        onChange={(event) => setQuery(event.target.value)}
      />
      {props.purpose === 'filter' && (
        <div className="mt-3 flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">包含的标签</span>
          <Select
            value={props.value.match}
            disabled={
              disabled || editing !== undefined || props.value.include.length === 0
            }
            onValueChange={(match: 'any' | 'all') => {
              if (props.purpose === 'filter') props.onChange({ ...props.value, match });
            }}
          >
            <SelectTrigger
              aria-label={`${title}包含项匹配方式`}
              size="sm"
              className="h-8 w-auto border-0 bg-transparent font-normal shadow-none hover:bg-accent hover:text-accent-foreground dark:bg-transparent dark:hover:bg-accent/50"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">满足任一</SelectItem>
              <SelectItem value="all">满足全部</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
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
          if (editing?.value === option.value)
            return (
              <TagEditor
                key={option.value}
                scope={scope}
                tag={editing}
                onSaved={finishEditing}
                onCancel={() => setEditing(undefined)}
              />
            );
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
                  disabled ||
                  editing !== undefined ||
                  (option.disabled === true && mode === 'none' && !mixed)
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
              {purpose === 'filter' && (
                <Select
                  value={mode === 'none' ? '' : mode}
                  disabled={
                    disabled ||
                    editing !== undefined ||
                    (option.disabled === true && mode === 'none')
                  }
                  onValueChange={(value: 'include' | 'exclude') =>
                    change(option.value, value)
                  }
                >
                  <SelectTrigger
                    aria-label={`${option.label}筛选方式`}
                    size="sm"
                    className="h-7 w-24 shrink-0 border-0 bg-transparent font-normal shadow-none hover:bg-accent hover:text-accent-foreground dark:bg-transparent dark:hover:bg-accent/50"
                  >
                    <SelectValue placeholder="不筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="include">包含</SelectItem>
                    <SelectItem value="exclude">不包含</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {(service.update || service.remove) &&
                typeof option.color === 'string' &&
                !option.disabled && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`编辑 ${option.label}`}
                    title={`编辑 ${option.label}`}
                    disabled={disabled || editing !== undefined}
                    onClick={() => setEditing({ ...option, color: option.color! })}
                  >
                    <Pencil aria-hidden="true" className="size-3.5" />
                  </Button>
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
      {editing === null && (
        <TagEditor
          scope={scope}
          tag={null}
          defaultLabel={query.trim()}
          onSaved={finishEditing}
          onCancel={() => setEditing(undefined)}
        />
      )}
      {editing !== null && service.create && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          disabled={disabled || editing !== undefined}
          onClick={() => setEditing(null)}
        >
          <Plus aria-hidden="true" className="size-4" />
          添加标签
        </Button>
      )}
      {props.purpose === 'filter' && props.value.exclude.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">不包含项始终同时生效。</p>
      )}
      <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || editing !== undefined}
          onClick={() => {
            if (props.purpose === 'filter') props.onChange(emptyTagFilter());
            else props.onChange({ selected: [], mixed: [] });
          }}
        >
          清空
        </Button>
        {footer?.(editing !== undefined)}
      </div>
    </>
  );
  return (
    <>
      {purpose === 'assign' ? (
        <div>{picker}</div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          {props.variant === 'input' ? (
            <PopoverTrigger asChild>
              <Button
                id={props.id}
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  'h-8 min-w-0 w-full justify-start font-normal',
                  props.className,
                )}
                aria-label={`${title}：${inputSummary || '选择标签'}`}
                title={inputSummary || undefined}
              >
                <span className="truncate">{inputSummary || '选择标签'}</span>
              </Button>
            </PopoverTrigger>
          ) : (
            <div className="inline-flex items-center">
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  className={`h-8 border-dashed font-normal ${hasFilter ? 'rounded-r-none border-r-0 pr-1' : ''}`}
                  title={hasFilter ? `${title}：${filterDescription}` : undefined}
                  aria-label={hasFilter ? `${title}：${filterDescription}` : title}
                >
                  {!hasFilter && <Plus className="size-4" />}
                  <span className="max-w-56 truncate">
                    {title}
                    {hasFilter ? `：${summary}` : ''}
                  </span>
                  {hasFilter && ids.length > 1 && (
                    <span className="text-muted-foreground">+{ids.length - 1}</span>
                  )}
                </Button>
              </PopoverTrigger>
              {hasFilter && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="h-8 rounded-l-none border-l-0 border-dashed"
                  aria-label={`清除${title}筛选`}
                  title={`清除${title}筛选`}
                  disabled={disabled}
                  onClick={() => {
                    if (props.purpose === 'filter') props.onChange(emptyTagFilter());
                  }}
                >
                  <X className="size-3.5" />
                </Button>
              )}
            </div>
          )}
          <PopoverContent align="start" className="w-88 max-w-[calc(100vw-2rem)] p-3">
            {picker}
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}

function TagEditor({
  scope,
  tag,
  defaultLabel = '',
  onSaved,
  onCancel,
}: {
  scope: TagScope;
  tag: TagOption | null;
  defaultLabel?: string;
  onSaved: (deletedId?: string) => Promise<void>;
  onCancel: () => void;
}) {
  const service = useAutoCrudConfig()!.tagService!;
  const [label, setLabel] = useState(tag?.label ?? defaultLabel);
  const [color, setColor] = useState(tag?.color ?? '#3b82f6');
  const [deleting, setDeleting] = useState(false);
  const mutation = useMutation({
    mutationFn: async (operation: 'save' | 'delete') => {
      if (operation === 'delete') {
        if (!tag || !service.remove) throw new Error('没有删除标签的权限');
        await service.remove({ ...scope, id: tag.value });
        return;
      }
      if (!label.trim()) throw new Error('请输入标签名称');
      if ((tag && !service.update) || (!tag && !service.create))
        throw new Error('没有管理标签的权限');
      if (tag)
        await service.update!({
          ...scope,
          id: tag.value,
          label: label.trim(),
          color,
        });
      else await service.create!({ ...scope, label: label.trim(), color });
    },
    onSuccess: async (_result, operation) => {
      await onSaved(operation === 'delete' ? tag!.value : undefined);
    },
  });
  return (
    <div className="my-2 rounded-md border p-2">
      {deleting ? (
        <div className="grid gap-2">
          <p className="text-sm">
            删除「{tag!.label}」及其数据关联？引用此标签的视图将提示标签失效。
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate('delete')}
            >
              确认删除
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => setDeleting(false)}
            >
              取消删除
            </Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            mutation.mutate('save');
          }}
          className="flex items-center gap-1"
        >
          <Input
            aria-label="标签名称"
            placeholder="标签名称"
            className="min-w-0 flex-1"
            value={label}
            maxLength={80}
            required
            disabled={mutation.isPending || Boolean(tag && !service.update)}
            onChange={(event) => setLabel(event.target.value)}
          />
          <Input
            aria-label="标签颜色"
            type="color"
            value={color}
            disabled={mutation.isPending || Boolean(tag && !service.update)}
            onChange={(event) => setColor(event.target.value)}
            className="size-9 shrink-0 p-1"
          />
          {(tag ? service.update : service.create) && (
            <Button
              type="submit"
              size="icon-sm"
              variant="ghost"
              aria-label={tag ? '保存标签修改' : '创建标签'}
              title={tag ? '保存标签修改' : '创建标签'}
              disabled={mutation.isPending || !label.trim()}
            >
              <Check aria-hidden="true" className="size-4" />
            </Button>
          )}
          {tag && service.remove && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={`删除 ${tag.label}`}
              title={`删除 ${tag.label}`}
              disabled={mutation.isPending}
              onClick={() => {
                mutation.reset();
                setDeleting(true);
              }}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          )}
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="取消编辑标签"
            title="取消编辑标签"
            disabled={mutation.isPending}
            onClick={onCancel}
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </form>
      )}
      {mutation.error && (
        <p role="alert" className="text-destructive">
          {mutation.error.message}
        </p>
      )}
    </div>
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
  const [initial, setInitial] = useState(() => {
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
          onDeleted={async (id) => {
            setInitial((current) => ({
              ...current,
              ids: current.ids.filter((tag) => tag !== id),
              selection: {
                selected: current.selection.selected.filter((tag) => tag !== id),
                mixed: current.selection.mixed.filter((tag) => tag !== id),
              },
            }));
            setValue((current) => ({
              selected: current.selected.filter((tag) => tag !== id),
              mixed: current.mixed.filter((tag) => tag !== id),
            }));
            await onSaved?.();
          }}
          footer={(editing) => (
            <Button
              type="button"
              disabled={
                mutation.isPending || editing || !initial.entityIds.length || !hasChanges
              }
              onClick={() => mutation.mutate()}
            >
              保存
            </Button>
          )}
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
