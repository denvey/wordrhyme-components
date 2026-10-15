import {
  createTable,
  getCoreRowModel,
  type ColumnPinningState,
} from '@tanstack/react-table';
import { describe, expect, it } from 'vitest';
import { getExportColumnIds, getVisibleExportColumns } from './export';

function table(columnPinning: ColumnPinningState = {}) {
  return createTable({
    data: [{ name: 'A', secret: 'private', css: 'internal', hidden: 'hidden' }],
    columns: [
      { id: 'select' },
      {
        accessorKey: 'name',
        header: () => 'Custom header',
        meta: { label: '名称' },
      },
      { accessorKey: 'secret' },
      { accessorKey: 'css', meta: { classNames: { th: 'hidden', td: 'hidden' } } },
      { accessorKey: 'hidden' },
      { id: 'display', meta: { label: '展示列' }, cell: () => 'computed' },
      { id: 'actions' },
    ],
    state: {
      columnOrder: ['display', 'name'],
      columnVisibility: { hidden: false },
      columnPinning,
    },
    onStateChange: () => {},
    renderFallbackValue: null,
    getCoreRowModel: getCoreRowModel(),
  });
}

describe('export column policies', () => {
  it('keeps visible order and display-only business columns while excluding private and CSS-hidden columns', () => {
    expect(getVisibleExportColumns(table(), ['secret'])).toEqual([
      { id: 'display', label: '展示列' },
      { id: 'name', label: '名称' },
    ]);
  });

  it('matches rendered header and cell order when pinning differs from column order', () => {
    const instance = table({ left: ['name'], right: ['display'] });
    const excluded = new Set(['select', 'actions', 'secret', 'css']);
    const headers = instance
      .getHeaderGroups()
      .flatMap((group) => group.headers.map((header) => header.column.id))
      .filter((id) => !excluded.has(id));
    const cells = instance
      .getRowModel()
      .rows[0]!.getVisibleCells()
      .map((cell) => cell.column.id)
      .filter((id) => !excluded.has(id));
    const columns = getVisibleExportColumns(instance, ['secret']);
    expect(columns.map((column) => column.id)).toEqual(headers);
    expect(columns.map((column) => column.id)).toEqual(cells);
    expect(columns).toEqual([
      { id: 'name', label: '名称' },
      { id: 'display', label: '展示列' },
    ]);
  });

  it('uses a text header when display-only columns have no resolved metadata label', () => {
    const instance = table();
    delete instance.getColumn('display')!.columnDef.meta;
    instance.getColumn('display')!.columnDef.header = 'Localized display';
    expect(getVisibleExportColumns(instance, ['secret'])[0]).toEqual({
      id: 'display',
      label: 'Localized display',
    });
  });

  it('leaves the legacy accessor-only policy including hidden columns unchanged', () => {
    expect(getExportColumnIds(table())).toEqual(['name', 'secret', 'css', 'hidden']);
  });
});
