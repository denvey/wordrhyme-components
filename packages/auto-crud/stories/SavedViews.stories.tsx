import type { Meta, StoryObj } from '@storybook/react';
import type {
  SavedViewsConfig,
  TagOption,
  TagService,
  UseAutoCrudResourceReturn,
  ViewInput,
  ViewQuery,
  ViewStorage,
} from '../src';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Button } from '@wordrhyme/shadcn';
import { Tags } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

function matchesQuery(
  row: Row,
  query: Pick<ViewQuery, 'filters' | 'joinOperator' | 'search'>,
) {
  if (!row.name.toLowerCase().includes(query.search.toLowerCase())) return false;
  const matches = query.filters.map((filter) => {
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
    (query.joinOperator === 'or' ? matches.some(Boolean) : matches.every(Boolean))
  );
}

function createDemoViewStorage(): ViewStorage {
  const initialViews: ViewInput[] = [
    ...initialTags.map((tag) => ({
      slug: tag.value === 'vip' ? 'vip-customers' : 'follow-up',
      name: tag.label,
      query: {
        filters: [
          {
            id: 'tags',
            filterId: tag.value,
            variant: 'tags' as const,
            operator: 'matches' as const,
            value: { include: [tag.value], exclude: [], match: 'any' as const },
          },
        ],
        joinOperator: 'and' as const,
        search: '',
        sort: [],
      },
    })),
    {
      slug: 'customer-d',
      name: '客户 D',
      query: { filters: [], joinOperator: 'and', search: '客户 D', sort: [] },
    },
  ];
  const namespace = 'storybook:user:tenant';
  const storage = createLocalViewStorage(namespace);
  const initializations = new Map<string, Promise<void>>();
  const seed = async (resourceId: string) => {
    const marker = `${namespace}:seeded-views:v1:${resourceId}`;
    if (localStorage.getItem(marker) === '1') return;
    const existing = await storage.list(resourceId);
    await Promise.all(
      initialViews
        .filter(
          (input) =>
            !existing.some((view) => view.slug === input.slug || view.id === input.slug),
        )
        .map((input) => storage.create(resourceId, input)),
    );
    localStorage.setItem(marker, '1');
  };
  return {
    ...storage,
    async list(resourceId) {
      let initialization = initializations.get(resourceId);
      if (initialization === undefined) {
        initialization = seed(resourceId).catch((reason: unknown) => {
          initializations.delete(resourceId);
          throw reason;
        });
        initializations.set(resourceId, initialization);
      }
      await initialization;
      return storage.list(resourceId);
    },
  };
}

// All stories describe the same resource, so links and controls share one store.
const demoViewStorage = createDemoViewStorage();

function Demo({
  mode,
  tagActionAppearance,
  automaticTags = false,
  enableViews = true,
  defaultView,
  selector = 'dropdown',
  showCounts = false,
  tabVariant = 'default',
  linePosition = 'bottom',
}: {
  mode: 'simple' | 'advanced' | 'command';
  tagActionAppearance: 'text' | 'icon' | 'both';
  automaticTags?: boolean;
  enableViews?: boolean;
  defaultView?: string;
  selector?: SavedViewsConfig['selector'];
  showCounts?: boolean;
  tabVariant?: NonNullable<SavedViewsConfig['tabs']>['variant'];
  linePosition?: NonNullable<SavedViewsConfig['tabs']>['linePosition'];
}) {
  const [client] = useState(() => new QueryClient());
  const [tagTargets, setTagTargets] = useState<Row[] | null>(null);
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
  const tagService = useMemo(() => {
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
    return tagService;
  }, []);
  const counts = useCallback<NonNullable<SavedViewsConfig['counts']>>(
    async ({ queries, signal }) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      signal.throwIfAborted();
      return Object.fromEntries(
        queries.map((query) => [
          query.key,
          rows.filter((row) => matchesQuery(row, query)).length,
        ]),
      );
    },
    [rows],
  );
  const data = useMemo(() => {
    const params = new URLSearchParams(search);
    const filters = parseReadableFilters<Row>(params, [
      { id: 'name' },
      { id: 'tags', meta: { variant: 'tags' } },
    ]);
    return rows
      .filter((row) =>
        matchesQuery(row, {
          filters,
          joinOperator: params.get('joinOperator') === 'or' ? 'or' : 'and',
          search: params.get('search') ?? '',
        }),
      )
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
  let description =
    '通过行操作菜单或多选后的批量操作设置标签。入口位置及文字、图标由业务配置；视图保存在当前浏览器。';
  if (showCounts) {
    description =
      '视图数量由模拟接口按保存条件统计，包含加载状态和零结果。修改客户标签或保存视图条件后，数量会刷新；视图和排列顺序保存在当前浏览器，客户标签刷新页面后重置。';
  } else if (automaticTags) {
    description = '字段配置 tags: true 后自动提供标签展示、筛选和单条／批量设置入口。';
  }
  return (
    <QueryClientProvider client={client}>
      <AutoCrudProvider
        scope={`storybook:user:tenant${defaultView !== undefined && defaultView !== '' ? `:default:${defaultView}` : ''}`}
        tagService={tagService}
        viewStorage={demoViewStorage}
      >
        <p className="mb-4 text-sm text-muted-foreground">{description}</p>
        <AutoCrudTable
          key={`${selector}:${defaultView ?? ''}`}
          id="demo.customers"
          schema={schema}
          resource={resource}
          permissions={{ can: { create: false, delete: false } }}
          actions={
            automaticTags
              ? undefined
              : {
                  row: [
                    {
                      type: 'custom',
                      component: ({ row, MenuItem }) => (
                        <MenuItem
                          aria-label="设置标签"
                          onSelect={() => setTagTargets([row])}
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
                          onClick={() => setTagTargets(selectedRows)}
                        >
                          {tagActionAppearance !== 'text' && (
                            <Tags aria-hidden="true" className="size-4" />
                          )}
                          {tagActionAppearance !== 'icon' && '批量设置标签'}
                        </Button>
                      ),
                    },
                  ],
                }
          }
          table={{
            views: enableViews
              ? {
                  selector,
                  defaultView,
                  counts: showCounts ? counts : undefined,
                  tabs: {
                    variant: tabVariant,
                    linePosition,
                    classNames:
                      tabVariant === 'line'
                        ? {
                            trigger:
                              'text-base data-[state=on]:text-blue-700 dark:data-[state=on]:text-blue-400',
                            indicator: 'h-1 bg-blue-600 dark:bg-blue-400',
                          }
                        : undefined,
                  },
                }
              : undefined,
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
              ...(automaticTags
                ? { tags: true }
                : { filter: { variant: 'tags' as const } }),
              form: false,
              table: { enableSorting: false },
            },
          }}
        />
        {!automaticTags && (
          <TagAssignment
            resourceId="demo.customers"
            field="tags"
            title="标签"
            entities={(tagTargets ?? []).map((row) => ({ id: row.id, tagIds: row.tags }))}
            open={tagTargets !== null}
            onOpenChange={(open) => {
              if (!open) setTagTargets(null);
            }}
            onSaved={resource.handlers.refresh}
          />
        )}
      </AutoCrudProvider>
    </QueryClientProvider>
  );
}

const meta = {
  title: 'Auto CRUD/Saved views and tags',
  component: Demo,
  args: {
    mode: 'simple',
    tagActionAppearance: 'both',
    automaticTags: false,
    enableViews: true,
    selector: 'dropdown',
    showCounts: false,
    tabVariant: 'default',
    linePosition: 'bottom',
  },
  argTypes: {
    mode: { control: 'select', options: ['simple', 'advanced', 'command'] },
    tagActionAppearance: { control: 'select', options: ['text', 'icon', 'both'] },
    automaticTags: { control: 'boolean' },
    enableViews: { control: 'boolean' },
    defaultView: { control: 'text' },
    selector: { control: 'select', options: ['dropdown', 'tabs'] },
    showCounts: { control: 'boolean' },
    tabVariant: { control: 'select', options: ['default', 'line'] },
    linePosition: { control: 'select', options: ['bottom', 'top'] },
  },
} satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const AutomaticTags: Story = { args: { automaticTags: true } };
export const DefaultDisabled: Story = { args: { enableViews: false } };
export const DefaultView: Story = {
  args: { defaultView: 'vip-customers', selector: 'tabs', showCounts: true },
};
export const Tabs: Story = { args: { selector: 'tabs' } };
export const TabsWithCounts: Story = { args: { selector: 'tabs', showCounts: true } };
export const LineTabs: Story = {
  args: { selector: 'tabs', showCounts: true, tabVariant: 'line' },
};
export const TopLineTabs: Story = {
  args: {
    selector: 'tabs',
    showCounts: true,
    tabVariant: 'line',
    linePosition: 'top',
  },
};
