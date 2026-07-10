import type { FC } from 'react';
import { connect, mapProps, useField } from '@formily/react';

import { cn } from '@wordrhyme/shadcn';
import { Select as BaseSelect } from '@wordrhyme/shadcn-ui';

import { resolveFieldOptions } from '../utils/resolve-field-options';

interface SelectProps {
  options?: Array<{ value: string | number; label: string }>;
  mapOption?: (option: { value: string | number; label: string }) => {
    value: string | number;
    label: string;
  };
  [key: string]: any;
}

function takeSizeClassName(size: SelectProps['size']) {
  if (size === 'large') return 'h-10 text-base';
  if (size === 'small') return 'h-8 text-sm';
  return undefined;
}

function isAntdMultipleMode(mode: unknown) {
  return mode === 'multiple' || mode === 'tags';
}

const SelectComponent: FC<SelectProps> = ({ mapOption, options, ...props }) => {
  const field = useField();
  const {
    allowClear,
    bordered = true,
    contentProps,
    dropdownMatchSelectWidth,
    filterOption: _filterOption,
    filterSort: _filterSort,
    labelInValue: _labelInValue,
    listHeight,
    maxTagCount: _maxTagCount,
    maxTagPlaceholder: _maxTagPlaceholder,
    maxTagTextLength: _maxTagTextLength,
    mode,
    notFoundContent,
    showArrow: _showArrow,
    showSearch,
    size,
    virtual: _virtual,
    ...restProps
  } = props;

  const resolvedOptions = resolveFieldOptions({ field, options });
  const transformedOptions = resolvedOptions?.map((option) => {
    const normalizedOption = {
      value: option.value,
      label: typeof option.label === 'string' ? option.label : String(option.value),
    };

    return mapOption ? mapOption(normalizedOption) : normalizedOption;
  });

  const searchable = showSearch === true || isAntdMultipleMode(mode);
  const resolvedMode = searchable
    ? 'searchable'
    : mode === 'searchable'
      ? mode
      : 'simple';
  const matchTriggerWidth = dropdownMatchSelectWidth !== false;
  const resolvedContentProps = {
    ...contentProps,
    style: {
      ...contentProps?.style,
      ...(listHeight != null ? { maxHeight: listHeight } : null),
    },
  };

  return (
    <BaseSelect
      {...restProps}
      className={cn(
        takeSizeClassName(size),
        bordered === false && 'border-transparent shadow-none',
        restProps.className,
      )}
      clearable={restProps.clearable ?? allowClear}
      contentProps={resolvedContentProps}
      emptyText={notFoundContent}
      matchTriggerWidth={matchTriggerWidth}
      mode={resolvedMode}
      multiple={restProps.multiple ?? isAntdMultipleMode(mode)}
      options={transformedOptions}
    />
  );
};

export const Select: FC = connect(
  SelectComponent,
  mapProps({
    dataSource: 'options',
  }),
);
