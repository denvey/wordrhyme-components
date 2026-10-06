import type { Table } from '@tanstack/react-table';
import { dataToCSV, type CsvColumn } from './import';

/** Calendar dates are exported without locale formatting or timezone shifts. */
export function formatExportDate(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const match = typeof value === 'string' ? /^(\d{4}-\d{2}-\d{2})(?:$|T)/.exec(value) : null;
  const calendarDate = match?.[1];
  const date = calendarDate ? new Date(`${calendarDate}T00:00:00.000Z`)
    : value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  const text = date.toISOString().slice(0, 10);
  return calendarDate && text !== calendarDate ? '' : text;
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

  const headers = table
    .getAllLeafColumns()
    .map((column) => column.id)
    .filter((id) => !excludeColumns.includes(id as keyof TData | 'select' | 'actions'));

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
    columns?: CsvColumn[];
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
