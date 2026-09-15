import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { setDateFormatter } from '@/lib/format';
import { useDataTable } from '@/hooks/use-data-table';
import { DataTableFilterList } from './data-table-filter-list';
import { DataTableFilterMenu } from './data-table-filter-menu';

afterEach(() => {
  cleanup();
  setDateFormatter(undefined);
});

it.each([
  [DataTableFilterList, false],
  [DataTableFilterMenu, false],
  [DataTableFilterList, true],
  [DataTableFilterMenu, true],
] as const)(
  'reads calendar dates in %s with legacy formatter=%s',
  (Filter, legacyFormatter) => {
    if (legacyFormatter) setDateFormatter(() => 'Custom host date');
    window.history.replaceState(null, '', '/?createdAt=2026-09-14');
    function Table() {
      const { table } = useDataTable({
        data: [],
        columns: [
          {
            id: 'createdAt',
            accessorFn: () => '',
            enableColumnFilter: true,
            meta: { variant: 'date', label: 'Created' },
          },
        ],
        pageCount: 1,
        enableAdvancedFilter: true,
      });
      return <Filter table={table} />;
    }
    render(<Table />);
    if (Filter === DataTableFilterList) {
      fireEvent.click(screen.getByRole('button', { name: /^Filter/ }));
    }
    expect(
      screen.getByText(legacyFormatter ? 'Custom host date' : 'September 14, 2026'),
    ).toBeTruthy();
  },
);
