import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { UseAutoCrudResourceReturn } from '@/hooks/use-auto-crud-resource';
import { crudActions } from '@/lib/crud-actions';
import { dataSources } from '@/lib/registries';
import type {
  AutoCrudToolbarContext,
  AutoCrudToolbarResolver,
  Fields,
} from './auto-crud-table';
import { AutoCrudTable, setToolbarResolver } from './auto-crud-table';

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
  } = {},
): UseAutoCrudResourceReturn<typeof schema, Row> {
  const resource: UseAutoCrudResourceReturn<typeof schema, Row> = {
    idKey: options.idKey ?? 'id',
    tableData: {
      data: options.data ?? [{ id: '1', region: 'west' }],
      pageCount: 1,
      isLoading: false,
      isFetching: options.isFetching ?? false,
    },
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
    const sortButton = screen.getByRole('button', { name: 'Sort rows' });
    const viewButton = screen.getByRole('combobox', { name: 'Toggle columns' });

    expect(
      modeButton.compareDocumentPosition(sortButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      sortButton.compareDocumentPosition(viewButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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

    const sortButton = screen.getByRole('button', { name: 'Sort rows' });
    expect(sortButton.textContent).toContain('1');

    fireEvent.click(sortButton);
    const sortList = screen.getByRole('list');
    expect(sortList.textContent).toContain('Created At');
    expect(sortList.textContent).toContain('Desc');
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

    const sortButton = screen.getByRole('button', { name: 'Sort rows' });
    fireEvent.click(sortButton);
    const sortList = screen.getByRole('list');
    expect(sortList.textContent).toContain('Name');
    expect(sortList.textContent).toContain('Asc');
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
