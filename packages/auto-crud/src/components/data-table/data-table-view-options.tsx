'use client';

import type { Table } from '@tanstack/react-table';
import type { PopoverContentProps } from '@wordrhyme/shadcn';
import type { TableControlsLocale } from '@/i18n/locale';

import { Check, Settings2 } from 'lucide-react';
import * as React from 'react';
import { Button } from '@wordrhyme/shadcn';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@wordrhyme/shadcn';
import { Popover, PopoverContent, PopoverTrigger } from '@wordrhyme/shadcn';
import { enUSTableControls } from '@/i18n/locale';
import { cn } from '@/lib/utils';

export interface DataTableViewOptionsProps<TData> extends PopoverContentProps {
  table: Table<TData>;
  disabled?: boolean;
  locale?: TableControlsLocale['columns'];
}

export function DataTableViewOptions<TData>({
  table,
  disabled,
  locale = enUSTableControls.columns,
  ...props
}: DataTableViewOptionsProps<TData>) {
  const columns = React.useMemo(
    () =>
      table
        .getAllColumns()
        .filter(
          (column) => typeof column.accessorFn !== 'undefined' && column.getCanHide(),
        ),
    [table],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label={locale.label}
          title={locale.label}
          role="combobox"
          variant="outline"
          size="icon-sm"
          className="ml-auto"
          disabled={disabled}
        >
          <Settings2 className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-0" {...props}>
        <Command>
          <CommandInput placeholder={locale.search} />
          <CommandList>
            <CommandEmpty>{locale.empty}</CommandEmpty>
            <CommandGroup>
              {columns.map((column) => (
                <CommandItem
                  key={column.id}
                  onSelect={() => column.toggleVisibility(!column.getIsVisible())}
                >
                  <span className="truncate">
                    {column.columnDef.meta?.label ?? column.id}
                  </span>
                  <Check
                    className={cn(
                      'ml-auto size-4 shrink-0',
                      column.getIsVisible() ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
