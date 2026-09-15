import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useDataTable } from '../use-data-table';

afterEach(() => cleanup());

it.each([
  ['date', '2026-09-14', ['2026-09-14']],
  ['dateRange', '2026-09-14,2026-09-16', ['2026-09-14', '2026-09-16']],
] as const)('restores %s calendar values from the URL', (variant, value, expected) => {
  window.history.replaceState(null, '', `/?createdAt=${value}`);
  const { result } = renderHook(() =>
    useDataTable({
      data: [],
      columns: [{ id: 'createdAt', enableColumnFilter: true, meta: { variant } }],
      pageCount: 1,
    }),
  );
  expect(result.current.table.getColumn('createdAt')?.getFilterValue()).toEqual(expected);
});
