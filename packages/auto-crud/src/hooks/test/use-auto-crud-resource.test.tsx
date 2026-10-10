import { renderHook } from '@testing-library/react';
import { keepPreviousData } from '@tanstack/react-query';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { z } from 'zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useAutoCrudResource,
  type UseAutoCrudResourceOptions,
  type UseAutoCrudResourceReturn,
} from '../use-auto-crud-resource';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

const schema = z.object({
  id: z.string(),
  status: z.enum(['draft', 'published']),
});

const schemaWithCreatedAt = schema.extend({
  createdAt: z.date(),
});

type Row = z.output<typeof schema>;
type CreatedAtRow = z.output<typeof schemaWithCreatedAt>;

function createRouter() {
  return {
    list: {
      useQuery: vi.fn(() => ({
        data: { data: [], pageCount: 0, total: 0 },
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
      })),
    },
    create: { useMutation: vi.fn(() => ({ isPending: false, mutate: vi.fn() })) },
    update: { useMutation: vi.fn(() => ({ isPending: false, mutate: vi.fn() })) },
    delete: { useMutation: vi.fn(() => ({ isPending: false, mutate: vi.fn() })) },
  };
}

function renderResourceHook(
  router: ReturnType<typeof createRouter>,
  onRender?: (resource: UseAutoCrudResourceReturn<typeof schema, Row>) => void,
) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  function TestComponent() {
    const resource = useAutoCrudResource({
      router,
      schema,
    });
    onRender?.(resource);
    return null;
  }

  act(() => {
    root.render(<TestComponent />);
  });

  return () => {
    act(() => {
      root.unmount();
    });
    container.remove();
  };
}

function renderCreatedAtResourceHook(
  router: ReturnType<typeof createRouter>,
  options?: UseAutoCrudResourceOptions<typeof schemaWithCreatedAt, CreatedAtRow>,
) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  function TestComponent() {
    useAutoCrudResource({
      router,
      schema: schemaWithCreatedAt,
      options,
    });
    return null;
  }

  act(() => {
    root.render(<TestComponent />);
  });

  return () => {
    act(() => {
      root.unmount();
    });
    container.remove();
  };
}

describe('useAutoCrudResource', () => {
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    window.history.replaceState(null, '', '/products');
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    vi.clearAllMocks();
  });

  it('marks list queries stale so clearing filters refetches cached list data', () => {
    const router = createRouter();

    cleanup = renderResourceHook(router);

    expect(router.list.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [],
      }),
      {
        placeholderData: keepPreviousData,
        staleTime: 0,
      },
    );
  });

  it('exposes the total returned for the current query', () => {
    const router = createRouter();
    let resource: UseAutoCrudResourceReturn<typeof schema, Row> | undefined;
    router.list.useQuery.mockReturnValue({
      data: { data: [], pageCount: 40, total: 394 },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    cleanup = renderResourceHook(router, (nextResource) => {
      resource = nextResource;
    });

    expect(resource?.tableData.total).toBe(394);
  });

  it('defaults list sorting to createdAt descending when the schema has createdAt', () => {
    const router = createRouter();

    cleanup = renderCreatedAtResourceHook(router);

    expect(router.list.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [{ id: 'createdAt', desc: true }],
      }),
      {
        placeholderData: keepPreviousData,
        staleTime: 0,
      },
    );
  });

  it('uses configured default sorting for list queries', () => {
    const router = createRouter();

    cleanup = renderCreatedAtResourceHook(router, {
      defaultSort: [{ id: 'status', desc: false }],
    });

    expect(router.list.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [{ id: 'status', desc: false }],
      }),
      expect.any(Object),
    );
  });

  it('exposes a refresh handler that refetches the current list query', async () => {
    const router = createRouter();
    const refetch = vi.fn();
    let resource: UseAutoCrudResourceReturn<typeof schema, Row> | undefined;

    router.list.useQuery.mockReturnValue({
      data: { data: [], pageCount: 0 },
      isLoading: false,
      isFetching: false,
      refetch,
    });

    cleanup = renderResourceHook(router, (nextResource) => {
      resource = nextResource;
    });

    await act(async () => {
      await resource?.handlers.refresh?.();
    });

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('updates list query input when a readable filter is cleared from the URL', async () => {
    const router = createRouter();
    window.history.replaceState(null, '', '/products?status=published');

    cleanup = renderResourceHook(router);

    expect(router.list.useQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters: [
          expect.objectContaining({
            id: 'status',
            value: ['published'],
          }),
        ],
      }),
      expect.any(Object),
    );

    await act(async () => {
      window.history.replaceState(null, '', '/products');
      window.dispatchEvent(new Event('urlchange'));
      await Promise.resolve();
    });

    expect(router.list.useQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters: [],
      }),
      expect.any(Object),
    );
  });
});

it('uses field filter variants for query values and operators', () => {
  window.history.replaceState(null, '', '/orders?customerId=c1&owners=u1,u2&page=3');
  const router = createRouter();
  const orderSchema = z.object({
    customerId: z.string().optional(),
    owners: z.array(z.string()).optional(),
  });
  const { unmount } = renderHook(() =>
    useAutoCrudResource({
      router,
      schema: orderSchema,
      fields: {
        customerId: { filter: { variant: 'select' } },
        owners: { filter: { variant: 'multiSelect' } },
      },
    }),
  );
  expect(router.list.useQuery).toHaveBeenLastCalledWith(
    expect.objectContaining({
      page: 3,
      filters: [
        expect.objectContaining({
          id: 'customerId',
          value: 'c1',
          operator: 'eq',
          variant: 'select',
        }),
        expect.objectContaining({
          id: 'owners',
          value: ['u1', 'u2'],
          operator: 'inArray',
          variant: 'multiSelect',
        }),
      ],
    }),
    expect.any(Object),
  );
  unmount();
});

it.each([
  {
    name: 'label-only metadata',
    metadataFilter: undefined,
    filter: { variant: 'multiSelect' as const },
  },
  {
    name: 'a local variant override',
    metadataFilter: { variant: 'select' as const },
    filter: { variant: 'multiSelect' as const },
  },
  {
    name: 'an inherited metadata variant',
    metadataFilter: { variant: 'multiSelect' as const },
    filter: { index: 20 },
  },
])(
  'merges resource and table filter configuration with $name',
  ({ metadataFilter, filter }) => {
    window.history.replaceState(null, '', '/orders?customerId=c1,c2&page=4');
    const router = {
      ...createRouter(),
      meta: {
        useQuery: vi.fn(() => ({
          data: {
            fields: {
              customerId: {
                label: 'Customer',
                filter: metadataFilter,
              },
            },
          },
        })),
      },
    };
    const orderSchema = z.object({ customerId: z.string().optional() });
    const { unmount } = renderHook(() =>
      useAutoCrudResource({
        router,
        schema: orderSchema,
        fields: { customerId: { filter } },
      }),
    );
    expect(router.list.useQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 4,
        filters: [
          expect.objectContaining({
            id: 'customerId',
            value: ['c1', 'c2'],
            operator: 'inArray',
            variant: 'multiSelect',
          }),
        ],
      }),
      expect.any(Object),
    );
    unmount();
  },
);
