import type { Meta, StoryObj } from '@storybook/react';
import type { AutoCrudDataSourceContext, UseAutoCrudResourceReturn } from '../src';
import { expect, fn, userEvent, waitFor, within } from '@storybook/test';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { z } from 'zod';
import { AutoCrudTable, dataSources } from '../src';

const storeTableSchema = z.object({
  storeId: z.string(),
  name: z.string(),
  region: z.string(),
  status: z.enum(['active', 'paused']),
});

type StoreRow = z.output<typeof storeTableSchema>;
type StoreResource = UseAutoCrudResourceReturn<typeof storeTableSchema, StoreRow>;
type StoreModalState = StoreResource['modal'];

const tableRows: StoreRow[] = [
  { storeId: '1', name: 'North Store', region: 'north', status: 'active' },
  { storeId: '2', name: 'South Store', region: 'south', status: 'paused' },
];

const STORE_REGION_SOURCE = 'storybook.store-regions';

const regionLabels: Record<string, string> = {
  north: 'North Region',
  south: 'South Region',
};

const initialModalState: StoreModalState = {
  createOpen: false,
  editOpen: false,
  deleteOpen: false,
  viewOpen: false,
  selected: null,
  copySource: null,
  variant: 'dialog',
};

const URL_CHANGE_EVENT = 'urlchange';

function getSearchSnapshot() {
  return typeof window === 'undefined' ? '' : window.location.search;
}

function subscribeToUrlChanges(onStoreChange: () => void) {
  window.addEventListener('popstate', onStoreChange);
  window.addEventListener(URL_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('popstate', onStoreChange);
    window.removeEventListener(URL_CHANGE_EVENT, onStoreChange);
  };
}

function useLocationSearch() {
  return useSyncExternalStore(subscribeToUrlChanges, getSearchSnapshot, () => '');
}

function splitFilterKey(key: string) {
  const suffixIndex = key.indexOf('__');
  return suffixIndex >= 0 ? key.slice(0, suffixIndex) : key;
}

function getDefaultOperator(field: keyof StoreRow) {
  return field === 'status' ? 'eq' : 'iLike';
}

function isStoreField(field: string): field is keyof StoreRow {
  return (
    field === 'storeId' || field === 'name' || field === 'region' || field === 'status'
  );
}

function matchesFilter(
  row: StoreRow,
  field: keyof StoreRow,
  value: string,
  operator: string,
) {
  const actual = String(row[field] ?? '');
  const normalizedActual = actual.toLowerCase();
  const normalizedValue = value.toLowerCase();
  const values = value.split(',').filter(Boolean);

  switch (operator) {
    case 'eq':
      return actual === value || values.includes(actual);
    case 'ne':
      return actual !== value && !values.includes(actual);
    case 'inArray':
      return values.includes(actual);
    case 'notInArray':
      return !values.includes(actual);
    case 'notILike':
      return !normalizedActual.includes(normalizedValue);
    case 'isEmpty':
      return actual.length === 0;
    case 'isNotEmpty':
      return actual.length > 0;
    case 'iLike':
    default:
      return normalizedActual.includes(normalizedValue);
  }
}

function filterRows(rows: StoreRow[], search: string) {
  const params = new URLSearchParams(search);
  const globalSearch = params.get('search')?.trim().toLowerCase() ?? '';
  const joinOperator = params.get('joinOperator') === 'or' ? 'or' : 'and';
  const filters: Array<{
    field: keyof StoreRow;
    value: string;
    operator: string;
  }> = [];

  for (const [key, value] of params.entries()) {
    const field = splitFilterKey(key);
    if (!key.endsWith('__op') && isStoreField(field)) {
      filters.push({
        field,
        value,
        operator: params.get(`${key}__op`) ?? getDefaultOperator(field),
      });
    }
  }

  return rows.filter((row) => {
    const matchesGlobalSearch =
      globalSearch.length === 0 || row.name.toLowerCase().includes(globalSearch);
    const matchesColumnFilters =
      filters.length === 0 ||
      (joinOperator === 'or'
        ? filters.some((filter) =>
            matchesFilter(row, filter.field, filter.value, filter.operator),
          )
        : filters.every((filter) =>
            matchesFilter(row, filter.field, filter.value, filter.operator),
          ));

    return matchesGlobalSearch && matchesColumnFilters;
  });
}

function closeModalState(state: StoreModalState): StoreModalState {
  return {
    ...state,
    createOpen: false,
    editOpen: false,
    deleteOpen: false,
    viewOpen: false,
    selected: null,
    copySource: null,
  };
}

function getNextStoreId(rows: StoreRow[]) {
  const maxId = rows.reduce((max, row) => {
    const numericId = Number.parseInt(row.storeId, 10);
    return Number.isFinite(numericId) ? Math.max(max, numericId) : max;
  }, 0);

  return String(maxId + 1);
}

interface AutoCrudTableStoryProps {
  onCreate: () => void;
  onResolveLoad: (context: AutoCrudDataSourceContext) => void;
}

function AutoCrudTableStory({ onCreate, onResolveLoad }: AutoCrudTableStoryProps) {
  const search = useLocationSearch();
  const [allRows, setAllRows] = useState(tableRows);
  const [modal, setModal] = useState<StoreModalState>(initialModalState);
  const rows = useMemo(() => filterRows(allRows, search), [allRows, search]);

  useEffect(() => {
    dataSources.unregister(STORE_REGION_SOURCE);
    dataSources.register(STORE_REGION_SOURCE, {
      resolveFields: ['status'],
      load: (context) => {
        onResolveLoad(context);

        if (context.type !== 'resolve' || !Array.isArray(context.values)) {
          return [];
        }

        return context.values.map((record) => {
          const value = String(record.region);
          return {
            value,
            label: regionLabels[value] ?? value,
          };
        });
      },
    });

    return () => dataSources.unregister(STORE_REGION_SOURCE);
  }, [onResolveLoad]);

  const closeModals = useCallback(() => {
    setModal((current) => closeModalState(current));
  }, []);

  const openCreate = useCallback(() => {
    onCreate();
    setModal((current) => ({
      ...closeModalState(current),
      createOpen: true,
    }));
  }, [onCreate]);

  const openEdit = useCallback((row: StoreRow) => {
    setModal((current) => ({
      ...closeModalState(current),
      editOpen: true,
      selected: row,
    }));
  }, []);

  const openDelete = useCallback((row: StoreRow) => {
    setModal((current) => ({
      ...closeModalState(current),
      deleteOpen: true,
      selected: row,
    }));
  }, []);

  const openView = useCallback((row: StoreRow) => {
    setModal((current) => ({
      ...closeModalState(current),
      viewOpen: true,
      selected: row,
    }));
  }, []);

  const copyRow = useCallback((row: StoreRow) => {
    setModal((current) => ({
      ...closeModalState(current),
      createOpen: true,
      copySource: row,
    }));
  }, []);

  const submitCreate = useCallback(
    (values: StoreRow) => {
      setAllRows((current) => {
        const requestedId = values.storeId.trim();
        const storeId =
          requestedId.length > 0 && !current.some((row) => row.storeId === requestedId)
            ? requestedId
            : getNextStoreId(current);

        return [...current, { ...values, storeId }];
      });
      closeModals();
    },
    [closeModals],
  );

  const submitUpdate = useCallback(
    (values: StoreRow) => {
      const selectedId = modal.selected?.storeId;
      if (selectedId === undefined) {
        closeModals();
        return;
      }

      setAllRows((current) =>
        current.map((row) =>
          row.storeId === selectedId
            ? { ...row, ...values, storeId: values.storeId.trim() || row.storeId }
            : row,
        ),
      );
      closeModals();
    },
    [closeModals, modal.selected?.storeId],
  );

  const confirmDelete = useCallback(() => {
    const selectedId = modal.selected?.storeId;
    if (selectedId !== undefined) {
      setAllRows((current) => current.filter((row) => row.storeId !== selectedId));
    }
    closeModals();
  }, [closeModals, modal.selected?.storeId]);

  const deleteMany = useCallback((selectedRows: StoreRow[]) => {
    const selectedIds = new Set(selectedRows.map((row) => row.storeId));
    setAllRows((current) => current.filter((row) => !selectedIds.has(row.storeId)));
  }, []);

  const updateMany = useCallback(
    (selectedRows: StoreRow[], data: Record<string, unknown>) => {
      const selectedIds = new Set(selectedRows.map((row) => row.storeId));
      setAllRows((current) =>
        current.map((row) =>
          selectedIds.has(row.storeId) ? { ...row, ...(data as Partial<StoreRow>) } : row,
        ),
      );
    },
    [],
  );

  const setVariant = useCallback((variant: StoreModalState['variant']) => {
    setModal((current) => ({ ...current, variant }));
  }, []);

  const resource = useMemo<StoreResource>(
    () => ({
      idKey: 'storeId',
      tableData: {
        data: rows,
        pageCount: 1,
        isLoading: false,
        isFetching: false,
      },
      modal,
      mutations: {
        isCreating: false,
        isUpdating: false,
        isDeleting: false,
        isImporting: false,
      },
      handlers: {
        openCreate,
        openEdit,
        openDelete,
        openView,
        copyRow,
        closeModals,
        submitCreate,
        submitUpdate,
        confirmDelete,
        deleteMany,
        updateMany,
        setVariant,
        refresh: async () => undefined,
        import: null,
        export: null,
      },
    }),
    [
      closeModals,
      confirmDelete,
      copyRow,
      deleteMany,
      modal,
      openCreate,
      openDelete,
      openEdit,
      openView,
      rows,
      setVariant,
      submitCreate,
      submitUpdate,
      updateMany,
    ],
  );

  return (
    <AutoCrudTable
      title="Stores"
      description="Schema-first CRUD table generated from a Zod schema."
      schema={storeTableSchema}
      resource={resource}
      fields={{
        storeId: {
          label: 'Id',
        },
        name: {
          label: 'Name',
          search: true,
        },
        region: {
          label: 'Region',
          dataSource: STORE_REGION_SOURCE,
          filter: false,
          form: false,
        },
        status: {
          label: 'Status',
          enum: [
            { label: 'Active', value: 'active' },
            { label: 'Paused', value: 'paused' },
          ],
          filter: {
            variant: 'select',
          },
        },
      }}
      table={{
        search: {
          placeholder: 'Search stores...',
        },
        filterModes: ['simple'],
      }}
      toolbar={[
        {
          type: 'custom',
          position: 'start',
          component: ({ openCreate }) => (
            <button type="button" onClick={() => openCreate?.()}>
              Custom new
            </button>
          ),
        },
      ]}
      locale="en-US"
    />
  );
}

const meta = {
  title: 'auto-crud/AutoCrudTable',
  component: AutoCrudTableStory,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-background p-6">
        <Story />
      </div>
    ),
  ],
  args: {
    onCreate: fn(),
    onResolveLoad: fn(),
  },
} satisfies Meta<typeof AutoCrudTableStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);

    await step('renders table shell', async () => {
      await expect(canvas.getByText('Stores')).toBeInTheDocument();
      await expect(
        canvas.getByRole('columnheader', { name: /Name/u }),
      ).toBeInTheDocument();
    });

    await step('resolves dataSource labels for table cells', async () => {
      await expect(await canvas.findByText('North Region')).toBeInTheDocument();
      await expect(await canvas.findByText('South Region')).toBeInTheDocument();
      await waitFor(async () => {
        await expect(args.onResolveLoad).toHaveBeenCalledWith(
          expect.objectContaining({
            field: 'region',
            type: 'resolve',
            values: [
              { region: 'north', status: 'active' },
              { region: 'south', status: 'paused' },
            ],
          }),
        );
      });
    });

    await step('calls create handler from toolbar', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'New' }));
      await expect(args.onCreate).toHaveBeenCalled();
      await expect(await page.findByRole('dialog')).toBeInTheDocument();
      await userEvent.click(page.getByRole('button', { name: 'Cancel' }));
    });

    await step('runs custom toolbar create command', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Custom new' }));
      await expect(args.onCreate).toHaveBeenCalledTimes(2);
      await expect(await page.findByRole('dialog')).toBeInTheDocument();
      await userEvent.click(page.getByRole('button', { name: 'Cancel' }));
    });

    await step('opens edit modal from row actions', async () => {
      const firstMenuButton = canvas.getAllByRole('button', { name: 'Open menu' })[0];
      await userEvent.click(firstMenuButton!);
      await userEvent.click(page.getByRole('menuitem', { name: 'Edit' }));
      await expect(await page.findByRole('dialog')).toHaveTextContent('Edit');
      await expect(page.getByDisplayValue('North Store')).toBeInTheDocument();
      await userEvent.click(page.getByRole('button', { name: 'Cancel' }));
    });
  },
};
