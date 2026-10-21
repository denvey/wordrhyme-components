import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { useAutoCrudResource, type AutoQueryParams } from '../use-auto-crud-resource';

const schema = z.object({ id: z.string(), status: z.enum(['draft', 'published']) });
const metadata = {
  schema: {
    type: 'object',
    properties: { stage: { type: 'string', enum: ['queued', 'done'] } },
  },
  fields: { stage: { filter: { variant: 'select' } } },
};

function fixture() {
  let resolve!: (value: typeof metadata) => void;
  let reject!: (error: Error) => void;
  const pending = new Promise<typeof metadata>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const list = vi.fn(async (_input: AutoQueryParams) => ({
    data: [{ id: '1', status: 'draft' }],
    total: 1,
    pageCount: 1,
  }));
  const router = {
    meta: { useQuery: () => useQuery({ queryKey: ['meta'], queryFn: () => pending }) },
    list: {
      useQuery: (input: AutoQueryParams, options: Record<string, unknown>) =>
        useQuery({
          queryKey: ['list', input],
          queryFn: () => list(input),
          ...options,
        }),
    },
    create: { useMutation: () => ({ isPending: false }) },
    update: { useMutation: () => ({ isPending: false }) },
    delete: { useMutation: () => ({ isPending: false }) },
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { router, list, resolve, reject, client, wrapper };
}

afterEach(cleanup);

describe('initial list filters', () => {
  it('waits for delayed metadata and its URL filters without querying the unfiltered page', async () => {
    window.history.replaceState(null, '', '/products?stage=queued&stage__op=eq&page=3');
    const f = fixture();
    const { result } = renderHook(
      () => useAutoCrudResource({ router: f.router, schema }),
      { wrapper: f.wrapper },
    );
    expect(f.list).not.toHaveBeenCalled();
    expect(result.current.tableData.isLoading).toBe(true);
    await act(async () => f.resolve(metadata));
    await waitFor(() => expect(f.list).toHaveBeenCalledTimes(1));
    expect(f.list.mock.calls[0]![0]).toMatchObject({
      page: 3,
      filters: [{ id: 'stage', value: 'queued', operator: 'eq' }],
    });
    await waitFor(() => expect(result.current.tableData.total).toBe(1));
    expect(window.location.search).toContain('page=3');
  });

  it('hides cached rows for incomplete input and prevents an early manual refresh', async () => {
    window.history.replaceState(null, '', '/products?stage=queued&stage__op=eq');
    const f = fixture();
    f.client.setQueryData(
      ['list', { page: 1, perPage: 10, sort: [], filters: [], joinOperator: 'and' }],
      {
        data: [{ id: 'unfiltered', status: 'draft' }],
        total: 99,
        pageCount: 10,
      },
    );
    const { result } = renderHook(
      () => useAutoCrudResource({ router: f.router, schema }),
      { wrapper: f.wrapper },
    );
    expect(result.current.tableData.data).toEqual([]);
    expect(result.current.tableData.total).toBeUndefined();
    await act(async () => {
      await result.current.handlers.refresh();
    });
    expect(f.list).not.toHaveBeenCalled();
    await act(async () => f.resolve(metadata));
    await waitFor(() => expect(f.list).toHaveBeenCalledTimes(1));
  });

  it('keeps local-schema filtering usable when metadata fails', async () => {
    window.history.replaceState(null, '', '/products?status=draft&status__op=eq');
    const f = fixture();
    const { result } = renderHook(
      () => useAutoCrudResource({ router: f.router, schema }),
      { wrapper: f.wrapper },
    );
    await act(async () => f.reject(new Error('metadata unavailable')));
    await waitFor(() => expect(f.list).toHaveBeenCalledTimes(1));
    expect(f.list.mock.calls[0]![0].filters).toMatchObject([
      { id: 'status', value: 'draft' },
    ]);
    await waitFor(() => expect(result.current.tableData.isLoading).toBe(false));
  });

  it('queries immediately when the router has no metadata endpoint', async () => {
    window.history.replaceState(null, '', '/products');
    const f = fixture();
    const { meta: _meta, ...router } = f.router;
    renderHook(() => useAutoCrudResource({ router, schema }), { wrapper: f.wrapper });
    await waitFor(() => expect(f.list).toHaveBeenCalledTimes(1));
  });

  it('retains cached metadata during a background refresh', async () => {
    window.history.replaceState(null, '', '/products?stage=queued&stage__op=eq');
    const f = fixture();
    f.client.setQueryData(['meta'], metadata);
    renderHook(() => useAutoCrudResource({ router: f.router, schema }), {
      wrapper: f.wrapper,
    });
    await waitFor(() => expect(f.list).toHaveBeenCalledTimes(1));
    expect(f.list.mock.calls[0]![0].filters).toMatchObject([
      { id: 'stage', value: 'queued' },
    ]);
  });
});
