'use client';

import type { Column } from '@tanstack/react-table';
import { PlusCircle, XCircle } from 'lucide-react';

import { Badge } from '@pixpilot/shadcn';
import { Button } from '@pixpilot/shadcn';
import { Separator } from '@pixpilot/shadcn';
import type { Option } from '@/types/data-table';
import { MultiCombobox } from '@/components/ui/multi-combobox';

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
  options: Option[];
  multiple?: boolean;
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
  multiple,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const columnFilterValue = column?.getFilterValue();
  const selectedValues = Array.isArray(columnFilterValue)
    ? columnFilterValue.filter((value): value is string => typeof value === 'string')
    : [];

  const onChange = (nextValues: string[]) => {
    column?.setFilterValue(nextValues.length ? nextValues : undefined);
  };

  return (
    <MultiCombobox
      value={selectedValues}
      onChange={onChange}
      options={options}
      selectionMode={multiple ? 'multiple' : 'single'}
      searchPlaceholder={title}
      contentClassName="w-50"
      matchTriggerWidth={false}
      clearText="Clear filters"
      renderTrigger={({ selectedOptions, selectedValues, clearSelection }) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-dashed font-normal"
          disabled={!column}
        >
          {selectedValues.length > 0 ? (
            <div
              role="button"
              aria-label={`Clear ${title} filter`}
              tabIndex={0}
              className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={clearSelection}
            >
              <XCircle />
            </div>
          ) : (
            <PlusCircle />
          )}
          {title}
          {selectedValues.length > 0 && (
            <>
              <Separator
                orientation="vertical"
                className="mx-0.5 data-[orientation=vertical]:h-4"
              />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal lg:hidden"
              >
                {selectedValues.length}
              </Badge>
              <div className="hidden items-center gap-1 lg:flex">
                {selectedValues.length > 2 ? (
                  <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                    {selectedValues.length} selected
                  </Badge>
                ) : (
                  selectedOptions.map((option) => (
                    <Badge
                      variant="secondary"
                      key={option.value}
                      className="rounded-sm px-1 font-normal"
                    >
                      {option.label}
                    </Badge>
                  ))
                )}
              </div>
            </>
          )}
        </Button>
      )}
    />
  );
}
