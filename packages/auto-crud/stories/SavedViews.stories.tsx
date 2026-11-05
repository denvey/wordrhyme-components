import type { Meta, StoryObj } from '@storybook/react';
import type { TagOption, TagService, UseAutoCrudResourceReturn } from '../src';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Button } from '@wordrhyme/shadcn';
import { Tags } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import {
  AutoCrudProvider,
  AutoCrudTable,
  createLocalViewStorage,
  TagAssignment,
} from '../src';
import { parseReadableFilters } from '../src/lib/readable-filters';

const schema = z.object({ id: z.string(), name: z.string(), tags: z.array(z.string()) });
type Row = z.output<typeof schema>;
function noop() {
  // The demo handles data changes through TagService.
}
const initialTags: TagOption[] = [
  { value: 'vip', label: '重点客户', color: '#3b82f6' },
  { value: 'review', label: '需要跟进', color: '#f59e0b' },
];

function Demo({
  mode,
  tagActionAppearance,
}: {
  mode: 'simple' | 'advanced' | 'command';
  tagActionAppearance: 'text' | 'icon' | 'both';
}) {
  const [client] = useState(() => new QueryClient());
  const [tagTargets, setTagTargets] = useState<string[] | null>(null);
  const [rows, setRows] = useState<Row[]>([
    { id: '1', name: '客户 A', tags: ['vip', 'review'] },
    { id: '2', name: '客户 B', tags: ['vip'] },
    { id: '3', name: '客户 C', tags: [] },
  ]);
  const [search, setSearch] = useState(() => window.location.search);
  useEffect(() => {
    const update = () => setSearch(window.location.search);
    window.addEventListener('urlchange', update);
    window.addEventListener('popstate', update);
    return () => {
      window.removeEventListener('urlchange', update);
      window.removeEventListener('popstate', update);
    };
  }, []);
  const services = useMemo(() => {
    let tags = [...initialTags];
    const tagService: TagService = {
      async list({ query = '', page = 1, pageSize = 30 }) {
        const matching = tags.filter((tag) => tag.label.includes(query));
        return {
          options: matching.slice((page - 1) * pageSize, page * pageSize),
          hasMore: matching.length > page * pageSize,
        };
      },
      async resolve({ ids }) {
        return tags.filter((tag) => ids.includes(tag.value));
      },
      async create({ label, color }) {
        const tag = { value: crypto.randomUUID(), label, color };
        tags = [...tags, tag];
        return tag;
      },
      async update({ id, label, color }) {
        const tag = { value: id, label, color };
        tags = tags.map((current) => (current.value === id ? tag : current));
        return tag;
      },
      async remove({ id }) {
        tags = tags.filter((tag) => tag.value !== id);
        setRows((current) =>
          current.map((row) => ({ ...row, tags: row.tags.filter((tag) => tag !== id) })),
        );
      },
      async assign({ entityIds, add, remove }) {
        setRows((current) =>
          current.map((row) =>
            entityIds.includes(row.id)
              ? {
                  ...row,
                  tags: [
                    ...new Set([
                      ...row.tags.filter((tag) => !remove.includes(tag)),
                      ...add,
                    ]),
                  ],
                }
              : row,
          ),
        );
      },
    };
    return { tagService, viewStorage: createLocalViewStorage('storybook:user:tenant') };
  }, []);
  const data = useMemo(() => {
    const params = new URLSearchParams(search);
    const filters = parseReadableFilters<Row>(params, [
      { id: 'name' },
      { id: 'tags', meta: { variant: 'tags' } },
    ]);
    return rows
      .filter((row) => {
        if (!row.name.toLowerCase().includes((params.get('search') ?? '').toLowerCase()))
          return false;
        const matches = filters.map((filter) => {
          if (filter.variant !== 'tags')
            return row.name.toLowerCase().includes(String(filter.value).toLowerCase());
          const { include, exclude, match } = filter.value;
          return (
            (include.length === 0 ||
              (match === 'all'
                ? include.every((id) => row.tags.includes(id))
                : include.some((id) => row.tags.includes(id)))) &&
            !exclude.some((id) => row.tags.includes(id))
          );
        });
        return (
          !matches.length ||
          (params.get('joinOperator') === 'or'
            ? matches.some(Boolean)
            : matches.every(Boolean))
        );
      })
      .sort((a, b) =>
        params.get('sort') === 'name.desc'
          ? b.name.localeCompare(a.name)
          : a.name.localeCompare(b.name),
      );
  }, [rows, search]);
  const resource: UseAutoCrudResourceReturn<typeof schema, Row> = {
    tableData: { data, pageCount: 1, isLoading: false, isFetching: false },
    modal: {
      createOpen: false,
      editOpen: false,
      deleteOpen: false,
      viewOpen: false,
      selected: null,
      copySource: null,
      variant: 'dialog',
    },
    mutations: {
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      isImporting: false,
    },
    handlers: {
      openCreate: noop,
      openEdit: noop,
      openDelete: noop,
      openView: noop,
      copyRow: noop,
      closeModals: noop,
      submitCreate: noop,
      submitUpdate: noop,
      confirmDelete: noop,
      deleteMany: noop,
      updateMany: noop,
      setVariant: noop,
      import: null,
      export: null,
      refresh: async () => undefined,
    },
  };
  return (
    <QueryClientProvider client={client}>
      <AutoCrudProvider scope="storybook:user:tenant" {...services}>
        <p className="mb-4 text-sm text-muted-foreground">
          通过行操作菜单或多选后的批量操作设置标签。入口位置及文字、图标由业务配置；视图保存在当前浏览器。
        </p>
        <AutoCrudTable
          id="demo.customers"
          schema={schema}
          resource={resource}
          permissions={{ can: { create: false, delete: false } }}
          actions={{
            row: [
              {
                type: 'custom',
                component: ({ row, MenuItem }) => (
                  <MenuItem
                    aria-label="设置标签"
                    onSelect={() => setTagTargets([row.id])}
                  >
                    {tagActionAppearance !== 'text' && (
                      <Tags aria-hidden="true" className="size-4" />
                    )}
                    {tagActionAppearance !== 'icon' && '设置标签'}
                  </MenuItem>
                ),
              },
            ],
            batch: [
              {
                type: 'custom',
                component: ({ rows: selectedRows }) => (
                  <Button
                    type="button"
                    variant="outline"
                    size={tagActionAppearance === 'icon' ? 'icon-sm' : 'sm'}
                    aria-label="批量设置标签"
                    onClick={() => setTagTargets(selectedRows.map((row) => row.id))}
                  >
                    {tagActionAppearance !== 'text' && (
                      <Tags aria-hidden="true" className="size-4" />
                    )}
                    {tagActionAppearance !== 'icon' && '批量设置标签'}
                  </Button>
                ),
              },
            ],
          }}
          table={{
            filterModes: [
              mode,
              ...(['simple', 'advanced', 'command'] as const).filter(
                (value) => value !== mode,
              ),
            ],
          }}
          fields={{
            id: { table: false, form: false },
            name: { label: '客户', filter: { variant: 'text' } },
            tags: {
              label: '分类',
              filter: { variant: 'tags' },
              form: false,
              table: { enableSorting: false },
            },
          }}
        />
        <TagAssignment
          resourceId="demo.customers"
          field="tags"
          title="标签"
          entityIds={tagTargets ?? []}
          open={tagTargets !== null}
          onOpenChange={(open) => {
            if (!open) setTagTargets(null);
          }}
          onSaved={resource.handlers.refresh}
        />
      </AutoCrudProvider>
    </QueryClientProvider>
  );
}

const meta = {
  title: 'Auto CRUD/Saved views and tags',
  component: Demo,
  args: { mode: 'simple', tagActionAppearance: 'both' },
  argTypes: {
    mode: { control: 'select', options: ['simple', 'advanced', 'command'] },
    tagActionAppearance: { control: 'select', options: ['text', 'icon', 'both'] },
  },
} satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
