import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { UseAutoCrudResourceReturn } from '@/hooks/use-auto-crud-resource';
import { dataSources } from '@/lib/registries';
import type { AutoCrudToolbarResolver, Fields } from './auto-crud-table';
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
    modal?: Partial<UseAutoCrudResourceReturn<typeof schema, Row>['modal']>;
  } = {},
): UseAutoCrudResourceReturn<typeof schema, Row> {
  const resource: UseAutoCrudResourceReturn<typeof schema, Row> = {
    idKey: options.idKey ?? 'id',
    tableData: {
      data: options.data ?? [{ id: '1', region: 'west' }],
      pageCount: 1,
      isLoading: false,
      isFetching: false,
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
      import: null,
      export: null,
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

    const loader = vi.fn(({ field, values }) => {
      expect(field).toBe('region');
      expect(values).toEqual({});

      return [
        { label: 'East Dynamic', value: 'east' },
        { label: 'West Dynamic', value: 'west' },
      ];
    });

    dataSources.register('test.dynamic-regions', loader);

    await waitFor(() => expect(queryDynamicFilterTrigger()).toBeTruthy());
    expect(await screen.findByText('West Dynamic')).toBeTruthy();
    await waitFor(() => expect(loader).toHaveBeenCalled());
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

describe('auto-crud table toolbar resolver', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    window.history.replaceState(null, '', '/stores');
  });

  afterEach(() => {
    setToolbarResolver(null);
    cleanup();
    vi.clearAllMocks();
  });

  it('passes current row ids from resource idKey to the injected toolbar resolver', () => {
    const toolbarResolver = vi.fn<AutoCrudToolbarResolver>((_targetId, ownerActions) => [
      ...ownerActions,
      { type: 'custom' as const, component: <button type="button">Injected</button> },
    ]);
    setToolbarResolver(toolbarResolver);

    render(
      <AutoCrudTable
        id="com.wordrhyme.shop.products"
        schema={schema}
        resource={createResource({
          idKey: 'spuId',
          data: [
            { id: '1', spuId: 'spu-1', region: 'west' },
            { id: '2', region: 'east' },
          ],
        })}
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
});
