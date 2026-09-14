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
