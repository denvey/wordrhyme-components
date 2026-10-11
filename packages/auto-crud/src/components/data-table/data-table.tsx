import { flexRender, type Table as TanstackTable } from '@tanstack/react-table';
import { Fragment, type ComponentProps, type ReactNode } from 'react';
import type { TablePaginationOptions } from '@/types/data-table';

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

export interface DataTableProps<TData> extends ComponentProps<'div'> {
  table: TanstackTable<TData>;
  pagination?: TablePaginationOptions;
  classNames?: DataTableClassNames;
  actionBar?: ReactNode;
  /** Content mounted below an expanded row. */
  expandedRow?: (record: TData) => ReactNode;
}

export function DataTable<TData>({
  table,
  actionBar,
  pagination,
  expandedRow,
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
                <Fragment key={row.id}>
                  <TableRow
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
                  {expandedRow && row.getCanExpand() && row.getIsExpanded() && (
                    <TableRow className={classNames?.tr}>
                      <TableCell
                        colSpan={row.getVisibleCells().length}
                        className={classNames?.td}
                      >
                        {expandedRow(row.original)}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
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
        <DataTablePagination table={table} {...pagination} />
        {actionBar && table.getFilteredSelectedRowModel().rows.length > 0 && actionBar}
      </div>
    </div>
  );
}
