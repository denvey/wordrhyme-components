import { flexRender, type Table as TanstackTable } from '@tanstack/react-table';
import type * as React from 'react';

import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@wordrhyme/shadcn';
import { getColumnPinningStyle } from '@/lib/data-table';
import { useDateFormatterVersion } from '@/lib/format';
import { cn } from '@/lib/utils';

interface DataTableProps<TData> extends React.ComponentProps<'div'> {
  table: TanstackTable<TData>;
  actionBar?: React.ReactNode;
}

export function DataTable<TData>({
  table,
  actionBar,
  children,
  className,
  ...props
}: DataTableProps<TData>) {
  useDateFormatterVersion();

  const columns = [
    ...table.getLeftVisibleLeafColumns(),
    ...table.getCenterVisibleLeafColumns(),
    ...table.getRightVisibleLeafColumns(),
  ];
  // TanStack uses MAX_SAFE_INTEGER when no column width cap is configured.
  // Auto table layout can stretch cells beyond max-width, so capped tables
  // need an explicit total width and column tracks (including cell padding).
  const hasWidthCap = columns.some(
    (column) =>
      (column.columnDef.maxSize ?? Number.MAX_SAFE_INTEGER) < Number.MAX_SAFE_INTEGER,
  );

  return (
    <div
      className={cn('flex w-full flex-col gap-2.5 overflow-auto', className)}
      {...props}
    >
      {children}
      <div className="overflow-hidden rounded-md border">
        <Table
          style={
            hasWidthCap
              ? {
                  tableLayout: 'fixed',
                  width: columns.reduce((width, column) => width + column.getSize(), 0),
                }
              : undefined
          }
        >
          {hasWidthCap && (
            <colgroup>
              {columns.map((column) => (
                <col key={column.id} style={{ width: column.getSize() }} />
              ))}
            </colgroup>
          )}
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={hasWidthCap ? 'overflow-hidden text-ellipsis' : undefined}
                    style={{
                      ...getColumnPinningStyle({ column: header.column }),
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => {
                    const cellClassName = (
                      cell.column.columnDef.meta as
                        | { cellClassName?: unknown }
                        | undefined
                    )?.cellClassName;

                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          hasWidthCap && 'overflow-hidden text-ellipsis',
                          typeof cellClassName === 'string' ? cellClassName : undefined,
                        )}
                        style={{
                          ...getColumnPinningStyle({ column: cell.column }),
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-2.5">
        <DataTablePagination table={table} />
        {actionBar && table.getFilteredSelectedRowModel().rows.length > 0 && actionBar}
      </div>
    </div>
  );
}
