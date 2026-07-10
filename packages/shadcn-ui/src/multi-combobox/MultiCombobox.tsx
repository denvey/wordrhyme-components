'use client';

import type { ComponentProps, ReactNode } from 'react';
import * as React from 'react';
import {
  Badge,
  Button,
  cn,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@wordrhyme/shadcn';
import { Check, ChevronsUpDown, X } from 'lucide-react';

export interface MultiComboboxOption {
  value: string;
  label: ReactNode;
  searchText?: string | string[];
  keywords?: string[];
  count?: number;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface MultiComboboxTriggerRenderProps {
  open: boolean;
  selectedOptions: MultiComboboxOption[];
  selectedValues: string[];
  clearSelection: (event?: React.MouseEvent) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

export interface MultiComboboxProps extends Omit<
  ComponentProps<typeof Command>,
  'value' | 'defaultValue' | 'onChange' | 'onValueChange'
> {
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  options?: MultiComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  defaultSearchValue?: string;
  onSearch?: (value: string) => void;
  emptyText?: string;
  clearText?: string;
  hasMore?: boolean;
  loadMoreText?: string;
  loading?: boolean;
  loadingText?: string;
  onPopupScroll?: React.UIEventHandler<HTMLElement>;
  selectedText?: string;
  selectionMode?: 'single' | 'multiple';
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  contentClassName?: string;
  triggerClassName?: string;
  matchTriggerWidth?: boolean;
  renderTrigger?: (props: MultiComboboxTriggerRenderProps) => ReactNode;
}

const DEFAULT_OPTIONS: MultiComboboxOption[] = [];

function collectSearchText(...parts: unknown[]) {
  const texts: string[] = [];

  for (const part of parts) {
    if (!part) {
      continue;
    }

    if (Array.isArray(part)) {
      texts.push(...part.map(String));
    } else if (typeof part === 'object') {
      texts.push(
        ...Object.values(part as Record<string, unknown>)
          .filter(Boolean)
          .map(String),
      );
    } else {
      texts.push(String(part));
    }
  }

  return texts.join(' ');
}

function getOptionKeywords(option: MultiComboboxOption) {
  const labelText =
    typeof option.label === 'string' || typeof option.label === 'number'
      ? option.label
      : undefined;

  return collectSearchText(labelText, option.searchText, option.keywords)
    .split(/\s+/)
    .filter(Boolean);
}

function getOptionText(option: MultiComboboxOption) {
  if (typeof option.label === 'string' || typeof option.label === 'number') {
    return String(option.label);
  }

  return option.value;
}

function createNextValue(
  currentValue: string[],
  optionValue: string,
  isSelected: boolean,
  selectionMode: 'single' | 'multiple',
) {
  if (selectionMode === 'single') {
    return isSelected ? [] : [optionValue];
  }

  return isSelected
    ? currentValue.filter((value) => value !== optionValue)
    : [...currentValue, optionValue];
}

function DefaultMultiComboboxTrigger({
  open,
  selectedOptions,
  selectedValues,
  clearSelection,
  disabled,
  readOnly,
  placeholder,
  selectedText,
  className,
  ...buttonProps
}: MultiComboboxTriggerRenderProps & {
  placeholder: string;
  selectedText: string;
  className?: string;
} & Omit<ComponentProps<typeof Button>, 'children' | 'disabled'>) {
  return (
    <Button
      {...buttonProps}
      type="button"
      variant="outline"
      role="combobox"
      aria-expanded={open}
      disabled={disabled}
      className={cn('w-full justify-between', className)}
    >
      <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
        {selectedValues.length === 0 ? (
          <span className="truncate text-muted-foreground">{placeholder}</span>
        ) : selectedOptions.length <= 2 ? (
          selectedOptions.map((option) => (
            <Badge
              key={option.value}
              variant="secondary"
              className="max-w-[8rem] rounded-sm px-1 font-normal"
            >
              <span className="truncate">{option.label}</span>
            </Badge>
          ))
        ) : (
          <Badge variant="secondary" className="rounded-sm px-1 font-normal">
            {selectedValues.length} {selectedText}
          </Badge>
        )}
      </span>
      <span className="ml-2 flex shrink-0 items-center gap-1">
        {selectedValues.length > 0 && !readOnly && (
          <span
            role="button"
            aria-label="Clear selection"
            tabIndex={0}
            className="rounded-sm px-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onClick={clearSelection}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                clearSelection(event as unknown as React.MouseEvent);
              }
            }}
          >
            <X className="size-3" />
          </span>
        )}
        <ChevronsUpDown className="h-4 w-4 opacity-50" />
      </span>
    </Button>
  );
}

const MultiCombobox: React.FC<MultiComboboxProps> = ({
  value,
  defaultValue,
  onChange,
  options = DEFAULT_OPTIONS,
  placeholder = 'Select options...',
  searchPlaceholder = 'Search...',
  searchValue,
  defaultSearchValue = '',
  onSearch,
  emptyText = 'No options found.',
  clearText = 'Clear selection',
  hasMore = false,
  loadMoreText = 'Load more',
  loading = false,
  loadingText = 'Loading...',
  onPopupScroll,
  selectedText = 'selected',
  selectionMode = 'multiple',
  disabled,
  readOnly,
  className,
  contentClassName,
  triggerClassName,
  matchTriggerWidth = true,
  renderTrigger,
  filter,
  ...commandProps
}) => {
  const [open, setOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? []);
  const [internalSearchValue, setInternalSearchValue] =
    React.useState(defaultSearchValue);
  const [popoverContainer, setPopoverContainer] = React.useState<HTMLDivElement | null>(
    null,
  );
  const [useLocalPopoverContainer, setUseLocalPopoverContainer] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const selectedValues = value ?? internalValue;
  const currentSearchValue = searchValue ?? internalSearchValue;
  const selectedValueSet = React.useMemo(() => new Set(selectedValues), [selectedValues]);
  const selectedOptions = React.useMemo(
    () => options.filter((option) => selectedValueSet.has(option.value)),
    [options, selectedValueSet],
  );

  const commitChange = React.useCallback(
    (nextValue: string[]) => {
      if (value === undefined) {
        setInternalValue(nextValue);
      }

      onChange?.(nextValue);
    },
    [onChange, value],
  );

  const clearSelection = React.useCallback(
    (event?: React.MouseEvent) => {
      event?.preventDefault();
      event?.stopPropagation();

      if (readOnly) {
        return;
      }

      commitChange([]);
    },
    [commitChange, readOnly],
  );

  const handleSearchChange = React.useCallback(
    (nextValue: string) => {
      if (searchValue === undefined) {
        setInternalSearchValue(nextValue);
      }

      onSearch?.(nextValue);
    },
    [onSearch, searchValue],
  );

  const handleOptionsScroll = React.useCallback(
    (event: React.UIEvent<HTMLElement>) => {
      onPopupScroll?.(event);
    },
    [onPopupScroll],
  );

  React.useEffect(() => {
    setUseLocalPopoverContainer(
      Boolean(
        rootRef.current?.closest(
          '[data-slot="dialog-content"], [data-slot="sheet-content"]',
        ),
      ),
    );
  }, []);

  const onItemSelect = React.useCallback(
    (option: MultiComboboxOption) => {
      if (option.disabled || readOnly) {
        return;
      }

      const isSelected = selectedValueSet.has(option.value);
      const nextValue = createNextValue(
        selectedValues,
        option.value,
        isSelected,
        selectionMode,
      );

      commitChange(nextValue);

      if (selectionMode === 'single') {
        setOpen(false);
      }
    },
    [commitChange, readOnly, selectedValues, selectedValueSet, selectionMode],
  );

  const trigger = renderTrigger ? (
    renderTrigger({
      open,
      selectedOptions,
      selectedValues,
      clearSelection,
      disabled,
      readOnly,
    })
  ) : (
    <DefaultMultiComboboxTrigger
      open={open}
      selectedOptions={selectedOptions}
      selectedValues={selectedValues}
      clearSelection={clearSelection}
      disabled={disabled}
      readOnly={readOnly}
      placeholder={placeholder}
      selectedText={selectedText}
      className={triggerClassName}
    />
  );

  return (
    <div ref={rootRef} className="contents">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <div ref={setPopoverContainer} className="contents" />
        <PopoverContent
          container={useLocalPopoverContainer ? popoverContainer : undefined}
          className={cn('w-full p-0', contentClassName)}
          style={
            matchTriggerWidth
              ? { width: 'var(--radix-popover-trigger-width)' }
              : undefined
          }
        >
          <Command className={className} filter={filter} {...commandProps}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={currentSearchValue}
              onValueChange={handleSearchChange}
            />
            <CommandList className="max-h-none overflow-visible">
              <div
                data-multi-combobox-viewport=""
                className="max-h-[300px] overflow-x-hidden overflow-y-auto overscroll-contain"
                onScroll={handleOptionsScroll}
              >
                <CommandEmpty>{emptyText}</CommandEmpty>
                <CommandGroup className="scroll-py-1">
                  {options.map((option) => {
                    const isSelected = selectedValueSet.has(option.value);
                    const Icon = option.icon;
                    const isMultiple = selectionMode === 'multiple';

                    return (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        keywords={getOptionKeywords(option)}
                        disabled={option.disabled}
                        className={cn(
                          selectionMode === 'single' &&
                            isSelected &&
                            'bg-accent text-accent-foreground',
                        )}
                        onSelect={() => onItemSelect(option)}
                      >
                        {isMultiple && (
                          <div
                            className={cn(
                              'flex size-4 items-center justify-center rounded-sm border border-primary',
                              isSelected
                                ? 'bg-primary text-primary-foreground'
                                : 'opacity-50',
                            )}
                          >
                            <Check
                              className={cn(
                                'size-4',
                                isSelected ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                          </div>
                        )}
                        {Icon && <Icon className="size-4" />}
                        <span className="truncate">{getOptionText(option)}</span>
                        {option.count !== undefined && (
                          <span className="ml-auto font-mono text-xs">
                            {option.count}
                          </span>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
                {loading ? (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <div
                        role="status"
                        aria-live="polite"
                        className="py-2 text-center text-sm text-muted-foreground"
                      >
                        {loadingText}
                      </div>
                    </CommandGroup>
                  </>
                ) : hasMore ? (
                  <div role="status" aria-live="polite" className="sr-only">
                    {loadMoreText}
                  </div>
                ) : null}
                {selectedValues.length > 0 && !readOnly && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => commitChange([])}
                        className="justify-center text-center"
                      >
                        {clearText}
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </div>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

MultiCombobox.displayName = 'MultiCombobox';

export { MultiCombobox };
