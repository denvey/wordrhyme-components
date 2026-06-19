import type { ComponentProps, ReactNode } from 'react';

import {
  cn,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Select as ShadcnSelect,
} from '@wordrhyme/shadcn';
import { XIcon } from 'lucide-react';
import React from 'react';

import { useSelectKeyboard } from './hooks/use-select-keyboard';
import {
  MultiCombobox,
  type MultiComboboxOption,
  type MultiComboboxProps,
  type MultiComboboxTriggerRenderProps,
} from './multi-combobox';
import { getId } from './utils';

export interface SelectOption {
  value: string | number;
  label: ReactNode;
  searchText?: string | string[];
  keywords?: string[];
  count?: number;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export type SelectContentProps = React.ComponentProps<typeof SelectContent>;
export type SelectMode = 'simple' | 'searchable';
export type SelectTriggerRenderProps = MultiComboboxTriggerRenderProps;

export type SelectSimpleProps = {
  /**
   * Array of options to display in the select dropdown
   */
  options?: SelectOption[];
  mode?: 'simple';
  /**
   * Additional props to pass to the SelectContent component
   */
  contentProps?: SelectContentProps;
  /**
   * The currently selected value
   */
  value?: string;
  /**
   * Callback function called when the selected value changes
   */
  onChange?: (value: string) => void;
  /**
   * Placeholder text to display when no value is selected
   */
  placeholder?: string;
  /**
   * Keyboard navigation mode
   * - "cycle": Cycles through options with arrow keys
   * - "dropdown": Opens dropdown on arrow keys
   */
  keyboardMode?: 'cycle' | 'dropdown';
  /**
   * Controls how the dropdown is positioned
   * - "item-aligned": Aligns with the trigger button
   * - "popper": Uses floating-ui positioning
   */
  position?: SelectContentProps['position'];
  /**
   * Whether to show a clear button when a value is selected
   */
  clearable?: boolean;

  id?: string;
  disabled?: boolean;
  name?: string;
  required?: boolean;
  className?: string;
} & Omit<
  ComponentProps<typeof ShadcnSelect>,
  'value' | 'onValueChange' | 'children' | 'disabled' | 'name' | 'required'
>;

type SelectSearchableCommonProps = Omit<
  MultiComboboxProps,
  'defaultValue' | 'onChange' | 'options' | 'selectionMode' | 'value'
> & {
  mode: 'searchable';
  options?: SelectOption[];
};

export type SelectSearchableSingleProps = SelectSearchableCommonProps & {
  multiple?: false;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
};

export type SelectSearchableMultipleProps = SelectSearchableCommonProps & {
  multiple: true;
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
};

export type SelectSearchableDynamicProps = SelectSearchableCommonProps & {
  multiple: boolean;
  value?: string | string[];
  defaultValue?: string | string[];
  onChange?: (value: string | string[]) => void;
};

export type SelectSearchableProps =
  | SelectSearchableSingleProps
  | SelectSearchableMultipleProps
  | SelectSearchableDynamicProps;

export type SelectProps = SelectSimpleProps | SelectSearchableProps;

function normalizeSearchableOptions(
  options: SelectOption[] | undefined,
): MultiComboboxOption[] | undefined {
  return options?.map((option) => ({
    ...option,
    value: String(option.value),
  }));
}

function toSingleValueArray(value: string | undefined) {
  return value ? [value] : [];
}

function getSingleSearchableValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function getMultipleSearchableValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function splitMode<T extends { mode?: SelectMode }>(props: T) {
  const { mode, ...rest } = props;
  return { mode, rest };
}

function SearchableSelect(props: SelectSearchableProps) {
  const { rest: searchableProps } = splitMode(props);
  const {
    multiple = false,
    options,
    value,
    defaultValue,
    onChange,
    ...comboboxProps
  } = searchableProps;
  const normalizedOptions = React.useMemo(
    () => normalizeSearchableOptions(options),
    [options],
  );

  if (multiple) {
    const handleChange = onChange as ((value: string[]) => void) | undefined;

    return (
      <MultiCombobox
        {...comboboxProps}
        value={value === undefined ? undefined : getMultipleSearchableValue(value)}
        defaultValue={
          defaultValue === undefined
            ? undefined
            : getMultipleSearchableValue(defaultValue)
        }
        onChange={(nextValue) => {
          handleChange?.(nextValue);
        }}
        options={normalizedOptions}
        selectionMode="multiple"
      />
    );
  }

  const handleChange = onChange as ((value: string) => void) | undefined;

  return (
    <MultiCombobox
      {...comboboxProps}
      value={
        value === undefined
          ? undefined
          : toSingleValueArray(getSingleSearchableValue(value))
      }
      defaultValue={
        defaultValue === undefined
          ? undefined
          : toSingleValueArray(getSingleSearchableValue(defaultValue))
      }
      onChange={(nextValue) => {
        handleChange?.(nextValue[0] ?? '');
      }}
      options={normalizedOptions}
      selectionMode="single"
    />
  );
}

function SimpleSelect(props: SelectSimpleProps) {
  const { rest: simpleProps } = splitMode(props);
  const {
    options,
    value = '',
    onChange,
    placeholder,
    contentProps,
    keyboardMode = 'dropdown',
    open: openProp,
    onOpenChange: onOpenChangeProp,
    position,
    clearable = false,
    disabled,
    className,
    id,
    ...restProps
  } = simpleProps;

  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = openProp ?? uncontrolledOpen;

  const handleOpenChange = (nextOpen: boolean) => {
    if (openProp === undefined) {
      setUncontrolledOpen(nextOpen);
    }

    onOpenChangeProp?.(nextOpen);
  };

  const { handleTriggerKeyDown } = useSelectKeyboard({
    options,
    value,
    onChange,
    keyboardMode,
    open,
    getValue: (option) => String(option.value),
  });

  return (
    <ShadcnSelect
      {...restProps}
      value={value}
      open={open}
      onValueChange={onChange}
      onOpenChange={handleOpenChange}
    >
      <div className="relative w-full">
        <SelectTrigger
          id={id}
          className={cn('w-full', className)}
          onKeyDown={handleTriggerKeyDown}
          disabled={disabled}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>

        {clearable && value !== '' && (
          <button
            id={getId(id, 'clear-button')}
            type="button"
            className="absolute right-8 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-sm opacity-40 hover:opacity-100 z-10"
            onClick={(e) => {
              e.preventDefault();
              onChange?.('');
              handleOpenChange(false);
            }}
            aria-label="Clear selection"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <SelectContent position={position} {...contentProps}>
        {options?.map((option) => (
          <SelectItem
            key={option.value}
            id={getId(id, `option-${option.value}`)}
            value={String(option.value)}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </ShadcnSelect>
  );
}

function Select(props: SelectProps) {
  if (props.mode === 'searchable') {
    return <SearchableSelect {...props} />;
  }

  return <SimpleSelect {...props} />;
}

export { Select };
