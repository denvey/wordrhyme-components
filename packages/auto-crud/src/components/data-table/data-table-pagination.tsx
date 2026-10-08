import type { Table } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

import { Button, Input } from '@wordrhyme/shadcn';
import { useRef } from 'react';
import type { TablePaginationOptions } from '@/types/data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@wordrhyme/shadcn';
import { cn } from '@/lib/utils';

interface DataTablePaginationProps<TData> extends React.ComponentProps<'div'>, TablePaginationOptions {
  table: Table<TData>;
  pageSizeOptions?: number[];
}

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 30, 40, 50],
  alwaysShowFirstLast = false,
  showPageJump = false,
  pageJumpLabel = 'Go to page',
  className,
  ...props
}: DataTablePaginationProps<TData>) {
  const pageInput = useRef<HTMLInputElement>(null);
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();
  const canJump = Number.isFinite(pageCount) && pageCount > 0;
  const total =
    table.options.rowCount ??
    (table.options.manualPagination ? undefined : table.getRowCount());

  return (
    <div
      className={cn(
        'flex w-full flex-col-reverse items-center justify-between gap-4 overflow-auto p-1 sm:flex-row sm:gap-8',
        className,
      )}
      {...props}
    >
      <div className="flex flex-1 items-center gap-6 whitespace-nowrap text-muted-foreground text-sm">
        <span>
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </span>
        {total !== undefined && <span>Total: {total}</span>}
      </div>
      <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
        <div className="flex items-center space-x-2">
          <p className="whitespace-nowrap font-medium text-sm">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-18 data-size:h-8">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-center font-medium text-sm">
          Page {pageIndex + 1} of {pageCount}
        </div>
        {showPageJump && (
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const page = pageInput.current?.valueAsNumber;
              if (canJump && page !== undefined && Number.isInteger(page) && page >= 1 && page <= pageCount) {
                table.setPageIndex(page - 1);
              }
            }}
          >
            <label className="flex items-center gap-2 whitespace-nowrap text-sm">
              {pageJumpLabel}
              <Input
                key={`${pageIndex}-${pageCount}`}
                ref={pageInput}
                type="number"
                min={1}
                max={canJump ? pageCount : undefined}
                step={1}
                required
                defaultValue={pageIndex + 1}
                disabled={!canJump}
                className="h-8 w-20"
              />
            </label>
            <Button type="submit" variant="outline" size="icon" className="size-8" disabled={!canJump} aria-label={pageJumpLabel}>
              <ChevronRight />
            </Button>
          </form>
        )}
        <div className="flex items-center space-x-2">
          <Button
            aria-label="Go to first page"
            variant="outline"
            size="icon"
            className={cn('size-8', alwaysShowFirstLast ? 'flex' : 'hidden lg:flex')}
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft />
          </Button>
          <Button
            aria-label="Go to previous page"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft />
          </Button>
          <Button
            aria-label="Go to next page"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight />
          </Button>
          <Button
            aria-label="Go to last page"
            variant="outline"
            size="icon"
            className={cn('size-8', alwaysShowFirstLast ? 'flex' : 'hidden lg:flex')}
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage() || (alwaysShowFirstLast && !canJump)}
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
