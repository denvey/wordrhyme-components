import type React from 'react';
import { connect, mapProps } from '@formily/react';
import { Input } from '@wordrhyme/shadcn-ui';

import { mapNumberInputProps } from './number-input-map-props';

type NumberInputProps = React.ComponentProps<typeof Input> & {
  bordered?: boolean;
  decimalSeparator?: string;
  formatter?: (value: number | string | undefined) => string;
  keyboard?: boolean;
  parser?: (value: string) => number | string;
  precision?: number;
  stringMode?: boolean;
};

function NumberInputBase({
  bordered: _bordered,
  decimalSeparator: _decimalSeparator,
  formatter: _formatter,
  keyboard: _keyboard,
  parser: _parser,
  precision: _precision,
  stringMode: _stringMode,
  ...props
}: NumberInputProps) {
  return <Input {...props} />;
}

/**
 * Formily-connected Number Input component
 */
export const NumberInput = connect(NumberInputBase, mapProps(mapNumberInputProps));
