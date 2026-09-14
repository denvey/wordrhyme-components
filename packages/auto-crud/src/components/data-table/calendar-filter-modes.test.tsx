import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useDataTable } from '@/hooks/use-data-table';
import { DataTableFilterList } from './data-table-filter-list';
import { DataTableFilterMenu } from './data-table-filter-menu';

afterEach(() => cleanup());

it.each([DataTableFilterList, DataTableFilterMenu])(
  'reads calendar dates in $name',
  (Filter) => {
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
    expect(screen.getByText('September 14, 2026')).toBeTruthy();
  },
);
