import { cleanup as cleanupHooks, renderHook } from '@testing-library/react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useReadableFilters } from '../use-readable-filters';
import type { ExtendedColumnFilter } from '@/types/data-table';

type Row = { opsOwnerUserId?: string };

const columns = [
  {
    id: 'opsOwnerUserId',
    meta: { variant: 'select' as const },
  },
];

describe('useReadableFilters', () => {
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    window.history.replaceState(null, '', '/stores?page=10');
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  it('returns to the first page when a filter changes', () => {
    let updateFilters: ((filters: ExtendedColumnFilter<Row>[]) => void) | undefined;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    function TestComponent() {
      const [, setFilters] = useReadableFilters<Row>(columns);
      updateFilters = setFilters;
      return null;
    }

    act(() => {
      root.render(<TestComponent />);
    });

    act(() => {
      updateFilters?.([
        {
          id: 'opsOwnerUserId',
          value: 'ops-user-1',
          variant: 'select',
          operator: 'eq',
          filterId: 'ops-owner',
        },
      ]);
    });

    expect(window.location.search).toBe('?opsOwnerUserId=ops-user-1');

    cleanup = () => {
      act(() => root.unmount());
      container.remove();
    };
  });

  it('resets the configured page key when filters are cleared', () => {
    window.history.replaceState(
      null,
      '',
      '/stores?storesPage=10&opsOwnerUserId=ops-user-1',
    );

    let updateFilters: ((filters: ExtendedColumnFilter<Row>[]) => void) | undefined;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    function TestComponent() {
      const [, setFilters] = useReadableFilters<Row>(columns, {
        resetPageKey: 'storesPage',
      });
      updateFilters = setFilters;
      return null;
    }

    act(() => {
      root.render(<TestComponent />);
    });

    act(() => {
      updateFilters?.([]);
    });

    expect(window.location.search).toBe('');

    cleanup = () => {
      act(() => root.unmount());
      container.remove();
    };
  });
});

describe('pagination with equivalent readable filters', () => {
  const filterColumns = [
    { id: 'name', meta: { variant: 'text' as const } },
    { id: 'region', meta: { variant: 'select' as const } },
    { id: 'tags', meta: { variant: 'multiSelect' as const } },
    { id: 'price', meta: { variant: 'range' as const } },
  ];

  afterEach(cleanupHooks);

  it.each([
    ['and', 'name=alice&region=west'],
    ['or', 'name=alice&region=west'],
    ['and', 'name=alice&name__2=bob'],
  ])(
    'preserves pagination and local ordering when %s filters are reordered (%s)',
    (join, query) => {
      window.history.replaceState(
        null,
        '',
        `/stores?page=10&joinOperator=${join}&${query}`,
      );
      const { result } = renderHook(() => useReadableFilters(filterColumns));
      const reordered = [...result.current[0]].reverse();

      act(() => result.current[1](reordered));

      expect(new URLSearchParams(window.location.search).get('page')).toBe('10');
      expect(result.current[0]).toEqual(reordered);
    },
  );

  it('preserves pagination for unchanged filters and new UI identifiers', () => {
    window.history.replaceState(null, '', '/stores?page=10&name=alice');
    const { result } = renderHook(() => useReadableFilters(filterColumns));

    act(() => result.current[1]((prev) => prev));
    expect(new URLSearchParams(window.location.search).get('page')).toBe('10');
    act(() =>
      result.current[1]((prev) =>
        prev.map((filter) => ({ ...filter, filterId: 'new-id' })),
      ),
    );
    expect(new URLSearchParams(window.location.search).get('page')).toBe('10');
  });

  it('preserves pagination when multi-select values are reordered', () => {
    window.history.replaceState(null, '', '/stores?page=10&tags=a,b');
    const { result } = renderHook(() => useReadableFilters(filterColumns));

    act(() =>
      result.current[1]((prev) =>
        prev.map((filter) => ({ ...filter, value: ['b', 'a'] })),
      ),
    );

    expect(new URLSearchParams(window.location.search).get('page')).toBe('10');
  });

  it.each([
    ['name=alice', { value: 'bob' }],
    ['name=alice', { operator: 'ne' as const }],
    ['price=10,20', { value: ['20', '10'] }],
  ])('resets pagination for effective changes to %s', (query, update) => {
    window.history.replaceState(
      null,
      '',
      `/stores?page=10&${query}&sort=name&perPage=25`,
    );
    const { result } = renderHook(() => useReadableFilters(filterColumns));

    act(() =>
      result.current[1]((prev) => prev.map((filter) => ({ ...filter, ...update }))),
    );

    const params = new URLSearchParams(window.location.search);
    expect(params.has('page')).toBe(false);
    expect(params.get('sort')).toBe('name');
    expect(params.get('perPage')).toBe('25');
  });

  it('preserves unrelated pagination when resetting a custom key', () => {
    window.history.replaceState(
      null,
      '',
      '/stores?page=7&storesPage=10&name=alice&region=west',
    );
    const { result } = renderHook(() =>
      useReadableFilters(filterColumns, { resetPageKey: 'storesPage' }),
    );

    act(() => result.current[1]((prev) => prev.filter((filter) => filter.id !== 'name')));

    const params = new URLSearchParams(window.location.search);
    expect(params.has('storesPage')).toBe(false);
    expect(params.get('page')).toBe('7');
    expect(params.get('region')).toBe('west');
  });

  it('allows pagination reset to be disabled', () => {
    window.history.replaceState(null, '', '/stores?page=10&name=alice');
    const { result } = renderHook(() =>
      useReadableFilters(filterColumns, { resetPageKey: false }),
    );

    act(() => result.current[1]([]));

    expect(window.location.search).toBe('?page=10');
  });
});
