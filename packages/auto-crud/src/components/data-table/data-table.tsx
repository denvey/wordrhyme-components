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
import type { DataTableClassNames } from '@/types/data-table';

interface DataTableProps<TData> extends React.ComponentProps<'div'> {
  table: TanstackTable<TData>;
  classNames?: DataTableClassNames;
  actionBar?: React.ReactNode;
}

export function DataTable<TData>({
  table,
  actionBar,
  children,
  className,
  classNames,
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
          className={classNames?.table}
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
          <TableHeader className={classNames?.thead}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className={classNames?.tr}>
                {headerGroup.headers.map((header) => {
                  const columnClassName = header.column.columnDef.meta?.classNames?.th;

                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={cn(
                        hasWidthCap && 'overflow-hidden text-ellipsis',
                        classNames?.th,
                        typeof columnClassName === 'string' ? columnClassName : undefined,
                      )}
                      style={{
                        ...getColumnPinningStyle({ column: header.column }),
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className={classNames?.tbody}>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={classNames?.tr}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => {
                    const columnClassName = cell.column.columnDef.meta?.classNames?.td;

                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          hasWidthCap && 'overflow-hidden text-ellipsis',
                          classNames?.td,
                          typeof columnClassName === 'string'
                            ? columnClassName
                            : undefined,
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
              <TableRow className={classNames?.tr}>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className={cn('h-24 text-center', classNames?.td)}
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
