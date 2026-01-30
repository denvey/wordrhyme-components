"use client";

import type { Table } from "@tanstack/react-table";
import { CalendarIcon, Check, PlusCircle, X, XCircle } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";

import { Badge } from "@pixpilot/shadcn";
import { Button } from "@pixpilot/shadcn";
import { Calendar } from "@pixpilot/shadcn";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@pixpilot/shadcn";
import { Input } from "@pixpilot/shadcn";
import { Label } from "@pixpilot/shadcn";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@pixpilot/shadcn";
import { Separator } from "@pixpilot/shadcn";
import { Slider } from "@pixpilot/shadcn";
import { getDefaultFilterOperator } from "@/lib/data-table";
import { formatDate } from "@/lib/format";
import { generateId } from "@/lib/id";
import { useReadableFilters } from "@/hooks/use-readable-filters";
import { cn } from "@/lib/utils";
import type { ExtendedColumnFilter, Option } from "@/types/data-table";

interface AutoTableSimpleFiltersProps<TData> {
  table: Table<TData>;
  shallow?: boolean;
  filters?: ExtendedColumnFilter<TData>[];
  onFiltersChange?: (filters: ExtendedColumnFilter<TData>[]) => void;
}

export function AutoTableSimpleFilters<TData>({
  table,
  shallow = false,
  filters: externalFilters,
  onFiltersChange,
}: AutoTableSimpleFiltersProps<TData>) {
  const columns = React.useMemo(
    () => table.getAllColumns().filter((col) => col.columnDef.enableColumnFilter),
    [table]
  );

  const queryStateOptions = table.options.meta?.queryStateOptions;
  const [queryFilters, setQueryFilters] = useReadableFilters<TData>(columns, {
    ...queryStateOptions,
    shallow,
  });

  const filters = externalFilters ?? queryFilters;
  const setFilters = React.useCallback(
    (newFilters: ExtendedColumnFilter<TData>[] | ((prev: ExtendedColumnFilter<TData>[]) => ExtendedColumnFilter<TData>[])) => {
      const resolved = typeof newFilters === "function" ? newFilters(filters) : newFilters;
      if (onFiltersChange) {
        onFiltersChange(resolved);
      } else {
        setQueryFilters(resolved);
      }
    },
    [filters, onFiltersChange, setQueryFilters]
  );

  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // 获取某列当前的过滤值
  const getFilterValue = (columnId: string) => {
    const filter = filters.find((f) => f.id === columnId);
    return filter?.value;
  };

  // 更新某列的过滤值
  const updateFilter = React.useCallback(
    (columnId: string, value: string | string[] | undefined) => {
      const column = columns.find((c) => c.id === columnId);
      if (!column) return;

      const variant = column.columnDef.meta?.variant ?? "text";

      if (!value || (Array.isArray(value) && value.length === 0)) {
        setFilters(filters.filter((f) => f.id !== columnId));
      } else {
        const existing = filters.find((f) => f.id === columnId);
        if (existing) {
          setFilters(
            filters.map((f) =>
              f.id === columnId ? { ...f, value } : f
            ) as ExtendedColumnFilter<TData>[]
          );
        } else {
          setFilters([
            ...filters,
            {
              id: columnId as Extract<keyof TData, string>,
              value,
              variant,
              operator: getDefaultFilterOperator(variant),
              filterId: generateId({ length: 8 }),
            },
          ]);
        }
      }
    },
    [columns, filters, setFilters]
  );

  const hasFilters = filters.length > 0;

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {columns.map((column) => {
        const meta = column.columnDef.meta;
        if (!meta?.variant) return null;

        const value = getFilterValue(column.id);

        switch (meta.variant) {
          case "text":
            return (
              <Input
                key={column.id}
                placeholder={meta.label ?? column.id}
                value={typeof value === "string" ? value : ""}
                onChange={(e) => updateFilter(column.id, e.target.value || undefined)}
                className="h-8 w-36"
              />
            );

          case "select":
          case "multiSelect":
            return (
              <SimpleFacetedFilter
                key={column.id}
                title={meta.label ?? column.id}
                options={meta.options ?? []}
                multiple={meta.variant === "multiSelect"}
                value={Array.isArray(value) ? value : value ? [value] : []}
                onChange={(v) => updateFilter(column.id, v.length ? v : undefined)}
              />
            );

          case "range":
            return (
              <SimpleSliderFilter
                key={column.id}
                title={meta.label ?? column.id}
                range={meta.range as [number, number] | undefined}
                unit={meta.unit}
                value={Array.isArray(value) ? value.map(Number) as [number, number] : undefined}
                onChange={(v) => updateFilter(column.id, v ? v.map(String) : undefined)}
              />
            );

          case "date":
          case "dateRange":
            return (
              <SimpleDateFilter
                key={column.id}
                title={meta.label ?? column.id}
                multiple={meta.variant === "dateRange"}
                value={value}
                onChange={(v) => updateFilter(column.id, v)}
              />
            );

          default:
            return null;
        }
      })}
      {hasFilters && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-dashed"
          onClick={() => setFilters([])}
        >
          <X className="size-4" />
          Reset
        </Button>
      )}
    </div>
  );
}

// 简单的 Faceted 过滤器
interface SimpleFacetedFilterProps {
  title: string;
  options: Option[];
  multiple?: boolean;
  value: string[];
  onChange: (value: string[]) => void;
}

function SimpleFacetedFilter({
  title,
  options,
  multiple,
  value,
  onChange,
}: SimpleFacetedFilterProps) {
  const [open, setOpen] = React.useState(false);
  const selectedValues = new Set(value);

  const onItemSelect = (option: Option, isSelected: boolean) => {
    if (multiple) {
      const newValues = new Set(selectedValues);
      if (isSelected) {
        newValues.delete(option.value);
      } else {
        newValues.add(option.value);
      }
      onChange(Array.from(newValues));
    } else {
      onChange(isSelected ? [] : [option.value]);
      setOpen(false);
    }
  };

  const onReset = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="border-dashed font-normal">
          {selectedValues.size > 0 ? (
            <div
              role="button"
              tabIndex={0}
              className="rounded-sm opacity-70 hover:opacity-100"
              onClick={onReset}
            >
              <XCircle />
            </div>
          ) : (
            <PlusCircle />
          )}
          {title}
          {selectedValues.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-0.5 h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                {selectedValues.size}
              </Badge>
              <div className="hidden items-center gap-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                    {selectedValues.size} selected
                  </Badge>
                ) : (
                  options
                    .filter((o) => selectedValues.has(o.value))
                    .map((o) => (
                      <Badge key={o.value} variant="secondary" className="rounded-sm px-1 font-normal">
                        {o.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-50 p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList className="max-h-full">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-y-auto">
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value);
                return (
                  <CommandItem key={option.value} onSelect={() => onItemSelect(option, isSelected)}>
                    <div
                      className={cn(
                        "flex size-4 items-center justify-center rounded-sm border border-primary",
                        isSelected ? "bg-primary" : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check />
                    </div>
                    {option.icon && <option.icon />}
                    <span className="truncate">{option.label}</span>
                    {option.count && <span className="ml-auto font-mono text-xs">{option.count}</span>}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={() => onReset()} className="justify-center text-center">
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// 简单的 Slider 过滤器
interface SimpleSliderFilterProps {
  title: string;
  range?: [number, number];
  unit?: string;
  value?: [number, number];
  onChange: (value: [number, number] | undefined) => void;
}

function SimpleSliderFilter({ title, range, unit, value, onChange }: SimpleSliderFilterProps) {
  const id = React.useId();
  const min = range?.[0] ?? 0;
  const max = range?.[1] ?? 100;
  const [localRange, setLocalRange] = React.useState<[number, number]>(() => value ?? [min, max]);

  React.useEffect(() => {
    setLocalRange(value ?? [min, max]);
  }, [value, min, max]);

  const onReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  const onFromInputChange = (nextValue: number) => {
    const nextRange: [number, number] = [nextValue, localRange[1]];
    setLocalRange(nextRange);
    onChange(nextRange);
  };

  const onToInputChange = (nextValue: number) => {
    const nextRange: [number, number] = [localRange[0], nextValue];
    setLocalRange(nextRange);
    onChange(nextRange);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="border-dashed font-normal">
          {value ? (
            <div role="button" tabIndex={0} className="rounded-sm opacity-70 hover:opacity-100" onClick={onReset}>
              <XCircle />
            </div>
          ) : (
            <PlusCircle />
          )}
          <span>{title}</span>
          {value && (
            <>
              <Separator orientation="vertical" className="mx-0.5 h-4" />
              {value[0]} - {value[1]}{unit ? ` ${unit}` : ""}
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-auto flex-col gap-4">
        <p className="font-medium leading-none">{title}</p>
        <div className="flex items-center gap-4">
          <Label htmlFor={`${id}-from`} className="sr-only">From</Label>
          <div className="relative">
            <Input
              id={`${id}-from`}
              type="number"
              min={min}
              max={max}
              value={localRange[0]}
              onChange={(e) => onFromInputChange(Number(e.target.value))}
              className={cn("h-8 w-24", unit && "pr-8")}
            />
            {unit && (
              <span className="absolute top-0 right-0 bottom-0 flex items-center rounded-r-md bg-accent px-2 text-muted-foreground text-sm">
                {unit}
              </span>
            )}
          </div>
          <Label htmlFor={`${id}-to`} className="sr-only">To</Label>
          <div className="relative">
            <Input
              id={`${id}-to`}
              type="number"
              min={min}
              max={max}
              value={localRange[1]}
              onChange={(e) => onToInputChange(Number(e.target.value))}
              className={cn("h-8 w-24", unit && "pr-8")}
            />
            {unit && (
              <span className="absolute top-0 right-0 bottom-0 flex items-center rounded-r-md bg-accent px-2 text-muted-foreground text-sm">
                {unit}
              </span>
            )}
          </div>
        </div>
        <Slider
          min={min}
          max={max}
          value={localRange}
          onValueChange={(v) => setLocalRange(v as [number, number])}
          onValueCommit={(v) => onChange(v as [number, number])}
        />
        <Button variant="outline" size="sm" onClick={onReset}>Clear</Button>
      </PopoverContent>
    </Popover>
  );
}

// 简单的日期过滤器
interface SimpleDateFilterProps {
  title: string;
  multiple?: boolean;
  value: string | string[] | undefined;
  onChange: (value: string | string[] | undefined) => void;
}

function SimpleDateFilter({ title, multiple, value, onChange }: SimpleDateFilterProps) {
  const timestamps = Array.isArray(value) ? value : value ? [value] : [];
  const fromTimestamp = timestamps[0] ? Number(timestamps[0]) : undefined;
  const toTimestamp = timestamps[1] ? Number(timestamps[1]) : undefined;
  const fromDate = fromTimestamp ? new Date(fromTimestamp) : undefined;
  const toDate = toTimestamp ? new Date(toTimestamp) : undefined;

  const [localRange, setLocalRange] = React.useState<DateRange>({ from: undefined, to: undefined });

  React.useEffect(() => {
    if (!multiple) return;
    setLocalRange({ from: fromDate, to: toDate });
  }, [multiple, fromDate?.getTime(), toDate?.getTime()]);

  const hasValue = multiple ? (fromDate || toDate) : fromDate;

  const onReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  const label = multiple
    ? fromDate && toDate
      ? `${formatDate(fromDate)} - ${formatDate(toDate)}`
      : fromDate
        ? formatDate(fromDate)
        : undefined
    : fromDate
      ? formatDate(fromDate)
      : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="border-dashed font-normal">
          {hasValue ? (
            <div role="button" tabIndex={0} className="rounded-sm opacity-70 hover:opacity-100" onClick={onReset}>
              <XCircle />
            </div>
          ) : (
            <CalendarIcon />
          )}
          <span>{title}</span>
          {label && (
            <>
              <Separator orientation="vertical" className="mx-0.5 h-4" />
              <span>{label}</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {multiple ? (
          <Calendar
            autoFocus
            captionLayout="dropdown"
            mode="range"
            selected={localRange}
            onSelect={(range) => {
              // react-day-picker v9 range mode behavior:
              // - First click: {from: clickedDate, to: clickedDate} (same day!)
              // - Second click: {from: newDate, to: newDate} (resets to clicked date)
              // - Proper range: {from: startDate, to: endDate} (different dates)

              if (!range?.from && !range?.to) {
                // User cleared the selection
                onChange(undefined);
                setLocalRange({ from: undefined, to: undefined });
                return;
              }

              const hadFrom = Boolean(localRange.from);
              const hadTo = Boolean(localRange.to);
              const from = range.from?.getTime();
              const to = range.to?.getTime();
              const isSameDay = from != null && to != null && from === to;

              // Case 1: Same day (from === to) - this is DayPicker's way of signaling a single click
              if (isSameDay) {
                if (!hadFrom || hadTo) {
                  // First click OR clicking after a complete range was selected
                  // Just store the from date, don't trigger filter yet
                  setLocalRange({ from: range.from, to: undefined });
                  return;
                }

                // Second click - we had a from but no to
                // Complete the range: use previous from and new clicked date as to
                if (hadFrom && !hadTo && localRange.from) {
                  const prevFrom = localRange.from;
                  const newDate = range.from!;
                  // Ensure from <= to (swap if needed)
                  const [finalFrom, finalTo] = prevFrom <= newDate
                    ? [prevFrom, newDate]
                    : [newDate, prevFrom];
                  setLocalRange({ from: finalFrom, to: finalTo });
                  onChange([
                    finalFrom.getTime().toString(),
                    finalTo.getTime().toString(),
                  ]);
                  return;
                }
              }

              // Case 2: Different days - this is a proper range from DayPicker
              if (from != null && to != null && from !== to) {
                setLocalRange({ from: range.from, to: range.to });
                onChange([
                  range.from!.getTime().toString(),
                  range.to!.getTime().toString(),
                ]);
                return;
              }

              // Case 3: Only from is set (to is undefined) - first click in some edge cases
              if (range.from && !range.to) {
                setLocalRange({ from: range.from, to: undefined });
                return;
              }
            }}
          />
        ) : (
          <Calendar
            captionLayout="dropdown"
            mode="single"
            selected={fromDate}
            onSelect={(date) => onChange(date ? date.getTime().toString() : undefined)}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
