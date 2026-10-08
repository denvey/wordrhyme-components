import type { Table } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

import { Button, Input } from '@wordrhyme/shadcn';
import { useEffect, useRef, useState } from 'react';
import type { TablePaginationOptions } from '@/types/data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@wordrhyme/shadcn';
import { cn } from '@/lib/utils';

interface DataTablePaginationProps<TData>
  extends React.ComponentProps<'div'>, TablePaginationOptions {
  table: Table<TData>;
  pageSizeOptions?: number[];
}

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 30, 40, 50],
  alwaysShowFirstLast = false,
  responsive = false,
  showPageJump = false,
  pageJumpLabel = 'Go to page',
  className,
  ...props
}: DataTablePaginationProps<TData>) {
  const pageJump = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  const controls = useRef<HTMLDivElement>(null);
  const navigation = useRef<HTMLDivElement>(null);
  const [hasSpace, setHasSpace] = useState(false);
  const hideExtras = responsive && !hasSpace;
  const hiddenClass = hideExtras
    ? 'absolute invisible pointer-events-none left-0 top-0'
    : undefined;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();
  const canJump = Number.isFinite(pageCount) && pageCount > 0;
  const total =
    table.options.rowCount ??
    (table.options.manualPagination ? undefined : table.getRowCount());

  useEffect(() => {
    if (
      !responsive ||
      !container.current ||
      !summary.current ||
      !controls.current ||
      !navigation.current
    )
      return;
    if (typeof ResizeObserver === 'undefined') return;
    const root = container.current;
    const info = summary.current;
    const group = controls.current;
    const nav = navigation.current;
    const jump = pageJump.current;
    const gap = (node: HTMLElement) => parseFloat(getComputedStyle(node).columnGap) || 0;
    const width = (node: HTMLElement): number => {
      const children = Array.from(node.children) as HTMLElement[];
      return (
        children.reduce((sum, child) => {
          const style = getComputedStyle(child);
          // Measure the form inside the jump wrapper even while the wrapper is clipped.
          return (
            sum +
            (child === nav || child === jump
              ? width(child)
              : child.getBoundingClientRect().width) +
            (parseFloat(style.marginLeft) || 0) +
            (parseFloat(style.marginRight) || 0)
          );
        }, 0) +
        Math.max(0, children.length - 1) * gap(node)
      );
    };
    const measure = () => {
      const style = getComputedStyle(root);
      const available =
        root.clientWidth -
        (parseFloat(style.paddingLeft) || 0) -
        (parseFloat(style.paddingRight) || 0);
      const required = style.flexDirection.startsWith('column')
        ? Math.max(width(info), width(group))
        : width(info) + width(group) + gap(root);
      setHasSpace(available + 0.5 >= required);
    };
    const observer = new ResizeObserver(measure);
    for (const node of [
      root,
      info,
      group,
      nav,
      ...info.children,
      ...group.children,
      ...nav.children,
      ...(jump?.children ?? []),
    ])
      observer.observe(node);
    measure();
    return () => observer.disconnect();
  }, [responsive, showPageJump, alwaysShowFirstLast, total !== undefined]);

  return (
    <div
      ref={container}
      className={cn(
        'flex w-full flex-col-reverse items-center justify-between gap-4 overflow-auto p-1 sm:flex-row sm:gap-8',
        responsive && 'relative',
        className,
      )}
      {...props}
    >
      <div
        ref={summary}
        className="flex flex-1 items-center gap-6 whitespace-nowrap text-muted-foreground text-sm"
      >
        <span>
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </span>
        {total !== undefined && <span>Total: {total}</span>}
      </div>
      <div
        ref={controls}
        className={cn(
          'flex items-center gap-4 sm:gap-6 lg:gap-8',
          responsive
            ? 'flex-row flex-wrap justify-center whitespace-nowrap [&>*]:shrink-0'
            : 'flex-col-reverse sm:flex-row',
        )}
      >
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
          <div
            ref={pageJump}
            className={
              hideExtras
                ? 'pointer-events-none absolute inset-x-0 top-0 invisible overflow-hidden'
                : undefined
            }
            aria-hidden={hideExtras || undefined}
          >
            <form
              className="flex w-max items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const page = Number(new FormData(event.currentTarget).get('page'));
                if (canJump && Number.isInteger(page) && page >= 1 && page <= pageCount) {
                  table.setPageIndex(page - 1);
                }
              }}
            >
              <label className="flex items-center gap-2 whitespace-nowrap text-sm">
                {pageJumpLabel}
                <Input
                  key={`${pageIndex}-${pageCount}`}
                  name="page"
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
              <Button
                type="submit"
                variant="outline"
                size="icon"
                className="size-8"
                disabled={!canJump}
                aria-label={pageJumpLabel}
              >
                <ChevronRight />
              </Button>
            </form>
          </div>
        )}
        <div ref={navigation} className="flex items-center space-x-2">
          <Button
            aria-label="Go to first page"
            variant="outline"
            size="icon"
            className={cn(
              'size-8',
              alwaysShowFirstLast ? 'flex' : 'hidden lg:flex',
              hiddenClass,
            )}
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
            className={cn(
              'size-8',
              alwaysShowFirstLast ? 'flex' : 'hidden lg:flex',
              hiddenClass,
            )}
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
