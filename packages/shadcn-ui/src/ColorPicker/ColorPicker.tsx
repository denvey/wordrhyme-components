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
    id,
    ...rest
  } = props;

  return (
    <ColorPickerBase id={id} {...rest}>
      {variant === 'input' ? (
        <ColorPickerInput id={id} placeholder={placeholder} resetOptions={resetOptions} />
      ) : (
        <ColorPickerButton
          id={id}
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
