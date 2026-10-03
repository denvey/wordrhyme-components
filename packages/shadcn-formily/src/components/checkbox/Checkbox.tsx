import type { ComponentProps, FC } from 'react';
import { connect, mapProps } from '@formily/react';
import { Checkbox as ShadcnCheckbox, cn } from '@wordrhyme/shadcn';
import type * as React from 'react';

import { setCheckboxDefaultDecoratorProps } from '../../utils/formily-decorator';

export type CheckboxProps = ComponentProps<typeof ShadcnCheckbox> & {
  label?: React.ReactNode;
  size?: 'large' | 'small' | 'default' | null;
};

type CompatibleCheckboxProps = CheckboxProps;

function takeSizeClassName(size: CompatibleCheckboxProps['size']) {
  if (size === 'large') return 'size-5';
  if (size === 'small') return 'size-3.5';
  return undefined;
}

function CompatibleCheckbox({
  className,
  label,
  size,
  ...props
}: CompatibleCheckboxProps) {
  const checkbox = (
    <ShadcnCheckbox {...props} className={cn(takeSizeClassName(size), className)} />
  );

  if (label == null) return checkbox;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-sm leading-none',
        props.disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {checkbox}
      <span>{label}</span>
    </span>
  );
}

/**
 * Formily-connected Checkbox component
 * Maps Formily field checked state to shadcn Checkbox
 */
export const Checkbox: FC<CheckboxProps> = connect(
  CompatibleCheckbox,
  mapProps(
    {
      value: 'checked',
      onInput: 'onCheckedChange',
    },
    (props, field) => {
      setCheckboxDefaultDecoratorProps(field);

      return props;
    },
  ),
);
