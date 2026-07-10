import type { Field, GeneralField } from '@formily/core';
import type { ChangeEvent, ClassAttributes, InputHTMLAttributes, ReactNode } from 'react';

import { useFieldSchema } from '@formily/react';
import { cn } from '@wordrhyme/shadcn';

type NumberInputSize =
  | InputHTMLAttributes<HTMLInputElement>['size']
  | 'large'
  | 'middle'
  | 'small'
  | 'default'
  | null;

type NumberInputBaseProps = ClassAttributes<HTMLInputElement> &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'size'> & {
    groupClassName?: string;
    prefix?: ReactNode;
    prefixClassName?: string;
    size?: InputHTMLAttributes<HTMLInputElement>['size'];
    suffix?: ReactNode;
    suffixClassName?: string;
  };

type NumberInputCompatProps = Omit<NumberInputBaseProps, 'size'> & {
  bordered?: boolean;
  decimalSeparator?: string;
  formatter?: (value: number | string | undefined) => string;
  keyboard?: boolean;
  parser?: (value: string) => number | string;
  precision?: number;
  size?: NumberInputSize;
  stringMode?: boolean;
};

function takeSizeClassName(size: NumberInputSize) {
  if (size === 'large') return 'h-10 text-base';
  if (size === 'small') return 'h-8 text-sm';
  return undefined;
}

function normalizeDecimalValue(value: string, decimalSeparator?: string) {
  const nextValue =
    decimalSeparator && decimalSeparator !== '.'
      ? value.replace(decimalSeparator, '.')
      : value;

  return nextValue.includes('.') ? nextValue : nextValue.replace(',', '.');
}

/**
 * Mapper function for NumberInput props
 */
export function mapNumberInputProps(
  props: NumberInputCompatProps,
  inputField: GeneralField,
): NumberInputBaseProps {
  const field = inputField as Field;
  const {
    bordered,
    className,
    decimalSeparator,
    formatter,
    keyboard: _keyboard,
    max: propMax,
    min: propMin,
    onChange,
    parser,
    precision,
    size,
    stringMode,
    type: _type,
    ...inputProps
  } = props;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const schema = useFieldSchema();
  const min = propMin ?? schema?.minimum;
  const max = propMax ?? schema?.maximum;

  const fieldValue = field.value as unknown;
  const rawValue =
    typeof fieldValue === 'number' || typeof fieldValue === 'string' ? fieldValue : '';
  const value =
    formatter && (typeof rawValue === 'number' || rawValue !== '')
      ? formatter(rawValue)
      : rawValue;
  const usesFormattedText =
    formatter != null ||
    parser != null ||
    stringMode === true ||
    (decimalSeparator != null && decimalSeparator !== '.');

  return {
    min,
    max,
    ...inputProps,
    className: cn(
      takeSizeClassName(size),
      bordered === false && 'border-transparent shadow-none focus-visible:ring-0',
      className,
    ),
    inputMode: usesFormattedText ? 'decimal' : inputProps.inputMode,
    type: usesFormattedText ? 'text' : 'number',
    value,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      onChange?.(event);

      const raw = event.target.value.trim();

      if (raw === '') {
        field.onInput(undefined).catch(() => {});
        return;
      }

      // Support decimal comma input (e.g. "0,68") while keeping dot as default.
      const parsed = parser ? parser(raw) : raw;
      const normalized =
        typeof parsed === 'string'
          ? normalizeDecimalValue(parsed, decimalSeparator)
          : parsed;
      const nextValue = Number(normalized);

      // Only commit when we have a valid number; otherwise keep the raw string.
      // This avoids turning temporary input states into NaN.
      if (!Number.isNaN(nextValue)) {
        const rounded =
          typeof precision === 'number'
            ? Number(nextValue.toFixed(precision))
            : nextValue;
        field.onInput(stringMode ? String(rounded) : rounded).catch(() => {});
      } else {
        field.onInput(raw as unknown as number).catch(() => {});
      }
    },
  };
}
