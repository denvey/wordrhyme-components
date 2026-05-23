'use client';

import type {
  ColorPickerBaseProps,
  ColorPickerResetOptions,
} from '../ColorPickerBase/types';

import { ColorPickerBase, ColorPickerButton, ColorPickerInput } from '../ColorPickerBase';

export interface ColorPickerProps extends Omit<ColorPickerBaseProps, 'children'> {
  variant?: 'button' | 'input';
  placeholder?: string;
  formatDisplayValue?: (value: string) => React.ReactNode;
  resetOptions?: ColorPickerResetOptions;
}

const ColorPicker: React.FC<ColorPickerProps> = (props) => {
  const {
    variant = 'input',
    formatDisplayValue,
    placeholder,
    resetOptions,
    ...rest
  } = props;

  return (
    <ColorPickerBase {...rest}>
      {variant === 'input' ? (
        <ColorPickerInput placeholder={placeholder} resetOptions={resetOptions} />
      ) : (
        <ColorPickerButton
          placeholder={placeholder}
          formatDisplayValue={formatDisplayValue}
          resetOptions={resetOptions}
        />
      )}
    </ColorPickerBase>
  );
};

ColorPicker.displayName = 'ColorPicker';

export { ColorPicker };
