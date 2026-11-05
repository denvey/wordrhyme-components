import type { Meta, StoryObj } from '@storybook/react';
import type { TagOption, TagService, UseAutoCrudResourceReturn } from '../src';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { AutoCrudProvider, AutoCrudTable, createLocalViewStorage } from '../src';
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

function Demo({ mode }: { mode: 'simple' | 'advanced' | 'command' }) {
  const [client] = useState(() => new QueryClient());
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
          可创建标签、修改颜色、单条或批量打标签，再把筛选与排序保存成视图。视图保存在当前浏览器。
        </p>
        <AutoCrudTable
          id="demo.customers"
          schema={schema}
          resource={resource}
          permissions={{ can: { create: false, delete: false } }}
          table={{
            filterModes: [
              mode,
              ...(['simple', 'advanced', 'command'] as const).filter((value) => value !== mode),
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
      </AutoCrudProvider>
    </QueryClientProvider>
  );
}

const meta = {
  title: 'Auto CRUD/Saved views and tags',
  component: Demo,
  args: { mode: 'simple' },
  argTypes: { mode: { control: 'select', options: ['simple', 'advanced', 'command'] } },
} satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
