import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { UseAutoCrudResourceReturn } from '@/hooks/use-auto-crud-resource';
import { dataSources } from '@/lib/registries';
import { AutoCrudTable, type Fields } from './auto-crud-table';

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

function createResource(): UseAutoCrudResourceReturn<typeof schema, Row> {
  return {
    tableData: {
      data: [{ id: '1', region: 'west' }],
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
});
