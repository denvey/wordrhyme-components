import { keepPreviousData } from '@tanstack/react-query';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { z } from 'zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useAutoCrudResource,
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

type Row = z.output<typeof schema>;

function createRouter() {
  return {
    list: {
      useQuery: vi.fn(() => ({
        data: { data: [], pageCount: 0 },
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
