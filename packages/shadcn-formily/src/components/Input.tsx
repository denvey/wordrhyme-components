import type { Field } from '@formily/core';
import type React from 'react';
import { connect, mapProps } from '@formily/react';
import { cn } from '@wordrhyme/shadcn';
import { Input as ShadcnInput } from '@wordrhyme/shadcn-ui';
import { XIcon } from 'lucide-react';
import { Textarea } from './Textarea';

type CompatibleInputProps = React.ComponentProps<typeof ShadcnInput> & {
  addonAfter?: React.ReactNode;
  addonBefore?: React.ReactNode;
  allowClear?: boolean;
  bordered?: boolean;
  size?: 'large' | 'middle' | 'small' | 'default' | null;
};

type InputComponent = React.ComponentType<CompatibleInputProps> & {
  TextArea: typeof Textarea;
};

function takeSizeClassName(size: CompatibleInputProps['size']) {
  if (size === 'large') return 'h-10 text-base';
  if (size === 'small') return 'h-8 text-sm';
  return undefined;
}

function createEmptyChangeEvent() {
  return {
    target: { value: '' },
    currentTarget: { value: '' },
  } as React.ChangeEvent<HTMLInputElement>;
}

function CompatibleInput({
  addonAfter,
  addonBefore,
  allowClear,
  bordered = true,
  className,
  groupClassName,
  onChange,
  prefix,
  size,
  suffix,
  value,
  ...props
}: CompatibleInputProps) {
  const hasValue = value !== undefined && value !== null && String(value).length > 0;
  const resolvedPrefix = prefix ?? addonBefore;
  const resolvedSuffix = (
    <span className="inline-flex items-center gap-1">
      {suffix}
      {addonAfter}
      {allowClear && hasValue ? (
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground inline-flex h-5 w-5 items-center justify-center rounded-sm"
          aria-label="Clear input"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onChange?.(createEmptyChangeEvent())}
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </span>
  );
  const hasSuffix = suffix != null || addonAfter != null || (allowClear && hasValue);
  const inputProps = {
    ...props,
    className,
    groupClassName,
    onChange,
    prefix: resolvedPrefix,
    suffix: hasSuffix ? resolvedSuffix : undefined,
    value,
  } as React.ComponentProps<typeof ShadcnInput>;

  return <ShadcnInput {...inputProps} />;
}

/**
 * Formily-connected Input component
 * Automatically connects shadcn Input to Formily field state
 */
const ConnectedInput = connect(
  CompatibleInput,
  mapProps((props, field) => {
    return {
      ...props,
      className: cn(
        takeSizeClassName((props as CompatibleInputProps).size),
        (props as CompatibleInputProps).bordered === false &&
          'border-transparent shadow-none focus-visible:ring-0',
        props.className,
      ),
      groupClassName: cn(
        takeSizeClassName((props as CompatibleInputProps).size),
        (props as CompatibleInputProps).bordered === false &&
          'border-transparent shadow-none',
        (props as CompatibleInputProps).groupClassName,
      ),
      // eslint-disable-next-line ts/no-unsafe-assignment
      value: (field as Field).value ?? '',
    };
  }),
);

export const Input: InputComponent = Object.assign(ConnectedInput, {
  TextArea: Textarea,
});
