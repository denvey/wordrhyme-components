import type { Table } from '@tanstack/react-table';
import { dataToCSV } from './import';

/** Snapshot rendered business columns without changing the legacy CSV column policy. */
export function getVisibleExportColumns<TData>(
  table: Table<TData>,
  deny: readonly string[] = [],
): Array<{ id: string; label: string }> {
  const excluded = new Set(['select', 'actions', ...deny]);
  // Match getHeaderGroups()/row.getVisibleCells(): left, center, then right pins.
  return [
    ...table.getLeftVisibleLeafColumns(),
    ...table.getCenterVisibleLeafColumns(),
    ...table.getRightVisibleLeafColumns(),
  ]
    .filter((column) => {
      if (excluded.has(column.id)) return false;
      const meta = column.columnDef.meta;
      if (meta?.autoCrudExpandColumn) return false;
      const classes = [meta?.classNames?.th, meta?.classNames?.td];
      return !classes.some(
        (value) => typeof value === 'string' && /(?:^|\s)!?hidden!?(?:\s|$)/.test(value),
      );
    })
    .map((column) => ({
      id: column.id,
      label:
        column.columnDef.meta?.label ??
        (typeof column.columnDef.header === 'string'
          ? column.columnDef.header
          : column.id),
    }));
}

export function getExportColumnIds<TData>(table: Table<TData>): string[] {
  return table
    .getAllLeafColumns()
    .filter((column) => column.accessorFn)
    .map((column) => column.id);
}

export function exportTableToCSV<TData>(
  table: Table<TData>,
  opts: {
    filename?: string;
    excludeColumns?: (keyof TData | 'select' | 'actions')[];
    onlySelected?: boolean;
  } = {},
): void {
  const { filename = 'table', excludeColumns = [], onlySelected = false } = opts;

  const headers = getExportColumnIds(table).filter(
    (id) => !excludeColumns.includes(id as keyof TData | 'select' | 'actions'),
  );

  const csvContent = [
    headers.join(','),
    ...(onlySelected
      ? table.getFilteredSelectedRowModel().rows
      : table.getRowModel().rows
    ).map((row) =>
      headers
        .map((header) => {
          const cellValue = row.getValue(header);
          return typeof cellValue === 'string'
            ? `"${cellValue.replace(/"/g, '""')}"`
            : cellValue;
        })
        .join(','),
    ),
  ].join('\n');

  downloadCSV(csvContent, filename);
}

/**
 * 导出原始数据数组为 CSV（用于服务端全量导出）
 */
export function exportAllToCSV<T extends Record<string, unknown>>(
  data: T[],
  opts: {
    filename?: string;
    headers?: string[];
    excludeColumns?: string[];
  } = {},
): void {
  const { filename = 'export', ...csvOpts } = opts;
  const csvContent = dataToCSV(data, csvOpts);
  downloadCSV(csvContent, filename);
}

/**
 * 下载 CSV 模板文件
 */
export function downloadCSVTemplate(headers: string[], filename = 'template'): void {
  const csvContent =
    headers
      .map((h) => {
        if (h.includes(',') || h.includes('"') || h.includes('\n')) {
          return `"${h.replace(/"/g, '""')}"`;
        }
        return h;
      })
      .join(',') + '\n';

  downloadCSV(csvContent, filename);
}

function downloadCSV(csvContent: string, filename: string): void {
  // Excel needs a UTF-8 BOM when opening CSV files directly.
  const blob = new Blob(['\uFEFF', csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
