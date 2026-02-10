"use client";

import type { Table } from "@tanstack/react-table";
import { CalendarIcon, Check, ChevronDown, ChevronUp, PlusCircle, X, XCircle } from "lucide-react";
import * as React from "react";
interface DateRange {
  from: Date | undefined;
  to?: Date | undefined;
}

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
    () => table.getAllColumns().filter((col) => col.getCanFilter()),
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

  // 所有带 variant 且未禁用筛选的列，并且满足 modes 配置
  const filterColumns = React.useMemo(
    () => columns.filter((col) => {
      const meta = col.columnDef.meta;
      const enableFilter = col.columnDef.enableColumnFilter !== false;

      // 必须有 variant 且未禁用筛选
      if (!meta?.variant || !enableFilter) {
        return false;
      }

      // 检查 modes 配置：如果配置了 modes，则必须包含 "simple"
      const modes = meta.modes as Array<"simple" | "advanced" | "command"> | undefined;
      if (modes && !modes.includes("simple")) {
        return false;
      }

      return true;
    }),
    [columns]
  );

  // 自动折叠：计算第一行能放多少个项
  const [expanded, setExpanded] = React.useState(false);
  const [visibleCount, setVisibleCount] = React.useState<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // 计算函数：临时显示全部项+按钮，测量第一行能放多少个，然后恢复 hidden
  const calcVisibleCount = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const items = el.querySelectorAll("[data-filter-item]");
    if (items.length === 0) return;

    // 临时移除所有 hidden class 以便测量（包括筛选项和按钮）
    const restoreList: HTMLElement[] = [];
    el.querySelectorAll(".hidden").forEach((node) => {
      const htmlNode = node as HTMLElement;
      htmlNode.classList.remove("hidden");
      restoreList.push(htmlNode);
    });

    // 临时 flex-1 撑满父级，让 flex-wrap 换行生效
    el.style.flex = "1 1 0%";
    void el.offsetHeight; // 强制同步布局

    const firstTop = (items[0] as HTMLElement).offsetTop;
    let count = 0;
    for (const item of Array.from(items)) {
      if ((item as HTMLElement).offsetTop > firstTop) break;
      count++;
    }

    // 预留展开按钮空间：如果有溢出，检查按钮是否还在第一行
    const btn = el.querySelector("[data-filter-toggle]") as HTMLElement | null;
    if (btn && count < items.length && count > 0) {
      if (btn.offsetTop > firstTop) count--;
    }

    // 还原
    el.style.flex = "";
    restoreList.forEach((node) => node.classList.add("hidden"));

    setVisibleCount(count >= items.length ? null : count);
  }, []);

  // 挂载时同步测量（useLayoutEffect 在绘制前执行，避免闪烁）
  React.useLayoutEffect(() => {
    if (!mounted) return;
    calcVisibleCount();
  }, [mounted, filterColumns.length, calcVisibleCount]);

  // 容器尺寸变化时重新计算（覆盖 window resize + 侧边栏折叠等场景）
  // 观察父级容器，避免展开/收起自身尺寸变化导致循环
  // 使用 rAF 节流避免快速 resize 下的 layout thrash
  React.useEffect(() => {
    const parent = containerRef.current?.closest("[data-filter-parent]") as HTMLElement | null;
    if (!mounted || !parent) return;
    let lastWidth = parent.offsetWidth;
    let rafId = 0;
    const ro = new ResizeObserver(() => {
      const newWidth = parent.offsetWidth;
      if (newWidth === lastWidth) return;
      lastWidth = newWidth;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(calcVisibleCount);
    });
    ro.observe(parent);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [mounted, filterColumns.length, calcVisibleCount]);

  if (!mounted) {
    return null;
  }

  return (
    <div ref={containerRef} className="flex flex-wrap items-center gap-2 min-w-0">
      {filterColumns.map((column, index) => {
        const meta = column.columnDef.meta!;
        const value = getFilterValue(column.id);
        const isHidden = !expanded && visibleCount !== null && index >= visibleCount;

        switch (meta.variant) {
          case "text":
            return (
              <div key={column.id} className={isHidden ? "hidden" : ""} data-filter-item>
                <Input
                  placeholder={meta.placeholder ?? meta.label ?? column.id}
                  value={typeof value === "string" ? value : ""}
                  onChange={(e) => updateFilter(column.id, e.target.value || undefined)}
                  className="h-8 w-36 shrink-0"
                />
              </div>
            );

          case "select":
          case "multiSelect":
            return (
              <div key={column.id} className={isHidden ? "hidden" : ""} data-filter-item>
                <SimpleFacetedFilter
                  title={meta.label ?? column.id}
                  options={meta.options ?? []}
                  multiple={meta.variant === "multiSelect"}
                  value={Array.isArray(value) ? value : value ? [value] : []}
                  onChange={(v) => updateFilter(column.id, v.length ? v : undefined)}
                />
              </div>
            );

          case "range":
            return (
              <div key={column.id} className={isHidden ? "hidden" : ""} data-filter-item>
                <SimpleSliderFilter
                  title={meta.label ?? column.id}
                  range={meta.range as [number, number] | undefined}
                  unit={meta.unit}
                  value={Array.isArray(value) ? value.map(Number) as [number, number] : undefined}
                  onChange={(v) => updateFilter(column.id, v ? v.map(String) : undefined)}
                />
              </div>
            );

          case "date":
          case "dateRange":
            return (
              <div key={column.id} className={isHidden ? "hidden" : ""} data-filter-item>
                <SimpleDateFilter
                  title={meta.label ?? column.id}
                  multiple={meta.variant === "dateRange"}
                  value={value}
                  onChange={(v) => updateFilter(column.id, v)}
                />
              </div>
            );

          default:
            return null;
        }
      })}

      {/* 展开/收起按钮 - 始终渲染用于测量占位，不需要时隐藏 */}
      <Button
        data-filter-toggle
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground",
          visibleCount === null && "hidden"
        )}
        onClick={() => setExpanded((prev) => !prev)}
        aria-label={expanded ? "收起筛选" : "展开更多筛选"}
        aria-expanded={expanded}
      >
        {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </Button>

      {hasFilters && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-dashed shrink-0"
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
