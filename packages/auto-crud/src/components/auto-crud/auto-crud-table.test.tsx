import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CellContext } from '@tanstack/react-table';
import { z } from 'zod';
import { DropdownMenuItem } from '@wordrhyme/ui';
import { toast } from 'sonner';
import * as exportUtils from '@/lib/export';
import type {
  AutoCrudQueryCapabilities,
  UseAutoCrudResourceReturn,
} from '@/hooks/use-auto-crud-resource';
import type { LocaleProp } from '@/i18n/locale';
import { BUILTIN_LOCALES, resolveLocale } from '@/i18n/locale';
import { crudActions } from '@/lib/crud-actions';
import { setDateFormatter } from '@/lib/format';
import { dataSources } from '@/lib/registries';
import type {
  AutoCrudToolbarContext,
  AutoCrudToolbarResolver,
  Fields,
  RowActionItem,
} from './auto-crud-table';
import { AutoCrudTable, setToolbarResolver } from './auto-crud-table';
import { AutoTable } from './auto-table';

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const schema = z.object({
  id: z.string(),
  spuId: z.string().optional(),
  region: z.string().optional(),
  countries: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

type Row = z.infer<typeof schema>;

const fields: Fields = {
  region: {
    label: 'Dynamic Region',
    dataSource: 'test.dynamic-regions',
    filter: {
      index: 10,
    },
    table: {
      index: 10,
    },
    form: {
      'x-component': 'Combobox',
    },
  },
};

const displayFields: Fields = {
  region: {
    label: 'Dynamic Region',
    dataSource: 'test.dynamic-regions',
    filter: false,
    table: {
      index: 10,
    },
  },
};

const auditSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().nullable().optional(),
  createdByType: z.enum(['user', 'system', 'plugin', 'api-token']).optional(),
  updatedBy: z.string().nullable().optional(),
  updatedByType: z.enum(['user', 'system', 'plugin', 'api-token']).optional(),
});

type AuditRow = z.infer<typeof auditSchema>;

function queryDynamicFilterTrigger() {
  return (
    Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-filter-item] [data-slot="popover-trigger"]',
      ),
    ).find((item) => item.textContent?.includes('Dynamic Region')) ?? null
  );
}

function createResource(
  options: {
    data?: Row[];
    total?: number;
    idKey?: UseAutoCrudResourceReturn<typeof schema, Row>['idKey'];
    isFetching?: boolean;
    modal?: Partial<UseAutoCrudResourceReturn<typeof schema, Row>['modal']>;
    refresh?: UseAutoCrudResourceReturn<typeof schema, Row>['handlers']['refresh'] | null;
    importHandler?: NonNullable<
      UseAutoCrudResourceReturn<typeof schema, Row>['handlers']['import']
    >;
    exportHandler?: NonNullable<
      UseAutoCrudResourceReturn<typeof schema, Row>['handlers']['export']
    >;
    capabilities?: AutoCrudQueryCapabilities;
    fields?: Fields;
  } = {},
): UseAutoCrudResourceReturn<typeof schema, Row> {
  const resource: UseAutoCrudResourceReturn<typeof schema, Row> = {
    idKey: options.idKey ?? 'id',
    tableData: {
      data: options.data ?? [{ id: '1', region: 'west' }],
      pageCount: 1,
      ...(options.total !== undefined ? { total: options.total } : {}),
      isLoading: false,
      isFetching: options.isFetching ?? false,
    },
    capabilities: options.capabilities,
    fields: options.fields,
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
      openCreate: vi.fn(),
      openEdit: vi.fn(),
      openDelete: vi.fn(),
      openView: vi.fn(),
      copyRow: vi.fn(),
      closeModals: vi.fn(),
      submitCreate: vi.fn(),
      submitUpdate: vi.fn(),
      confirmDelete: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
      setVariant: vi.fn(),
      ...(options.refresh === null ? {} : { refresh: options.refresh ?? vi.fn() }),
      import: options.importHandler ?? null,
      export: options.exportHandler ?? null,
    },
  };

  return {
    ...resource,
    modal: {
      ...resource.modal,
      ...options.modal,
    },
  };
}

function createAuditResource(
  options: {
    importHandler?: NonNullable<
      UseAutoCrudResourceReturn<typeof auditSchema, AuditRow>['handlers']['import']
    >;
    defaultSort?: UseAutoCrudResourceReturn<typeof auditSchema, AuditRow>['defaultSort'];
    fields?: Fields;
  } = {},
): UseAutoCrudResourceReturn<typeof auditSchema, AuditRow> {
  return {
    idKey: 'id',
    tableData: {
      data: [
        {
          id: '1',
          name: 'North Store',
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-02T00:00:00Z'),
          createdBy: 'user-1',
          createdByType: 'user',
          updatedBy: 'system',
          updatedByType: 'system',
        },
      ],
      pageCount: 1,
      isLoading: false,
      isFetching: false,
    },
    defaultSort: options.defaultSort,
    fields: options.fields,
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
      openCreate: vi.fn(),
      openEdit: vi.fn(),
      openDelete: vi.fn(),
      openView: vi.fn(),
      copyRow: vi.fn(),
      closeModals: vi.fn(),
      submitCreate: vi.fn(),
      submitUpdate: vi.fn(),
      confirmDelete: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
      setVariant: vi.fn(),
      refresh: vi.fn(),
      import: options.importHandler ?? null,
      export: null,
    },
  };
}

describe('AutoCrudTable dynamic filter dataSource', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    window.history.replaceState(null, '', '/stores');
    dataSources.unregister('test.dynamic-regions');
  });

  afterEach(() => {
    setToolbarResolver(null);
    crudActions.clear();
    dataSources.unregister('test.dynamic-regions');
    cleanup();
    vi.clearAllMocks();
  });

  it('keeps filter-only fields searchable and resettable without showing data columns', async () => {
    window.history.replaceState(null, '', '/stores?region=east&page=4');
    dataSources.register('test.dynamic-regions', () => [
      { value: 'east', label: 'East Dynamic' },
    ]);
    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource()}
        fields={{
          region: {
            label: 'Customer',
            table: false,
            form: false,
            filter: { variant: 'select', dataSource: 'test.dynamic-regions', index: 0 },
          },
        }}
        table={{ filterModes: ['simple'] }}
      />,
    );
    expect(
      await screen.findByRole('button', { name: /Customer.*East Dynamic/ }),
    ).toBeTruthy();
    expect(screen.queryByRole('columnheader', { name: /Customer/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await waitFor(() =>
      expect(new URLSearchParams(window.location.search).has('region')).toBe(false),
    );
    expect(new URLSearchParams(window.location.search).has('page')).toBe(false);
  });

  it('does not reveal denied filter-only fields', () => {
    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource()}
        permissions={{ deny: ['region'] }}
        fields={{
          region: {
            label: 'Private Customer',
            table: false,
            filter: { variant: 'select' },
          },
        }}
        table={{ filterModes: ['simple'] }}
      />,
    );
    expect(screen.queryByRole('button', { name: /Private Customer/ })).toBeNull();
  });

  it('hydrates simple filter options when the data source is registered after render', async () => {
    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource()}
        fields={fields}
        table={{ filterModes: ['simple'] }}
      />,
    );

    expect(await screen.findByPlaceholderText('Dynamic Region')).toBeTruthy();
    expect(queryDynamicFilterTrigger()).toBeNull();

    const loader = vi.fn(({ field, type, values }) => {
      expect(field).toBe('region');
      if (type === 'filter') {
        expect(values).toEqual({});
      }

      return [
        { label: 'East Dynamic', value: 'east' },
        { label: 'West Dynamic', value: 'west' },
      ];
    });

    dataSources.register('test.dynamic-regions', loader);

    await waitFor(() => expect(queryDynamicFilterTrigger()).toBeTruthy());
    expect(await screen.findByText('West Dynamic')).toBeTruthy();
    await waitFor(() =>
      expect(loader).toHaveBeenCalledWith(expect.objectContaining({ type: 'filter' })),
    );
  });

  it('shows the total returned for the current query', () => {
    render(<AutoCrudTable schema={schema} resource={createResource({ total: 394 })} />);

    expect(screen.getByText('Total: 394')).toBeTruthy();
  });

  it('passes simple filter search text to searchable dataSource loaders', async () => {
    const loader = vi.fn(({ field, query, search }) => {
      expect(field).toBe('region');
      expect(query).toBe(search);

      return [
        {
          label: `Region ${search || 'initial'}`,
          value: `region-${search || 'initial'}`,
        },
      ];
    });

    dataSources.register('test.dynamic-regions', {
      search: true,
      debounceMs: 0,
      load: loader,
    });

    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource()}
        fields={fields}
        table={{ filterModes: ['simple'] }}
      />,
    );

    await waitFor(() =>
      expect(loader).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'region',
          type: 'filter',
          query: '',
          search: '',
        }),
      ),
    );

    let trigger: HTMLElement | null = null;
    await waitFor(() => {
      trigger = queryDynamicFilterTrigger();
      expect(trigger).toBeTruthy();
    });
    if (!trigger) throw new Error('Dynamic filter trigger was not rendered');
    fireEvent.click(trigger);
    fireEvent.change(screen.getByPlaceholderText('Dynamic Region'), {
      target: { value: 'beta' },
    });

    await waitFor(() =>
      expect(loader).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'region',
          query: 'beta',
          search: 'beta',
        }),
      ),
    );
    await screen.findByText('Region beta');
  });

  it('loads additional simple filter options from paginated dataSource loaders', async () => {
    const loader = vi.fn(({ field, page, pageSize }) => {
      expect(field).toBe('region');

      const start = ((page ?? 1) - 1) * (pageSize ?? 2);
      const options = ['alpha', 'beta', 'gamma'].slice(start, start + (pageSize ?? 2));

      return {
        hasMore: start + options.length < 3,
        options: options.map((value) => ({
          label: `Region ${value}`,
          value,
        })),
      };
    });

    dataSources.register('test.dynamic-regions', {
      loadMore: true,
      pageSize: 2,
      load: loader,
    });

    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource()}
        fields={fields}
        table={{ filterModes: ['simple'] }}
      />,
    );

    await waitFor(() =>
      expect(loader).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'region',
          page: 1,
          pageSize: 2,
        }),
      ),
    );

    let trigger: HTMLElement | null = null;
    await waitFor(() => {
      trigger = queryDynamicFilterTrigger();
      expect(trigger).toBeTruthy();
    });
    if (!trigger) throw new Error('Dynamic filter trigger was not rendered');
    fireEvent.click(trigger);
    await screen.findByText('Region alpha');
    expect(screen.queryByText('Region gamma')).toBeNull();

    const viewport = document.querySelector(
      '[data-multi-combobox-viewport]',
    ) as HTMLElement;
    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 220 },
      scrollTop: { configurable: true, value: 0, writable: true },
    });
    viewport.scrollTop = 120;
    fireEvent.scroll(viewport);

    await waitFor(() =>
      expect(loader).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'region',
          page: 2,
          pageSize: 2,
        }),
      ),
    );
    await screen.findByText('Region gamma');
  });

  it('keeps dynamic view labels after searchable filter results narrow', async () => {
    const loader = vi.fn(({ field, query, search }) => {
      expect(field).toBe('region');
      expect(query).toBe(search);

      if (search === 'beta') {
        return [{ label: 'Region beta', value: 'beta' }];
      }

      return [
        { label: 'East Dynamic', value: 'east' },
        { label: 'West Dynamic', value: 'west' },
      ];
    });

    dataSources.register('test.dynamic-regions', {
      search: true,
      debounceMs: 0,
      load: loader,
    });

    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource({
          modal: {
            viewOpen: true,
            selected: { id: '1', region: 'west' },
          },
        })}
        fields={fields}
        table={{ filterModes: ['simple'] }}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText('West Dynamic').length).toBeGreaterThanOrEqual(1);
    });

    let trigger: HTMLElement | null = null;
    await waitFor(() => {
      trigger = queryDynamicFilterTrigger();
      expect(trigger).toBeTruthy();
    });
    if (!trigger) throw new Error('Dynamic filter trigger was not rendered');
    fireEvent.click(trigger);
    fireEvent.change(screen.getByPlaceholderText('Dynamic Region'), {
      target: { value: 'beta' },
    });

    await waitFor(() =>
      expect(loader).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'region',
          query: 'beta',
          search: 'beta',
        }),
      ),
    );
    await screen.findByText('Region beta');
    expect(screen.getAllByText('West Dynamic').length).toBeGreaterThanOrEqual(1);
  });

  it('uses dynamic dataSource options for view labels', async () => {
    const loader = vi.fn(() => [
      { label: 'East Dynamic', value: 'east' },
      { label: 'West Dynamic', value: 'west' },
    ]);

    dataSources.register('test.dynamic-regions', loader);

    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource({
          modal: {
            viewOpen: true,
            selected: { id: '1', region: 'west' },
          },
        })}
        fields={fields}
        table={{ filterModes: ['simple'] }}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText('West Dynamic').length).toBeGreaterThanOrEqual(2);
    });
    await waitFor(() => expect(loader).toHaveBeenCalled());
  });
});

describe('AutoCrudTable resolve dataSource', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    window.history.replaceState(null, '', '/stores');
    dataSources.unregister('test.dynamic-regions');
  });

  afterEach(() => {
    setToolbarResolver(null);
    crudActions.clear();
    dataSources.unregister('test.dynamic-regions');
    cleanup();
    vi.clearAllMocks();
  });

  it('keeps projected labels in cells and details when resolution is denied', async () => {
    const loader = vi.fn().mockRejectedValue(new Error('Forbidden'));
    dataSources.register('test.dynamic-regions', loader);
    const row = {
      id: '1',
      region: 'west',
      __crudExtensionProjection: {
        region: { refId: 'west', display: 'Projected West' },
      },
    };

    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource({
          data: [row],
          modal: { viewOpen: true, selected: row },
        })}
        fields={displayFields}
      />,
    );

    await waitFor(() => expect(loader).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.getAllByText('Projected West').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('resolves current page labels once with deduped values', async () => {
    const rows: Row[] = [
      { id: '1', region: 'west' },
      { id: '2', region: 'east' },
      { id: '3', region: 'west' },
    ];
    const loader = vi.fn(({ field, type, values }) => {
      expect(field).toBe('region');
      expect(type).toBe('resolve');
      expect(values).toEqual([{ region: 'west' }, { region: 'east' }]);

      return [
        { label: 'West Dynamic', value: 'west' },
        { label: 'East Dynamic', value: 'east' },
      ];
    });

    dataSources.register('test.dynamic-regions', loader);

    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource({ data: rows })}
        fields={displayFields}
      />,
    );

    await screen.findAllByText('West Dynamic');
    await screen.findByText('East Dynamic');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('adds registered resolve fields to current page values', async () => {
    const loader = vi.fn(({ values }) => {
      expect(values).toEqual([
        { region: 'west', regionType: 'market' },
        { region: 'east', regionType: 'warehouse' },
      ]);

      return [
        { label: 'West Dynamic', value: 'west' },
        { label: 'East Dynamic', value: 'east' },
      ];
    });

    dataSources.register('test.dynamic-regions', {
      resolveFields: ({ field }) => [`${field}Type`],
      load: loader,
    });

    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource({
          data: [
            { id: '1', region: 'west', regionType: 'market' },
            { id: '2', region: 'east', regionType: 'warehouse' },
          ] as Array<Row & { regionType: string }>,
        })}
        fields={displayFields}
      />,
    );

    await screen.findByText('West Dynamic');
    await screen.findByText('East Dynamic');
  });

  it('skips display resolution for hidden and denied fields', async () => {
    const loader = vi.fn(() => [{ label: 'West Dynamic', value: 'west' }]);
    dataSources.register('test.dynamic-regions', loader);

    const deniedRender = render(
      <AutoCrudTable
        schema={schema}
        resource={createResource()}
        fields={displayFields}
        permissions={{ deny: ['region'] }}
      />,
    );

    await waitFor(() => expect(loader).not.toHaveBeenCalled());

    deniedRender.unmount();

    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource()}
        fields={{
          region: {
            label: 'Dynamic Region',
            dataSource: 'test.dynamic-regions',
            filter: false,
            hidden: true,
          },
        }}
      />,
    );

    await waitFor(() => expect(loader).not.toHaveBeenCalled());
  });

  it('uses resolved dataSource labels in cells and view modal', async () => {
    const loader = vi.fn(() => [{ label: 'West Dynamic', value: 'west' }]);
    dataSources.register('test.dynamic-regions', loader);

    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource({
          modal: {
            viewOpen: true,
            selected: { id: '1', region: 'west' },
          },
        })}
        fields={displayFields}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText('West Dynamic').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('only requests cache misses when current page data changes', async () => {
    const loader = vi.fn(({ values }) =>
      (Array.isArray(values) ? values : []).map((item) => ({
        label: `Region ${String(item.region)}`,
        value: String(item.region),
      })),
    );
    dataSources.register('test.dynamic-regions', loader);

    const { rerender } = render(
      <AutoCrudTable
        schema={schema}
        resource={createResource({
          data: [
            { id: '1', region: 'west' },
            { id: '2', region: 'east' },
          ],
        })}
        fields={displayFields}
      />,
    );

    await waitFor(() =>
      expect(loader).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'resolve',
          values: [{ region: 'west' }, { region: 'east' }],
        }),
      ),
    );

    rerender(
      <AutoCrudTable
        schema={schema}
        resource={createResource({
          data: [
            { id: '3', region: 'east' },
            { id: '4', region: 'north' },
          ],
        })}
        fields={displayFields}
      />,
    );

    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    expect(loader.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        type: 'resolve',
        values: [{ region: 'north' }],
      }),
    );
  });

  it('re-resolves cached values when resolve field context changes', async () => {
    const loader = vi.fn(({ values }) =>
      (Array.isArray(values) ? values : []).map((item) => ({
        label: `Region ${String(item.regionType)}`,
        value: String(item.region),
      })),
    );

    dataSources.register('test.dynamic-regions', {
      resolveFields: ['regionType'],
      load: loader,
    });

    const { rerender } = render(
      <AutoCrudTable
        schema={schema}
        resource={createResource({
          data: [{ id: '1', region: 'west', regionType: 'market' }] as Array<
            Row & { regionType: string }
          >,
        })}
        fields={displayFields}
      />,
    );

    await screen.findByText('Region market');

    rerender(
      <AutoCrudTable
        schema={schema}
        resource={createResource({
          data: [{ id: '2', region: 'west', regionType: 'warehouse' }] as Array<
            Row & { regionType: string }
          >,
        })}
        fields={displayFields}
      />,
    );

    await screen.findByText('Region warehouse');
    expect(loader).toHaveBeenCalledTimes(2);
    expect(loader.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        type: 'resolve',
        values: [{ region: 'west', regionType: 'warehouse' }],
      }),
    );
  });
});

describe('auto-crud table toolbar resolver', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    window.history.replaceState(null, '', '/stores');
  });

  afterEach(() => {
    setToolbarResolver(null);
    crudActions.clear();
    dataSources.unregister('test.dynamic-regions');
    cleanup();
    vi.clearAllMocks();
  });

  it('renders a default refresh action and calls the resource refresh handler', () => {
    const refresh = vi.fn().mockResolvedValue(undefined);

    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.products"
        schema={schema}
        resource={createResource({ refresh })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '刷新' }));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('disables the refresh action and spins the icon while fetching', () => {
    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.products"
        schema={schema}
        resource={createResource({ isFetching: true })}
      />,
    );

    const refreshButton = screen.getByRole('button', { name: '刷新' });
    const refreshIcon = refreshButton.querySelector('svg');

    expect((refreshButton as HTMLButtonElement).disabled).toBe(true);
    expect(refreshIcon?.classList.contains('animate-spin')).toBe(true);
  });

  it('shows global search when metadata capabilities enable it', () => {
    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.products"
        schema={schema}
        resource={createResource({
          capabilities: {
            search: { enabled: true, fields: ['region'] },
          },
        })}
      />,
    );

    expect(screen.getByPlaceholderText('搜索')).toBeTruthy();
  });

  it('forwards the global search delay and page key to the search input', () => {
    window.history.replaceState(null, '', '/orders?ordersPage=4&page=7');
    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.orders"
        schema={schema}
        resource={createResource({
          capabilities: { search: { enabled: true, fields: ['region'] } },
        })}
        table={{ search: { debounceMs: 0 }, queryKeys: { page: 'ordersPage' } }}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText('搜索'), {
      target: { value: '2022' },
    });
    const params = new URLSearchParams(window.location.search);
    expect(params.get('search')).toBe('2022');
    expect(params.has('ordersPage')).toBe(false);
    expect(params.get('page')).toBe('7');
  });

  it('does not use field search config when metadata disables search', () => {
    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.products"
        schema={schema}
        resource={createResource({
          capabilities: {
            search: { enabled: false, fields: [] },
          },
        })}
        fields={{
          region: {
            search: true,
          },
        }}
      />,
    );

    expect(screen.queryByPlaceholderText('搜索')).toBeNull();
  });

  it('keeps legacy field search behavior without metadata capabilities', () => {
    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.products"
        schema={schema}
        resource={createResource()}
        fields={{
          region: {
            search: true,
          },
        }}
      />,
    );

    expect(screen.getByPlaceholderText('搜索')).toBeTruthy();
  });

  it('restricts filter and sort controls from metadata capabilities', async () => {
    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.products"
        schema={schema}
        resource={createResource({
          capabilities: {
            search: { enabled: false, fields: [] },
            filters: { enabled: true, fields: ['region'] },
            sort: { enabled: true, fields: ['region'] },
          },
        })}
        fields={{
          spuId: {
            label: 'SPU',
            filter: { variant: 'text' },
          },
          region: {
            label: 'Region',
            filter: { variant: 'text' },
          },
        }}
        table={{ filterModes: ['simple'] }}
      />,
    );

    expect(screen.getByPlaceholderText('Region')).toBeTruthy();
    expect(screen.queryByPlaceholderText('SPU')).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '排序' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '添加排序' }));
    });

    const sortList = screen.getByRole('list');
    expect(sortList.textContent).toContain('Region');
    expect(sortList.textContent).not.toContain('SPU');
  });

  it('shows simple filter mode by default and orders table controls', () => {
    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.products"
        schema={schema}
        resource={createResource()}
      />,
    );

    const modeButton = screen.getByRole('button', {
      name: 'Switch filter mode, current: Simple',
    });
    const sortButton = screen.getByRole('button', { name: '排序' });
    const refreshButton = screen.getByRole('button', { name: '刷新' });
    const viewButton = screen.getByRole('combobox', { name: '列设置' });

    expect(modeButton.compareDocumentPosition(sortButton)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(sortButton.compareDocumentPosition(refreshButton)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(refreshButton.compareDocumentPosition(viewButton)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(refreshButton.parentElement).toBe(sortButton.parentElement);
    expect(refreshButton.parentElement).toBe(viewButton.parentElement);
  });

  it.each(['simple', 'advanced', 'command'] as const)(
    'places refresh beside sorting and column visibility in %s mode without an empty top toolbar',
    (mode) => {
      const { container } = render(
        <AutoCrudTable
          schema={schema}
          resource={createResource()}
          toolbar={[{ type: 'refresh' }]}
          table={{ filterModes: mode, search: true }}
        />,
      );

      const sortButton = screen.getByRole('button', { name: '排序' });
      const refreshButton = screen.getByRole('button', { name: '刷新' });
      const viewButton = screen.getByRole('combobox', { name: '列设置' });

      expect(refreshButton.parentElement).toBe(sortButton.parentElement);
      expect(refreshButton.parentElement).toBe(viewButton.parentElement);
      expect(sortButton.compareDocumentPosition(refreshButton)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
      expect(refreshButton.compareDocumentPosition(viewButton)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
      expect(
        screen.getByPlaceholderText('搜索').closest('[data-filter-parent]')
          ?.parentElement,
      ).toBe(refreshButton.parentElement?.parentElement);
      expect(
        container.firstElementChild?.firstElementChild?.contains(refreshButton),
      ).toBe(true);
      expect(screen.queryByRole('button', { name: '新建' })).toBeNull();
      expect(screen.queryByRole('button', { name: '导出' })).toBeNull();
    },
  );

  it('keeps refresh label and click overrides in the table controls', () => {
    const ownerRefresh = vi.fn();
    const resourceRefresh = vi.fn();

    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource({ refresh: resourceRefresh })}
        toolbar={[{ type: 'refresh', label: '重新加载', onClick: ownerRefresh }]}
      />,
    );

    const refreshButton = screen.getByRole('button', { name: '重新加载' });
    expect(refreshButton.parentElement).toBe(
      screen.getByRole('button', { name: '排序' }).parentElement,
    );
    fireEvent.click(refreshButton);
    expect(ownerRefresh).toHaveBeenCalledTimes(1);
    expect(resourceRefresh).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '刷新' })).toBeNull();
  });

  it('places a replacement refresh component between sorting and column visibility', () => {
    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource({ refresh: null })}
        toolbar={[
          { type: 'refresh', component: <button type="button">Custom refresh</button> },
          { type: 'create' },
        ]}
      />,
    );

    const refreshButton = screen.getByRole('button', { name: 'Custom refresh' });
    const sortButton = screen.getByRole('button', { name: '排序' });
    const viewButton = screen.getByRole('combobox', { name: '列设置' });
    expect(refreshButton.parentElement).toBe(sortButton.parentElement);
    expect(refreshButton.parentElement).toBe(viewButton.parentElement);
    expect(sortButton.compareDocumentPosition(refreshButton)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(refreshButton.compareDocumentPosition(viewButton)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByRole('button', { name: '新建' }).parentElement).not.toBe(
      refreshButton.parentElement,
    );
  });

  it.each(Object.entries(BUILTIN_LOCALES))(
    'localizes sorting and column settings for %s',
    async (language, languagePack) => {
      const controls = languagePack.tableControls!;
      render(
        <AutoCrudTable
          schema={schema}
          resource={createResource()}
          locale={language}
          table={{ defaultSort: [] }}
        />,
      );

      const sortButton = screen.getByRole('button', { name: controls.sort.label });
      const columnsButton = screen.getByRole('combobox', {
        name: controls.columns.label,
      });
      expect(sortButton.getAttribute('title')).toBe(controls.sort.label);
      expect(columnsButton.getAttribute('title')).toBe(controls.columns.label);
      expect(
        screen.getByRole('button', { name: languagePack.toolbar.refresh }),
      ).toBeTruthy();

      fireEvent.click(sortButton);
      expect(screen.getByText(controls.sort.empty)).toBeTruthy();
      expect(screen.getByText(controls.sort.emptyDescription)).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: controls.sort.add }));
      expect(screen.getByText(controls.sort.title)).toBeTruthy();
      expect(screen.getByText(controls.sort.description)).toBeTruthy();
      expect(screen.getByRole('button', { name: controls.sort.reset })).toBeTruthy();
      const direction = screen.getByRole('combobox', { name: controls.sort.direction });
      expect(direction.textContent).toContain(controls.sort.ascending);
      expect(screen.getByRole('button', { name: controls.sort.remove })).toBeTruthy();
      const move = screen.getByRole('button', { name: controls.sort.move });
      const instructionId = move.getAttribute('aria-describedby');
      expect(document.getElementById(instructionId!)?.textContent).toBe(
        controls.sort.dragInstructions,
      );

      fireEvent.keyDown(direction, { key: 'Enter' });
      fireEvent.click(
        await screen.findByRole('option', { name: controls.sort.descending }),
      );
      expect(direction.textContent).toContain(controls.sort.descending);

      const sortList = screen.getByRole('list');
      fireEvent.click(within(sortList).getByRole('button', { name: 'Id' }));
      const fieldSearch = screen.getByPlaceholderText(controls.sort.searchFields);
      fireEvent.change(fieldSearch, { target: { value: 'missing-field' } });
      expect(await screen.findByText(controls.sort.noFields)).toBeTruthy();
      fireEvent.click(sortButton);

      fireEvent.click(columnsButton);
      const columnSearch = screen.getByPlaceholderText(controls.columns.search);
      fireEvent.change(columnSearch, { target: { value: 'missing-column' } });
      expect(await screen.findByText(controls.columns.empty)).toBeTruthy();
    },
  );

  it('updates an open sorting panel when the locale changes', () => {
    const resource = createResource();
    const { rerender } = render(
      <AutoCrudTable schema={schema} resource={resource} locale="zh-CN" />,
    );
    fireEvent.click(screen.getByRole('button', { name: '排序' }));
    fireEvent.click(screen.getByRole('button', { name: '添加排序' }));
    expect(screen.getByRole('combobox', { name: '排序方向' }).textContent).toContain(
      '升序',
    );

    rerender(<AutoCrudTable schema={schema} resource={resource} locale="en-US" />);
    expect(screen.getByRole('button', { name: 'Sort rows' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Toggle columns' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeTruthy();
    expect(screen.getByText('Sort by')).toBeTruthy();
    expect(
      screen.getByRole('combobox', { name: 'Sort direction' }).textContent,
    ).toContain('Asc');
    expect(screen.queryByText('排序依据')).toBeNull();
  });

  it('merges partial table control locale overrides with Chinese defaults', async () => {
    const locale: LocaleProp = {
      tableControls: {
        sort: {
          label: 'Custom sort',
          dragStarted: (label, position, total) =>
            `${label}: ${position.toFixed(0)}/${total}`,
        },
        columns: { label: 'Custom columns' },
      },
    };
    const resolved = resolveLocale(locale);
    expect(resolved.tableControls?.sort.dragStarted('Id', 1, 2)).toBe('Id: 1/2');
    render(<AutoCrudTable schema={schema} resource={createResource()} locale={locale} />);
    fireEvent.click(screen.getByRole('button', { name: 'Custom sort' }));
    expect(screen.getByText('尚未设置排序')).toBeTruthy();
    expect(screen.getByRole('button', { name: '添加排序' })).toBeTruthy();
    fireEvent.click(screen.getByRole('combobox', { name: 'Custom columns' }));
    expect(await screen.findByPlaceholderText('搜索列...')).toBeTruthy();
  });

  it('keeps standalone table control labels in English', () => {
    render(<AutoTable schema={schema} data={[{ id: '1' }]} />);
    expect(screen.getByRole('button', { name: 'Sort rows' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Toggle columns' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Sort rows' }));
    expect(screen.getByRole('button', { name: 'Add sort' })).toBeTruthy();
  });

  it('localizes keyboard sort drag announcements', async () => {
    render(<AutoCrudTable schema={schema} resource={createResource()} locale="zh-CN" />);
    fireEvent.click(screen.getByRole('button', { name: '排序' }));
    fireEvent.click(screen.getByRole('button', { name: '添加排序' }));
    const move = screen.getByRole('button', { name: '移动排序' });
    move.focus();
    fireEvent.keyDown(move, { key: ' ', code: 'Space' });
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toMatch(/已(?:拾起|将)Id/u);
    });
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(await screen.findByText('已取消Id的排序拖动。')).toBeTruthy();
  });

  it('omits the default refresh action when a manual resource has no refresh handler', () => {
    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.products"
        schema={schema}
        resource={createResource({ refresh: null })}
      />,
    );

    expect(screen.queryByRole('button', { name: '刷新' })).toBeNull();
  });

  it('does not restore default refresh action when toolbar takes over builtins', () => {
    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.products"
        schema={schema}
        resource={createResource()}
        toolbar={[{ type: 'export' }]}
      />,
    );

    expect(screen.getByRole('button', { name: '导出' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '刷新' })).toBeNull();
    expect(screen.queryByRole('button', { name: '新建' })).toBeNull();
  });

  it('hides platform actor audit columns by default', () => {
    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.stores"
        schema={auditSchema}
        resource={createAuditResource()}
      />,
    );

    expect(screen.queryAllByText('Name').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Created At').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Updated At').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Created By')).toHaveLength(0);
    expect(screen.queryAllByText('Created By Type')).toHaveLength(0);
    expect(screen.queryAllByText('Updated By')).toHaveLength(0);
    expect(screen.queryAllByText('Updated By Type')).toHaveLength(0);
  });

  it('defaults table sorting to createdAt descending when the schema has createdAt', () => {
    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.stores"
        schema={auditSchema}
        resource={createAuditResource()}
      />,
    );

    const sortButton = screen.getByRole('button', { name: '排序' });
    expect(sortButton.textContent).toContain('1');

    fireEvent.click(sortButton);
    const sortList = screen.getByRole('list');
    expect(sortList.textContent).toContain('Created At');
    expect(sortList.textContent).toContain('降序');
  });

  it('uses resource default sorting ahead of table defaultSort', () => {
    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.stores"
        schema={auditSchema}
        resource={createAuditResource({
          defaultSort: [{ id: 'name', desc: false }],
        })}
        table={{
          defaultSort: [{ id: 'createdAt', desc: true }],
        }}
      />,
    );

    const sortButton = screen.getByRole('button', { name: '排序' });
    fireEvent.click(sortButton);
    const sortList = screen.getByRole('list');
    expect(sortList.textContent).toContain('Name');
    expect(sortList.textContent).toContain('升序');
    expect(sortList.textContent).not.toContain('Created At');
  });

  it('allows actor audit columns when fields explicitly show them', () => {
    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.stores"
        schema={auditSchema}
        resource={createAuditResource()}
        fields={{
          createdByType: {
            label: 'Creator Type',
            table: { hidden: false },
          },
        }}
      />,
    );

    expect(screen.queryAllByText('Creator Type').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Updated By Type')).toHaveLength(0);
  });

  it('lets resource metadata override owner field visibility and cell presentation', () => {
    const dispose = setDateFormatter((_date, _options, preset) =>
      preset === 'datetime' ? '2026-01-02 08:09:10' : 'unexpected',
    );

    try {
      render(
        <AutoCrudTable
          id="com.example.records"
          schema={auditSchema}
          resource={createAuditResource({
            fields: {
              updatedAt: {
                table: {
                  hidden: false,
                  display: 'datetime',
                  label: 'Modified At',
                },
              },
            },
          })}
          fields={{ updatedAt: { hidden: true } }}
          table={{
            overrides: {
              updatedAt: { cell: () => 'owner cell' },
            },
          }}
        />,
      );

      expect(screen.queryAllByText('Modified At').length).toBeGreaterThan(0);
      expect(screen.getByText('2026-01-02 08:09:10')).toBeTruthy();
      expect(screen.queryByText('owner cell')).toBeNull();
    } finally {
      act(() => dispose());
    }
  });

  it('uses the same datetime presentation in the table and view modal', () => {
    const dispose = setDateFormatter((_date, _options, preset) =>
      preset === 'datetime' ? 'September 14, 2026 at 08:09:10' : 'date only',
    );
    try {
      const resource = createAuditResource({
        fields: { updatedAt: { table: { display: 'datetime' } } },
      });
      resource.modal.viewOpen = true;
      resource.modal.selected = resource.tableData.data[0]!;
      render(<AutoCrudTable schema={auditSchema} resource={resource} />);
      expect(screen.getAllByText('September 14, 2026 at 08:09:10')).toHaveLength(2);
    } finally {
      act(() => dispose());
    }
  });

  it.each([
    ['neutral', 'bg-muted', 'text-muted-foreground'],
    ['success', 'bg-emerald-50', 'dark:text-emerald-300'],
    ['warning', 'bg-amber-50', 'dark:text-amber-300'],
    ['info', 'bg-blue-50', 'dark:text-blue-300'],
  ] as const)(
    'renders a theme-aware %s status badge',
    (badgeTone, background, foreground) => {
      render(
        <AutoCrudTable
          schema={schema}
          resource={createResource({
            fields: {
              region: {
                table: {
                  display: 'badge',
                  options: [{ label: 'Imported', value: 'west', badgeTone }],
                },
              },
            },
          })}
        />,
      );
      const badge = screen.getByText('Imported');
      expect(badge.getAttribute('data-slot')).toBe('badge');
      expect(badge.style.backgroundColor).toBe('');
      expect(badge.className).toContain(background);
      expect(badge.className).toContain(foreground);
      expect(badge.querySelector('[aria-hidden="true"]')).not.toBeNull();
    },
  );

  it('renders resolved option labels as plain text when requested by metadata', () => {
    render(
      <AutoCrudTable
        id="com.example.records"
        schema={schema}
        resource={createResource({
          fields: {
            region: {
              table: {
                display: 'text',
                options: [{ label: 'West Region', value: 'west' }],
              },
            },
          },
        })}
        table={{ overrides: { region: { cell: () => 'owner cell' } } }}
      />,
    );

    expect(screen.getByText('West Region')).toBeTruthy();
    expect(screen.queryByText('owner cell')).toBeNull();
  });

  it('uses table-scoped labels with the automatic display mode', () => {
    render(
      <AutoCrudTable
        id="com.example.records"
        schema={schema}
        resource={createResource({
          fields: {
            region: {
              table: {
                options: [{ label: 'West Region', value: 'west' }],
              },
            },
          },
        })}
        table={{ overrides: { region: { cell: () => 'owner cell' } } }}
      />,
    );

    expect(screen.getByText('West Region')).toBeTruthy();
    expect(screen.queryByText('owner cell')).toBeNull();
  });

  it('shares field presentation in details by default while preserving denied fields', async () => {
    dataSources.register('test.view-labels', () => [
      { label: '中文名称', value: 'west' },
    ]);
    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource({
          fields: {
            region: { table: { display: 'text', dataSource: 'test.view-labels' } },
          },
          modal: { viewOpen: true, selected: { id: '1', region: 'west' } },
        })}
        permissions={{ deny: ['id'] }}
      />,
    );
    const dialog = within(screen.getByRole('dialog'));
    expect(await dialog.findByText('中文名称')).toBeTruthy();
    expect(dialog.queryByText('west')).toBeNull();
    expect(dialog.queryByText('Id')).toBeNull();
  });

  it.each([undefined, 'table'] as const)(
    'shares form order and field spans in details with presentation %s',
    (presentation) => {
      render(
        <AutoCrudTable
          schema={schema}
          resource={createResource({
            modal: {
              viewOpen: true,
              selected: {
                id: '1',
                spuId: 'Store',
                region: 'west',
                countries: ['CN'],
                tags: ['internal'],
              },
            },
          })}
          fields={{
            spuId: {
              label: 'Record name',
              table: { index: 30 },
              form: {
                'x-index': 10,
                'x-decorator-props': { className: 'col-span-2' },
              },
            },
            region: { table: { index: 10 }, form: { 'x-index': 20 } },
            countries: { table: { index: 20 } },
            tags: { table: { index: 0 }, form: false },
          }}
          form={{
            columns: 2,
            overrides: {
              countries: {
                'x-index': 30,
              },
            },
          }}
          view={{ presentation }}
        />,
      );
      const dialog = screen.getByRole('dialog');
      const labels = Array.from(dialog.querySelectorAll('[data-slot="form-item-label"]'));
      expect(labels.map((label) => label.textContent)).toEqual([
        'Record name',
        'Region',
        'Countries',
        'Id',
        'Tags',
      ]);
      expect(labels[0]?.closest('[data-slot="form-item"]')?.className).toContain(
        'col-span-2',
      );
      expect(labels[2]?.closest('[data-slot="form-item"]')?.className).not.toContain(
        'col-span-full',
      );
      expect(dialog.querySelector('.grid-cols-2')).not.toBeNull();
    },
  );

  it('uses real table cell context for custom detail formatting', () => {
    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource({
          modal: { viewOpen: true, selected: { id: '1', region: 'west' } },
        })}
        view={{ presentation: 'table' }}
        fields={{ id: { hidden: true } }}
        table={{
          overrides: {
            region: {
              cell: ({
                getValue,
                row,
              }: {
                getValue: () => unknown;
                row: { original: { id: string } };
              }) => `${row.original.id}: ${getValue()}`,
            },
          },
        }}
      />,
    );
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('1: west')).toBeTruthy();
    expect(dialog.queryByText('Id')).toBeNull();
  });

  it('shows table-only hidden fields in details by default', () => {
    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource({
          modal: { viewOpen: true, selected: { id: '1', region: 'west' } },
        })}
        fields={{ region: { table: { hidden: true } } }}
        view={{ overrides: { region: { hidden: false } } }}
      />,
    );
    expect(within(screen.getByRole('dialog')).getByText('west')).toBeTruthy();
  });

  it('renders detail-only label overrides', () => {
    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource({
          modal: { viewOpen: true, selected: { id: '1', region: 'west' } },
        })}
        view={{ overrides: { region: { label: 'Detail region label' } } }}
      />,
    );
    expect(
      within(screen.getByRole('dialog')).getByText('Detail region label'),
    ).toBeTruthy();
  });

  it('does not inherit custom list cells by default', () => {
    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource({
          modal: { viewOpen: true, selected: { id: '1', region: 'west' } },
        })}
        table={{ overrides: { region: { cell: () => 'List action' } } }}
      />,
    );
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('west')).toBeTruthy();
    expect(dialog.queryByText('List action')).toBeNull();
  });

  it('resolves table-hidden details using the selected record outside the current page', async () => {
    const loader = vi.fn(() => [{ label: 'East detail', value: 'east' }]);
    dataSources.register('test.hidden-detail', loader);
    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource({
          modal: { viewOpen: true, selected: { id: '2', region: 'east' } },
        })}
        fields={{
          region: {
            filter: false,
            table: { hidden: true, dataSource: 'test.hidden-detail', display: 'text' },
          },
        }}
      />,
    );
    expect(
      await within(screen.getByRole('dialog')).findByText('East detail'),
    ).toBeTruthy();
    expect(loader).toHaveBeenCalledWith(
      expect.objectContaining({ values: [{ region: 'east' }] }),
    );
  });

  it('does not let detail overrides reveal shared-hidden or denied fields', () => {
    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource({
          modal: { viewOpen: true, selected: { id: '1', region: 'west' } },
        })}
        fields={{ region: { hidden: true } }}
        permissions={{ deny: ['id'] }}
        view={{ overrides: { region: { hidden: false }, id: { hidden: false } } }}
      />,
    );
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.queryByText('west')).toBeNull();
    expect(dialog.queryByText('Id')).toBeNull();
  });

  it('shows all array values and preserves localized booleans in default details', () => {
    const detailSchema = z.object({
      id: z.string(),
      tags: z.array(z.string()),
      enabled: z.boolean(),
    });
    const resource = {
      ...createResource(),
      schema: detailSchema,
      tableData: {
        data: [{ id: '1', tags: ['a', 'b', 'c', 'd', 'e', 'f'], enabled: true }],
        pageCount: 1,
        isLoading: false,
        isFetching: false,
      },
      modal: {
        ...createResource().modal,
        viewOpen: true,
        selected: { id: '1', tags: ['a', 'b', 'c', 'd', 'e', 'f'], enabled: true },
      },
    } as unknown as UseAutoCrudResourceReturn<
      typeof detailSchema,
      z.infer<typeof detailSchema>
    >;
    render(
      <AutoCrudTable
        schema={detailSchema}
        resource={resource}
        locale={{ boolean: { true: 'Enabled detail', false: 'Disabled detail' } }}
      />,
    );
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('f')).toBeTruthy();
    expect(dialog.queryByText('+1')).toBeNull();
    expect(dialog.getByText('Enabled detail')).toBeTruthy();
  });

  it('keeps detail-only formatting out of the list', () => {
    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource({
          modal: { viewOpen: true, selected: { id: '1', region: 'west' } },
        })}
        view={{
          overrides: { region: { cell: () => 'Full detail text' } },
        }}
        table={{ overrides: { region: { cell: () => 'Truncated list text' } } }}
      />,
    );
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('Full detail text')).toBeTruthy();
    expect(dialog.queryByText('Truncated list text')).toBeNull();
    expect(screen.getByText('Truncated list text')).toBeTruthy();
  });

  it('keeps shared hidden fields out of details even when visible in the list', () => {
    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource({
          modal: { viewOpen: true, selected: { id: '1', region: 'west' } },
        })}
        fields={{ region: { hidden: true, table: { hidden: false } } }}
        view={{ presentation: 'table' }}
      />,
    );
    expect(screen.getByText('west')).toBeTruthy();
    expect(within(screen.getByRole('dialog')).queryByText('west')).toBeNull();
  });

  it('preserves the table cell when details override only column order', () => {
    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource({
          modal: { viewOpen: true, selected: { id: '1', region: 'west' } },
        })}
        fields={{
          spuId: { form: { 'x-index': 10 } },
          region: { form: { 'x-index': 20 } },
        }}
        table={{ overrides: { region: { cell: () => 'Formatted region' } } }}
        view={{ presentation: 'table', overrides: { region: { index: 0 } } }}
      />,
    );
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('Formatted region')).toBeTruthy();
    expect(dialog.queryByText('west')).toBeNull();
    expect(
      screen.getByRole('dialog').querySelector('[data-slot="form-item-label"]')
        ?.textContent,
    ).toBe('Region');
  });

  it('shares table data source labels with details but not filters', async () => {
    const loader = vi.fn(() => [{ label: 'West Table Label', value: 'west' }]);
    dataSources.register('test.dynamic-regions', loader);

    render(
      <AutoCrudTable
        id="com.example.records"
        schema={schema}
        resource={createResource({
          fields: {
            region: {
              table: {
                display: 'text',
                dataSource: 'test.dynamic-regions',
              },
            },
          },
          modal: {
            viewOpen: true,
            selected: { id: '1', region: 'west' },
          },
        })}
        table={{ filterModes: ['simple'] }}
      />,
    );

    await waitFor(() => expect(screen.getAllByText('West Table Label')).toHaveLength(2));
    expect(screen.queryByText('west')).toBeNull();
    expect(loader).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'region', type: 'resolve' }),
    );
    expect(loader).not.toHaveBeenCalledWith(
      expect.objectContaining({ field: 'region', type: 'filter' }),
    );
  });

  it('lets table options override matching dataSource labels', async () => {
    const loader = vi.fn(() => [
      { label: 'Resolved Account', value: 'user-1' },
      { label: 'Shop', value: 'com.wordrhyme.shop' },
    ]);
    dataSources.register('test.dynamic-regions', loader);

    render(
      <AutoCrudTable
        id="com.example.records"
        schema={schema}
        resource={createResource({
          data: [
            { id: '1', region: 'user-1' },
            { id: '2', region: 'com.wordrhyme.shop' },
          ],
          fields: {
            region: {
              table: {
                display: 'text',
                dataSource: 'test.dynamic-regions',
                options: [{ label: 'System', value: 'com.wordrhyme.shop' }],
              },
            },
          },
        })}
      />,
    );

    await screen.findByText('Resolved Account');
    expect(screen.getByText('System')).toBeTruthy();
    expect(screen.queryByText('Shop')).toBeNull();
    expect(loader).toHaveBeenCalledWith(
      expect.objectContaining({
        field: 'region',
        type: 'resolve',
        values: [{ region: 'user-1' }, { region: 'com.wordrhyme.shop' }],
      }),
    );
  });

  it('shows a dash for empty arrays in default and declarative text cells', () => {
    render(
      <AutoCrudTable
        id="com.example.records"
        schema={schema}
        resource={createResource({
          data: [{ id: 'empty-countries', countries: [], tags: [] }],
          fields: {
            countries: {
              label: 'Countries',
              table: {
                display: 'text',
                options: [{ label: 'China', value: 'CN' }],
              },
            },
          },
        })}
      />,
    );

    const headers = Array.from(document.querySelectorAll('thead th'));
    const countryColumnIndex = headers.findIndex((header) =>
      header.textContent?.includes('Countries'),
    );
    const tagsColumnIndex = headers.findIndex((header) =>
      header.textContent?.includes('Tags'),
    );
    const row = screen.getByText('empty-countries').closest('tr');
    const cells = row?.querySelectorAll('td');

    expect(countryColumnIndex).toBeGreaterThanOrEqual(0);
    expect(tagsColumnIndex).toBeGreaterThanOrEqual(0);
    expect(cells?.[countryColumnIndex]?.textContent).toBe('-');
    expect(cells?.[tagsColumnIndex]?.textContent).toBe('-');
  });

  it('keeps field permissions ahead of resource visibility metadata', () => {
    render(
      <AutoCrudTable
        id="com.example.records"
        schema={auditSchema}
        resource={createAuditResource({
          fields: {
            updatedAt: {
              table: { hidden: false, label: 'Modified At' },
            },
          },
        })}
        permissions={{ deny: ['updatedAt'] }}
      />,
    );

    expect(screen.queryByText('Modified At')).toBeNull();
  });

  it('allows actor audit columns when legacy table overrides explicitly show them', () => {
    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.stores"
        schema={auditSchema}
        resource={createAuditResource()}
        table={{
          overrides: {
            createdBy: {
              label: 'Creator',
              hidden: false,
            },
          },
        }}
      />,
    );

    expect(screen.queryAllByText('Creator').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Updated By')).toHaveLength(0);
  });

  it('keeps id in import templates while excluding platform managed audit fields', async () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const originalAnchorClick = HTMLAnchorElement.prototype.click;
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:import-template');
    const revokeObjectURL = vi.fn<(url: string) => void>();
    const readBlobText = (blob: Blob) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(blob);
      });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });
    HTMLAnchorElement.prototype.click = vi.fn();

    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.stores"
        schema={auditSchema}
        resource={createAuditResource({
          importHandler: vi
            .fn()
            .mockResolvedValue({ success: 0, updated: 0, skipped: 0, failed: [] }),
        })}
      />,
    );

    try {
      fireEvent.click(screen.getByRole('button', { name: '导入' }));
      fireEvent.click(await screen.findByRole('button', { name: '下载 CSV 模板' }));

      const blob = createObjectURL.mock.calls[0]?.[0] as Blob | undefined;
      expect(blob).toBeTruthy();
      await expect(readBlobText(blob!)).resolves.toBe('id,name\n');
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:import-template');
    } finally {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: originalCreateObjectURL,
      });
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: originalRevokeObjectURL,
      });
      HTMLAnchorElement.prototype.click = originalAnchorClick;
    }
  });

  it('passes current row ids from resource idKey to the injected toolbar resolver', () => {
    const toolbarResolver = vi.fn<AutoCrudToolbarResolver>((_targetId, ownerActions) => [
      ...ownerActions,
      { type: 'custom' as const, component: <button type="button">Injected</button> },
    ]);
    setToolbarResolver(toolbarResolver);
    const resource = createResource({
      idKey: 'spuId',
      data: [
        { id: '1', spuId: 'spu-1', region: 'west' },
        { id: '2', region: 'east' },
      ],
    });

    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.products"
        schema={schema}
        resource={resource}
        toolbar={[{ type: 'export' }]}
      />,
    );

    expect(toolbarResolver).toHaveBeenCalledWith(
      'com.wordrhyme.shop.products',
      [{ type: 'export' }],
      expect.objectContaining({
        crudId: 'com.wordrhyme.shop.products',
        idKey: 'spuId',
        rowIds: ['spu-1'],
        selectedRowIds: [],
        selectedCount: 0,
        refresh: expect.any(Function),
        exportData: expect.any(Function),
        openCreate: resource.handlers.openCreate,
        isRefreshing: false,
        isExporting: false,
      }),
    );
    expect(screen.getByText('Injected')).toBeTruthy();
  });

  it('keeps cells mounted while selecting rows and updating batch actions', async () => {
    const toolbarResolver = vi.fn<AutoCrudToolbarResolver>((_targetId, ownerActions) => [
      ...ownerActions,
    ]);
    setToolbarResolver(toolbarResolver);
    const runBatch = vi.fn();
    const format = vi.fn((value: unknown) => `Region ${value}`);
    render(
      <AutoCrudTable
        id="test.selection"
        locale={{ toolbar: { refresh: 'Refresh' } }}
        schema={schema}
        resource={createResource({
          data: [
            { id: '1', region: 'west' },
            { id: '2', region: 'east' },
          ],
        })}
        fields={{
          region: {
            format,
          },
        }}
        table={{
          hidden: ['spuId'],
          pagination: { showPageJump: true },
          overrides: {
            id: {
              cell: ({ row }: CellContext<Row, unknown>) => (
                <input
                  aria-label={`Note ${row.original.id}`}
                  defaultValue={row.original.region}
                  data-selected={row.getIsSelected()}
                />
              ),
            },
          },
        }}
        actions={{
          batch: [
            {
              type: 'custom',
              component: ({ rows }) => (
                <button type="button" onClick={() => runBatch(rows)}>
                  Process {rows.length}
                </button>
              ),
            },
          ],
        }}
      />,
    );
    const note = screen.getByRole('textbox', { name: 'Note 1' });
    const formattedCell = screen.getByText('Region west');
    const selectAll = screen.getByRole('checkbox', { name: 'Select all' });
    fireEvent.change(note, { target: { value: 'Unsaved note' } });
    format.mockClear();

    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Select row' })[0]!);
    await waitFor(() => {
      expect(toolbarResolver.mock.lastCall?.[2].selectedRowIds).toEqual(['1']);
    });
    expect(selectAll.getAttribute('aria-checked')).toBe('mixed');
    expect(note.getAttribute('data-selected')).toBe('true');
    expect(format).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Note 1' })).toBe(note);
    expect(screen.getByText('Region west')).toBe(formattedCell);
    expect(screen.getByRole('checkbox', { name: 'Select all' })).toBe(selectAll);
    expect((note as HTMLInputElement).value).toBe('Unsaved note');
    fireEvent.click(screen.getByRole('button', { name: 'Process 1' }));
    expect(runBatch).toHaveBeenLastCalledWith([{ id: '1', region: 'west' }]);

    format.mockClear();
    fireEvent.click(selectAll);
    await waitFor(() => {
      expect(toolbarResolver.mock.lastCall?.[2].selectedRowIds).toEqual(['1', '2']);
    });
    expect(selectAll.getAttribute('aria-checked')).toBe('true');
    expect(format).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Process 2' }));
    expect(runBatch).toHaveBeenLastCalledWith([
      { id: '1', region: 'west' },
      { id: '2', region: 'east' },
    ]);

    format.mockClear();
    fireEvent.click(selectAll);
    await waitFor(() => {
      expect(toolbarResolver.mock.lastCall?.[2].selectedRowIds).toEqual([]);
    });
    expect(selectAll.getAttribute('aria-checked')).toBe('false');
    expect(note.getAttribute('data-selected')).toBe('false');
    expect(format).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Process/ })).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Note 1' })).toBe(note);
    expect(screen.getByText('Region west')).toBe(formattedCell);
    expect(screen.getByRole('checkbox', { name: 'Select all' })).toBe(selectAll);
    expect((note as HTMLInputElement).value).toBe('Unsaved note');
  });

  it('refreshes selected row ids when data changes without changing selected count', async () => {
    const toolbarResolver = vi.fn<AutoCrudToolbarResolver>((_targetId, ownerActions) => [
      ...ownerActions,
    ]);
    setToolbarResolver(toolbarResolver);

    const { rerender } = render(
      <AutoCrudTable
        id="com.wordrhyme.shop.products"
        schema={schema}
        resource={createResource({
          idKey: 'spuId',
          data: [{ id: '1', spuId: 'spu-1', region: 'west' }],
        })}
        toolbar={[{ type: 'export' }]}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row' }));

    await waitFor(() => {
      const lastCall = toolbarResolver.mock.calls[toolbarResolver.mock.calls.length - 1];
      expect(lastCall?.[2].selectedRowIds).toEqual(['spu-1']);
    });

    rerender(
      <AutoCrudTable
        id="com.wordrhyme.shop.products"
        schema={schema}
        resource={createResource({
          idKey: 'spuId',
          data: [{ id: '2', spuId: 'spu-2', region: 'east' }],
        })}
        toolbar={[{ type: 'export' }]}
      />,
    );

    await waitFor(() => {
      const lastCall = toolbarResolver.mock.calls[toolbarResolver.mock.calls.length - 1];
      expect(lastCall?.[2].selectedRowIds).toEqual(['spu-2']);
    });
  });

  it('keeps toolbar behavior unchanged when no hook is injected', () => {
    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.products"
        schema={schema}
        resource={createResource()}
        toolbar={[
          { type: 'custom', component: <button type="button">Owner custom</button> },
        ]}
      />,
    );

    expect(screen.getByText('Owner custom')).toBeTruthy();
    expect(screen.getByRole('button', { name: '新建' })).toBeTruthy();
  });

  it('keeps deprecated toolbarActions compatibility', () => {
    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.products"
        schema={schema}
        resource={createResource()}
        toolbarActions={[{ type: 'export' }]}
      />,
    );

    expect(screen.getByRole('button', { name: '导出' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '新建' })).toBeNull();
  });

  it('passes owner create onClick as openCreate before falling back to resource openCreate', () => {
    const ownerOpenCreate = vi.fn();
    const toolbarResolver = vi.fn<AutoCrudToolbarResolver>((_targetId, ownerActions) => [
      ...ownerActions,
    ]);
    setToolbarResolver(toolbarResolver);

    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.products"
        schema={schema}
        resource={createResource()}
        toolbar={[{ type: 'create', onClick: ownerOpenCreate }]}
      />,
    );

    expect(toolbarResolver.mock.calls[0]?.[2].openCreate).toBe(ownerOpenCreate);
  });

  it('falls back to resource openCreate when owner create has no onClick', () => {
    const resource = createResource();
    const toolbarResolver = vi.fn<AutoCrudToolbarResolver>((_targetId, ownerActions) => [
      ...ownerActions,
    ]);
    setToolbarResolver(toolbarResolver);

    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.products"
        schema={schema}
        resource={resource}
        toolbar={[{ type: 'create' }]}
      />,
    );

    expect(toolbarResolver.mock.calls[0]?.[2].openCreate).toBe(
      resource.handlers.openCreate,
    );
  });

  it('uses openCreate in a replacement create component', () => {
    const resource = createResource();

    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.products"
        schema={schema}
        resource={resource}
        toolbar={[
          {
            type: 'create',
            component: ({ openCreate }) => (
              <button type="button" onClick={() => openCreate?.()}>
                手动创建
              </button>
            ),
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '手动创建' }));

    expect(resource.handlers.openCreate).toHaveBeenCalledTimes(1);
  });

  it('passes default toolbar commands to custom components', async () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const originalAnchorClick = HTMLAnchorElement.prototype.click;
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:export');
    const revokeObjectURL = vi.fn<(url: string) => void>();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });
    HTMLAnchorElement.prototype.click = vi.fn();

    const refresh = vi.fn().mockResolvedValue(undefined);
    const importHandler = vi
      .fn()
      .mockResolvedValue({ success: 0, updated: 0, skipped: 0, failed: [] });
    const exportHandler = vi.fn().mockResolvedValue([{ id: '1', region: 'west' }]);
    const resource = createResource({ refresh, importHandler, exportHandler });

    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.products"
        schema={schema}
        resource={resource}
        toolbar={[
          {
            type: 'custom',
            component: (context) => (
              <>
                <button type="button" onClick={() => void context.refresh?.()}>
                  Run refresh
                </button>
                <button type="button" onClick={() => context.openImport?.()}>
                  Run import
                </button>
                <button type="button" onClick={() => void context.exportData?.()}>
                  Run export
                </button>
                <button type="button" onClick={() => context.openCreate?.()}>
                  Run create
                </button>
              </>
            ),
          },
        ]}
      />,
    );

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Run refresh' }));
      await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));

      fireEvent.click(screen.getByRole('button', { name: 'Run export' }));
      await waitFor(() => expect(exportHandler).toHaveBeenCalledTimes(1));
      expect(createObjectURL).toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Run create' }));
      expect(resource.handlers.openCreate).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: 'Run import' }));
      expect(await screen.findByText('导入数据')).toBeTruthy();
    } finally {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: originalCreateObjectURL,
      });
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: originalRevokeObjectURL,
      });
      HTMLAnchorElement.prototype.click = originalAnchorClick;
    }
  });

  it('uses owner toolbar onClick before default commands', async () => {
    const ownerRefresh = vi.fn();
    const ownerImport = vi.fn();
    const ownerExport = vi.fn();
    const ownerCreate = vi.fn();
    const resourceRefresh = vi.fn().mockResolvedValue(undefined);
    const importHandler = vi
      .fn()
      .mockResolvedValue({ success: 0, updated: 0, skipped: 0, failed: [] });
    const exportHandler = vi.fn().mockResolvedValue([{ id: '1', region: 'west' }]);
    const resource = createResource({
      refresh: resourceRefresh,
      importHandler,
      exportHandler,
    });

    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.products"
        schema={schema}
        resource={resource}
        toolbar={[
          { type: 'refresh', onClick: ownerRefresh },
          { type: 'import', onClick: ownerImport },
          { type: 'export', onClick: ownerExport },
          { type: 'create', onClick: ownerCreate },
          {
            type: 'custom',
            component: (context) => (
              <>
                <button type="button" onClick={() => void context.refresh?.()}>
                  Owner refresh command
                </button>
                <button type="button" onClick={() => context.openImport?.()}>
                  Owner import command
                </button>
                <button type="button" onClick={() => void context.exportData?.()}>
                  Owner export command
                </button>
                <button type="button" onClick={() => context.openCreate?.()}>
                  Owner create command
                </button>
              </>
            ),
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Owner refresh command' }));
    fireEvent.click(screen.getByRole('button', { name: 'Owner import command' }));
    fireEvent.click(screen.getByRole('button', { name: 'Owner export command' }));
    fireEvent.click(screen.getByRole('button', { name: 'Owner create command' }));

    await waitFor(() => {
      expect(ownerRefresh).toHaveBeenCalledTimes(1);
      expect(ownerImport).toHaveBeenCalledTimes(1);
      expect(ownerExport).toHaveBeenCalledTimes(1);
      expect(ownerCreate).toHaveBeenCalledTimes(1);
    });
    expect(resourceRefresh).not.toHaveBeenCalled();
    expect(importHandler).not.toHaveBeenCalled();
    expect(exportHandler).not.toHaveBeenCalled();
    expect(resource.handlers.openCreate).not.toHaveBeenCalled();
    expect(screen.queryByText('导入数据')).toBeNull();
  });

  it('omits denied toolbar commands and hides create replacement components', () => {
    let capturedContext: AutoCrudToolbarContext | undefined;
    const resource = createResource({
      importHandler: vi
        .fn()
        .mockResolvedValue({ success: 0, updated: 0, skipped: 0, failed: [] }),
      exportHandler: vi.fn().mockResolvedValue([{ id: '1', region: 'west' }]),
    });

    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.products"
        schema={schema}
        resource={resource}
        permissions={{ can: { create: false, import: false, export: false } }}
        toolbar={[
          {
            type: 'custom',
            component: (context) => {
              capturedContext = context;
              return <button type="button">Command probe</button>;
            },
          },
          {
            type: 'create',
            component: ({ openCreate }) => (
              <button type="button" onClick={() => openCreate?.()}>
                手动创建
              </button>
            ),
          },
          { type: 'import' },
          { type: 'export' },
        ]}
      />,
    );

    expect(screen.getByRole('button', { name: 'Command probe' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '手动创建' })).toBeNull();
    expect(capturedContext?.openCreate).toBeUndefined();
    expect(capturedContext?.openImport).toBeUndefined();
    expect(capturedContext?.exportData).toBeUndefined();
  });
});

describe('auto-crud table unified actions', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    window.history.replaceState(null, '', '/stores');
  });

  afterEach(() => {
    setToolbarResolver(null);
    crudActions.clear();
    cleanup();
    vi.clearAllMocks();
  });

  it('merges toolbar owner actions with registered plugin actions', () => {
    crudActions.register({
      targetId: 'com.wordrhyme.shop.stores',
      zone: 'toolbar',
      ownerId: 'com.wordrhyme.test-lab',
      actions: [
        { type: 'export', hidden: true },
        { type: 'create', label: 'Plugin Create' },
        {
          type: 'custom',
          component: (context: AutoCrudToolbarContext) => (
            <button type="button">Rows {context.rowIds.length}</button>
          ),
        },
      ],
    });

    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.stores"
        schema={schema}
        resource={createResource()}
        actions={{
          toolbar: [{ type: 'export' }, { type: 'create' }],
        }}
      />,
    );

    expect(screen.queryByRole('button', { name: '导出' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Plugin Create' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rows 1' })).toBeTruthy();
  });

  it('does not restore default toolbar actions after registered actions hide them all', () => {
    crudActions.register({
      targetId: 'com.wordrhyme.shop.stores',
      zone: 'toolbar',
      ownerId: 'com.wordrhyme.test-lab',
      actions: [
        { type: 'refresh', hidden: true },
        { type: 'import', hidden: true },
        { type: 'export', hidden: true },
        { type: 'create', hidden: true },
      ],
    });

    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.stores"
        schema={schema}
        resource={createResource()}
      />,
    );

    expect(screen.queryByRole('button', { name: '刷新' })).toBeNull();
    expect(screen.queryByRole('button', { name: '导出' })).toBeNull();
    expect(screen.queryByRole('button', { name: '新建' })).toBeNull();
  });

  it('does not restore default row actions after registered actions hide them all', async () => {
    crudActions.register({
      targetId: 'com.wordrhyme.shop.stores',
      zone: 'row',
      ownerId: 'com.wordrhyme.test-lab',
      actions: [
        { type: 'view', hidden: true },
        { type: 'edit', hidden: true },
        { type: 'copy', hidden: true },
        { type: 'delete', hidden: true },
      ],
    });

    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.stores"
        schema={schema}
        resource={createResource()}
      />,
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open menu' }));

    await waitFor(() => {
      expect(screen.queryByRole('menuitem', { name: '查看' })).toBeNull();
      expect(screen.queryByRole('menuitem', { name: '删除' })).toBeNull();
    });
  });

  it('keeps only custom row actions after plugins hide all builtins', async () => {
    crudActions.register<RowActionItem<Row>>({
      targetId: 'stores',
      zone: 'row',
      ownerId: 'sync',
      actions: [{ type: 'custom', label: 'Sync', onClick: vi.fn() }, { type: 'delete' }],
    });
    crudActions.register({
      targetId: 'stores',
      zone: 'row',
      ownerId: 'visibility',
      actions: ['view', 'edit', 'copy', 'delete'].map((type) => ({ type, hidden: true })),
    });
    render(<AutoCrudTable id="stores" schema={schema} resource={createResource()} />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open menu' }));
    const items = await screen.findAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual(['Sync']);
  });

  it('does not restore default batch actions after registered actions hide them all', () => {
    crudActions.register({
      targetId: 'com.wordrhyme.shop.stores',
      zone: 'batch',
      ownerId: 'com.wordrhyme.test-lab',
      actions: [
        { type: 'batchUpdate', hidden: true },
        { type: 'delete', hidden: true },
      ],
    });

    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.stores"
        schema={schema}
        resource={createResource()}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row' }));

    expect(screen.queryByText('Delete')).toBeNull();
  });

  it.each([
    ['owner', true],
    ['owner', false],
    ['plugin', true],
    ['plugin', false],
  ] as const)(
    'uses array order for %s actions with delete permission %s',
    async (source, canDelete) => {
      const selected = vi.fn();
      const actions: RowActionItem<Row>[] = [
        { type: 'view', label: 'View' },
        { type: 'edit', label: 'Edit' },
        { type: 'copy', label: 'Copy' },
        { type: 'custom', label: 'Sync', onClick: selected },
        { type: 'delete', label: 'Delete' },
      ];
      if (source === 'plugin') {
        crudActions.register({
          targetId: 'stores',
          zone: 'row',
          ownerId: 'sync',
          actions,
        });
      }
      render(
        <AutoCrudTable
          id="stores"
          schema={schema}
          resource={createResource()}
          permissions={{ can: { delete: canDelete } }}
          actions={source === 'owner' ? { row: actions } : undefined}
        />,
      );
      fireEvent.pointerDown(screen.getByRole('button', { name: 'Open menu' }));
      const items = await screen.findAllByRole('menuitem');
      expect(items.map((item) => item.textContent)).toEqual(
        canDelete
          ? ['View', 'Edit', 'Copy', 'Sync', 'Delete']
          : ['View', 'Edit', 'Copy', 'Sync'],
      );
      fireEvent.click(screen.getByRole('menuitem', { name: 'Sync' }));
      expect(selected).toHaveBeenCalledWith({ id: '1', region: 'west' });
    },
  );

  it('supplies the owning menu primitive to external row components', async () => {
    const selected = vi.fn();
    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource()}
        actions={{
          row: [
            {
              type: 'custom',
              component: ({ MenuItem, row }) => {
                expect(MenuItem).toBe(DropdownMenuItem);
                return (
                  <MenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      selected(row);
                    }}
                  >
                    External sync
                  </MenuItem>
                );
              },
            },
          ],
        }}
      />,
    );
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'External sync' }));
    expect(selected).toHaveBeenCalledWith({ id: '1', region: 'west' });
    expect(screen.getByRole('menuitem', { name: 'External sync' })).toBeTruthy();
  });

  it('renders row custom components with row context', async () => {
    const resource = createResource();

    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.stores"
        schema={schema}
        resource={resource}
        actions={{
          row: [
            {
              type: 'custom',
              position: 'start',
              component: (context) => (
                <button type="button" onClick={() => context.openView(context.row)}>
                  Open {context.rowId}
                </button>
              ),
            },
          ],
        }}
      />,
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Open 1' }));

    expect(resource.handlers.openView).toHaveBeenCalledWith({
      id: '1',
      region: 'west',
    });
  });

  it('renders batch custom components from actions.batch', () => {
    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.stores"
        schema={schema}
        resource={createResource()}
        actions={{
          batch: [
            {
              type: 'custom',
              position: 'start',
              component: (context) => (
                <button type="button">Batch {context.rows.length}</button>
              ),
            },
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row' }));

    expect(screen.getByRole('button', { name: 'Batch 1' })).toBeTruthy();
  });

  it('keeps legacy row actions and table.batchActions compatibility', async () => {
    const legacyRowClick = vi.fn();

    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.stores"
        schema={schema}
        resource={createResource()}
        actions={[
          {
            type: 'custom',
            label: 'Legacy Row',
            onClick: legacyRowClick,
          },
        ]}
        table={{
          batchActions: [
            {
              type: 'custom',
              component: (context) => (
                <button type="button">Legacy Batch {context.rows.length}</button>
              ),
            },
          ],
        }}
      />,
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Legacy Row' }));
    expect(legacyRowClick).toHaveBeenCalledWith({ id: '1', region: 'west' });

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row' }));
    expect(screen.getByRole('button', { name: 'Legacy Batch 1' })).toBeTruthy();
  });
});

describe('default details share list presentation labels', () => {
  afterEach(() => {
    cleanup();
    dataSources.unregister('test.dynamic-regions');
    dataSources.unregister('test.table-regions');
  });
  it.each(['static', 'dynamic'] as const)(
    'uses %s table labels in details by default',
    async (mode) => {
      const loader = vi.fn(() => [{ label: 'Shared West Label', value: 'west' }]);
      dataSources.register('test.dynamic-regions', loader);
      dataSources.register('test.table-regions', () => [
        { label: 'Table West Label', value: 'west' },
      ]);
      render(
        <AutoCrudTable
          schema={schema}
          fields={displayFields}
          resource={createResource({
            fields: {
              region: {
                table:
                  mode === 'static'
                    ? { options: [{ label: 'Table West Label', value: 'west' }] }
                    : { dataSource: 'test.table-regions' },
              },
            },
            modal: { viewOpen: true, selected: { id: '1', region: 'west' } },
          })}
        />,
      );
      await waitFor(() =>
        expect(screen.getAllByText('Table West Label')).toHaveLength(2),
      );
      expect(loader).not.toHaveBeenCalled();
      expect(screen.queryByText('Shared West Label')).toBeNull();
    },
  );
});

describe('AutoCrudTable expandedRow', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/stores');
  });
  afterEach(cleanup);

  it('starts expanded and keeps a collapsed order collapsed after data refresh', () => {
    const rows: Row[] = [
      { id: 'order-001', region: 'west' },
      { id: 'order-002', region: 'east' },
    ];
    const table = {
      getRowId: (row: Row) => row.id,
      expandedRow: (row: Row) => (
        <div data-testid={`details-${row.id}`}>{row.region}</div>
      ),
      defaultExpanded: true,
    };
    const view = render(
      <AutoCrudTable
        schema={schema}
        resource={createResource({ data: rows })}
        table={table}
      />,
    );
    expect(screen.getByTestId('details-order-001')).toBeTruthy();
    expect(screen.getByTestId('details-order-002')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Collapse row' })[0]!);
    view.rerender(
      <AutoCrudTable
        schema={schema}
        resource={createResource({ data: [...rows].reverse() })}
        table={table}
      />,
    );
    expect(screen.queryByTestId('details-order-001')).toBeNull();
    expect(screen.getByTestId('details-order-002')).toBeTruthy();
    expect(screen.getByText('0 of 2 row(s) selected.')).toBeTruthy();
  });

  it('mounts details on expansion without adding selectable records', () => {
    const rows: Row[] = [
      { id: 'order-001', region: 'west' },
      { id: 'order-002', region: 'east' },
    ];
    const expandedRow = vi.fn((row: Row) => (
      <div data-testid={`details-${row.id}`}>{row.region}</div>
    ));
    render(
      <AutoCrudTable
        schema={schema}
        resource={createResource({ data: rows })}
        table={{
          hidden: ['spuId', 'region'],
          getRowId: (row) => row.id,
          expandedRow,
        }}
      />,
    );

    expect(expandedRow).not.toHaveBeenCalled();
    const buttons = screen.getAllByRole('button', { name: 'Expand row' });
    const checkboxCount = screen.getAllByRole('checkbox').length;
    fireEvent.click(buttons[0]!);
    expect(expandedRow).toHaveBeenCalledWith(
      rows[0],
      expect.objectContaining({ id: rows[0]!.id, original: rows[0] }),
    );
    expect(buttons[0]!.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('details-order-001').closest('td')?.colSpan).toBe(
      screen.getAllByRole('columnheader').length,
    );

    fireEvent.click(buttons[1]!);
    expect(screen.getByTestId('details-order-001')).toBeTruthy();
    expect(screen.getByTestId('details-order-002')).toBeTruthy();
    expect(screen.getAllByRole('checkbox')).toHaveLength(checkboxCount);
    expect(screen.getByText('0 of 2 row(s) selected.')).toBeTruthy();

    fireEvent.click(buttons[0]!);
    expect(screen.queryByTestId('details-order-001')).toBeNull();
    expect(screen.getByTestId('details-order-002')).toBeTruthy();
    expect(buttons[0]!.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('optional export delivery', () => {
  let context: AutoCrudToolbarContext;

  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    setToolbarResolver((_id, actions, value) => {
      context = value;
      return [...actions];
    });
  });

  afterEach(() => {
    cleanup();
    setToolbarResolver(null);
    vi.restoreAllMocks();
  });

  it.each([false, true])(
    'excludes generated expansion controls while preserving business columns (collision: %s)',
    async (collision) => {
      const onExport = vi.fn().mockResolvedValue(undefined);
      render(
        <AutoCrudTable
          id="export-test"
          schema={schema}
          resource={{
            ...createResource(),
            schema: collision ? schema.extend({ expand: z.string().optional() }) : schema,
          }}
          onExport={onExport}
          table={{ getRowId: (row) => row.id, expandedRow: () => <span>Details</span> }}
        />,
      );
      fireEvent.click(screen.getByRole('checkbox', { name: 'Select row' }));
      await act(async () => {
        await context.exportData!();
      });

      const columns = onExport.mock.calls[0]![0].columns;
      expect(columns.map((column: { id: string }) => column.id)).toEqual([
        'id',
        'spuId',
        'region',
        'countries',
        'tags',
        ...(collision ? ['expand'] : []),
      ]);
    },
  );

  it('reports default CSV query failures without downloading', async () => {
    const notify = vi.spyOn(toast, 'error').mockReturnValue('export-error');
    const download = vi.spyOn(exportUtils, 'exportAllToCSV').mockImplementation(() => {});
    render(
      <AutoCrudTable
        schema={schema}
        locale="en-US"
        resource={createResource({
          exportHandler: vi.fn().mockRejectedValue(new Error('Export request failed')),
        })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Export request failed'));
    expect(download).not.toHaveBeenCalled();
    expect(context.isExporting).toBe(false);
  });

  it('snapshots visible localized columns before fetching, preserves raw rows, and deduplicates', async () => {
    let finish!: (rows: Row[]) => void;
    const exportHandler = vi.fn(
      () =>
        new Promise<Row[]>((resolve) => {
          finish = resolve;
        }),
    );
    const onExport = vi.fn().mockResolvedValue(undefined);
    const resource = createResource({ exportHandler });
    const props = {
      id: 'export-test',
      schema,
      resource,
      onExport,
      permissions: { deny: ['spuId'] },
      fields: {
        region: {
          label: '地区',
          table: { index: 0, header: () => 'Custom region header' },
          format: () => 'formatted',
        },
        id: { table: { index: 1, label: '编号' } },
        countries: { table: false as const },
        tags: { table: { classNames: { th: 'hidden', td: 'hidden' } } },
      },
    };
    const { rerender } = render(<AutoCrudTable {...props} />);
    let pending!: Promise<void>;
    act(() => {
      pending = context.exportData!();
    });
    await act(async () => {
      await context.exportData!();
    });
    expect(exportHandler).toHaveBeenCalledTimes(1);
    expect(context.isExporting).toBe(true);
    rerender(<AutoCrudTable {...props} fields={{ region: { table: false } }} />);
    const rows = [{ id: '2', region: 'east', spuId: 'denied' }];
    await act(async () => {
      finish(rows);
      await pending;
    });
    expect(onExport).toHaveBeenCalledWith({
      mode: 'filtered',
      rows: [{ id: '2', region: 'east' }],
      columns: [
        { id: 'region', label: '地区' },
        { id: 'id', label: '编号' },
      ],
    });
    expect(context.isExporting).toBe(false);
    expect(rows[0]?.spuId).toBe('denied');
  });

  it('routes toolbar and built-in batch export to selected raw rows', async () => {
    const exportHandler = vi
      .fn()
      .mockRejectedValue(new Error('Must not fetch selected rows'));
    const rows = [{ id: '1', region: 'west', spuId: 'denied' }];
    const onExport = vi.fn().mockResolvedValue(undefined);
    render(
      <AutoCrudTable
        id="export-test"
        schema={schema}
        resource={createResource({ exportHandler, data: rows })}
        permissions={{ deny: ['spuId'] }}
        onExport={onExport}
        actions={{ batch: [{ type: 'export', label: 'Batch export' }] }}
      />,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row' }));
    await waitFor(() => expect(context.selectedCount).toBe(1));
    await act(async () => {
      await context.exportData!();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Batch export' }));
    await waitFor(() => expect(onExport).toHaveBeenCalledTimes(2));
    for (const [value] of onExport.mock.calls) {
      expect(value.mode).toBe('selected');
      expect(value.rows).toEqual([{ id: '1', region: 'west' }]);
      expect(value.columns.some((column: { id: string }) => column.id === 'spuId')).toBe(
        false,
      );
    }
    expect(exportHandler).not.toHaveBeenCalled();
    expect(rows[0]?.spuId).toBe('denied');
  });

  it.each(['fetch', 'callback', 'selected callback'])(
    'resets busy and propagates %s errors without a download',
    async (failure) => {
      const error = new Error('Export failed');
      const exportHandler = vi.fn().mockResolvedValue([{ id: '1' }]);
      const onExport = vi.fn().mockResolvedValue(undefined);
      if (failure === 'fetch') exportHandler.mockRejectedValueOnce(error);
      else onExport.mockRejectedValueOnce(error);
      const download = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => {});
      render(
        <AutoCrudTable
          id="export-test"
          schema={schema}
          resource={createResource({ exportHandler })}
          onExport={onExport}
        />,
      );
      if (failure === 'selected callback') {
        fireEvent.click(screen.getByRole('checkbox', { name: 'Select row' }));
        await waitFor(() => expect(context.selectedCount).toBe(1));
      }
      await act(async () => {
        await expect(context.exportData!()).rejects.toBe(error);
      });
      expect(context.isExporting).toBe(false);
      expect(download).not.toHaveBeenCalled();
      await act(async () => {
        await context.exportData!();
      });
      expect(context.isExporting).toBe(false);
      expect(onExport).toHaveBeenCalledTimes(failure === 'fetch' ? 1 : 2);
      if (failure === 'selected callback') expect(exportHandler).not.toHaveBeenCalled();
      expect(download).not.toHaveBeenCalled();
    },
  );

  it('keeps the legacy raw CSV payload and options when the callback is absent', async () => {
    const download = vi.spyOn(exportUtils, 'exportAllToCSV').mockImplementation(() => {});
    const rows = [{ id: '1', region: 'west', spuId: 'private' }];
    render(
      <AutoCrudTable
        id="export-test"
        title="Legacy"
        schema={schema}
        resource={createResource({
          data: rows,
          exportHandler: vi.fn().mockResolvedValue(rows),
        })}
        permissions={{ deny: ['spuId'] }}
        fields={{ region: { table: false } }}
      />,
    );
    await act(async () => {
      await context.exportData!();
    });
    expect(download).toHaveBeenLastCalledWith(rows, {
      filename: 'Legacy',
      excludeColumns: ['spuId'],
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row' }));
    await act(async () => {
      await context.exportData!();
    });
    expect(download).toHaveBeenCalledTimes(2);
    expect(download).toHaveBeenLastCalledWith(rows, {
      filename: 'Legacy',
      excludeColumns: ['spuId'],
    });
  });

  it('handles rejected button exports without downloading and keeps batch/toolbar mutually exclusive', async () => {
    let reject!: (error: Error) => void;
    const onExport = vi.fn(
      () =>
        new Promise<void>((_resolve, fail) => {
          reject = fail;
        }),
    );
    const notify = vi.spyOn(toast, 'error').mockReturnValue('export-error');
    const download = vi.spyOn(exportUtils, 'exportAllToCSV').mockImplementation(() => {});
    render(
      <AutoCrudTable
        id="export-test"
        schema={schema}
        resource={createResource()}
        onExport={onExport}
        actions={{ batch: [{ type: 'export', label: 'Batch export' }] }}
      />,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row' }));
    await waitFor(() => expect(context.selectedCount).toBe(1));
    fireEvent.click(screen.getByRole('button', { name: 'Batch export' }));
    await act(async () => {
      await context.exportData!();
    });
    expect(onExport).toHaveBeenCalledTimes(1);
    expect(context.isExporting).toBe(true);
    await act(async () => {
      reject(new Error('Delivery failed'));
    });
    expect(notify).toHaveBeenCalledWith('Delivery failed');
    expect(context.isExporting).toBe(false);
    expect(download).not.toHaveBeenCalled();
  });

  it('preserves owner toolbar and batch export overrides when opted in', async () => {
    const ownerToolbar = vi.fn();
    const ownerBatch = vi.fn();
    const onExport = vi.fn().mockResolvedValue(undefined);
    render(
      <AutoCrudTable
        id="export-test"
        schema={schema}
        resource={createResource()}
        onExport={onExport}
        actions={{
          toolbar: [{ type: 'export', onClick: ownerToolbar }],
          batch: [{ type: 'export', label: 'Owner batch', onClick: ownerBatch }],
        }}
      />,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row' }));
    await act(async () => {
      await context.exportData!();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Owner batch' }));
    expect(ownerToolbar).toHaveBeenCalledTimes(1);
    expect(ownerBatch).toHaveBeenCalledTimes(1);
    expect(onExport).not.toHaveBeenCalled();
  });
});

describe('AutoCrudTable Formily detail', () => {
  afterEach(cleanup);

  it.each(['create', 'edit', 'view'] as const)(
    'passes label layout configuration to the %s modal',
    (mode) => {
      const resource = createAuditResource();
      resource.modal = {
        ...resource.modal,
        createOpen: mode === 'create',
        editOpen: mode === 'edit',
        viewOpen: mode === 'view',
        selected: mode === 'create' ? null : resource.tableData.data[0]!,
      };
      render(
        <AutoCrudTable
          schema={auditSchema}
          resource={resource}
          form={{
            labelAlign: mode === 'edit' ? 'right' : 'left',
            labelWidth: mode === 'edit' ? '8rem' : 100,
          }}
        />,
      );

      const label = screen
        .getByRole('dialog')
        .querySelector<HTMLElement>('[data-slot="form-item-label"]');
      expect(label?.style.width).toBe(mode === 'edit' ? '8rem' : '100px');
      expect(label?.closest('[data-slot="form-item-content"]')).toBeTruthy();
      expect(label?.classList.contains('text-right')).toBe(mode === 'edit');
    },
  );

  it.each(['dialog', 'sheet'] as const)(
    'uses readPretty in %s and excludes denied fields',
    (variant) => {
      const resource = createAuditResource();
      resource.modal = {
        ...resource.modal,
        variant,
        viewOpen: true,
        selected: resource.tableData.data[0]!,
      };
      render(
        <AutoCrudTable
          schema={auditSchema}
          resource={resource}
          permissions={{ deny: ['name'] }}
          fields={{
            id: { form: false },
            name: { form: { 'x-hidden': false } },
            createdBy: { hidden: true, form: { 'x-hidden': false } },
          }}
          form={{ columns: 2 }}
        />,
      );
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText('1')).toBeTruthy();
      expect(within(dialog).getByText(/January 1, 2026/)).toBeTruthy();
      expect(within(dialog).queryByText('North Store')).toBeNull();
      expect(within(dialog).queryByText('user-1')).toBeNull();
      expect(dialog.querySelector('input, textarea, select')).toBeNull();
      expect(within(dialog).queryByRole('button', { name: '保存' })).toBeNull();
      expect(resource.handlers.submitCreate).not.toHaveBeenCalled();
      expect(resource.handlers.submitUpdate).not.toHaveBeenCalled();
    },
  );
});
