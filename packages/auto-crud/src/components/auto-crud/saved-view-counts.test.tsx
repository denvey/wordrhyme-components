import type { AutoQueryParams } from '@/hooks/use-auto-crud-resource';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { useAutoCrudResource } from '@/hooks/use-auto-crud-resource';
import { setSearchParams } from '@/hooks/use-url-state';
import { createLocalViewStorage } from '@/lib/saved-views';
import { AutoCrudProvider } from './auto-crud-provider';
import { AutoCrudTable } from './auto-crud-table';
import { AutoTable } from './auto-table';

const schema = z.object({ id: z.string() });
const query = (input: AutoQueryParams) => ({ ...input, storeId: 42n });

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      disconnect = vi.fn();
    },
  );
  window.history.replaceState(null, '', '/orders?perPage=1');
  const items = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('reuses counts on navigation and refreshes them after a write even when the old page read is pending', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  client.setQueryDefaults(['orders'], {
    queryKeyHashFn: (key) =>
      JSON.stringify(key, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
  });
  const orders = ['first', 'second'];
  const counts = vi.fn(async () => ({ all: orders.length }));
  const storage = createLocalViewStorage('orders');
  let releasePageTwo: (() => void) | undefined;
  const router = {
    list: {
      useQuery: (input: ReturnType<typeof query>, options: { enabled: boolean }) =>
        useQuery({
          ...options,
          queryKey: ['orders', input],
          queryFn: async () => {
            if (input.page === 2 && orders.length === 3) {
              await new Promise<void>((resolve) => {
                releasePageTwo = resolve;
              });
            }
            return {
              data: [{ id: orders[input.page - 1]! }],
              total: orders.length,
              pageCount: orders.length,
            };
          },
        }),
    },
    create: {
      useMutation: () =>
        useMutation({
          mutationFn: async ({ id }: z.infer<typeof schema>) => {
            orders.push(id);
          },
        }),
    },
    update: { useMutation: () => ({}) },
    delete: { useMutation: () => ({}) },
  };
  function OrderList() {
    const resource = useAutoCrudResource({
      router,
      schema,
      query,
      options: { toast: false },
    });
    return (
      <>
        <button onClick={() => resource.handlers.submitCreate({ id: 'third' })}>
          Add order
        </button>
        <AutoCrudTable
          id="orders"
          schema={schema}
          resource={resource}
          table={{ views: { selector: 'tabs', counts } }}
        />
      </>
    );
  }

  render(
    <QueryClientProvider client={client}>
      <AutoCrudProvider scope="test" viewStorage={storage}>
        <OrderList />
      </AutoCrudProvider>
    </QueryClientProvider>,
  );
  await screen.findByText('first');
  await screen.findByLabelText('2 条记录');
  expect(counts).toHaveBeenCalledTimes(1);

  await act(async () => setSearchParams(new URLSearchParams('page=2&perPage=1')));
  await screen.findByText('second');
  expect(counts).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole('button', { name: 'Add order' }));
  await waitFor(() => expect(releasePageTwo).toBeDefined());
  await act(async () => setSearchParams(new URLSearchParams('page=3&perPage=1')));
  await screen.findByText('third');
  await screen.findByLabelText('3 条记录');
  await act(async () => releasePageTwo!());
  expect(counts).toHaveBeenCalledTimes(2);

  // A background update to the current query still refreshes the counts.
  orders.unshift('new');
  await act(async () => {
    await client.invalidateQueries({ queryKey: ['orders'] });
  });
  await screen.findByLabelText('4 条记录');
  expect(counts).toHaveBeenCalledTimes(3);

  // An explicit refresh also picks up changes outside the visible page.
  orders.push('last');
  fireEvent.click(screen.getByRole('button', { name: '刷新' }));
  await screen.findByLabelText('5 条记录');
  expect(counts).toHaveBeenCalledTimes(4);
});

it('refreshes standalone table counts when its rows or counts callback change', async () => {
  const client = new QueryClient();
  const storage = createLocalViewStorage('standalone');
  const counts = vi.fn().mockResolvedValueOnce({ all: 1 }).mockResolvedValue({ all: 2 });
  const rows = [{ id: 'first' }, { id: 'second' }];
  function table(data: typeof rows, loadCounts: typeof counts) {
    return (
      <QueryClientProvider client={client}>
        <AutoCrudProvider scope="test" viewStorage={storage}>
          <AutoTable
            resourceId="orders"
            schema={schema}
            data={data}
            views={{ selector: 'tabs', counts: loadCounts }}
          />
        </AutoCrudProvider>
      </QueryClientProvider>
    );
  }
  const { rerender } = render(table(rows.slice(0, 1), counts));
  await screen.findByLabelText('1 条记录');
  rerender(table(rows, counts));
  await screen.findByLabelText('2 条记录');
  expect(counts).toHaveBeenCalledTimes(2);
  const nextCounts = vi.fn().mockResolvedValue({ all: 3 });
  rerender(table(rows, nextCounts));
  await screen.findByLabelText('3 条记录');
  expect(nextCounts).toHaveBeenCalledTimes(1);
});
