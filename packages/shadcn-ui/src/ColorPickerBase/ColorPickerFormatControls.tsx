import { cn, ColorPickerFormatSelect } from '@wordrhyme/shadcn';
import React from 'react';
import { getId } from '../utils';
import { ColorPickerFormatInput } from './ColorPickerFormatInput';

export interface ColorPickerFormatControlsProps extends React.ComponentProps<'div'> {
  showFormatSelect?: boolean;
  showInput?: boolean;
}

const ColorPickerFormatControls: React.FC<ColorPickerFormatControlsProps> = (props) => {
  const { showFormatSelect = true, showInput = true, id, ...rest } = props;

  return (
    <div {...rest} className={cn('flex items-center gap-2 w-full', rest.className)}>
      {showFormatSelect && <ColorPickerFormatSelect />}
      {showInput && <ColorPickerFormatInput id={getId(id, 'format-input')} />}
    </div>
  );
};

ColorPickerFormatControls.displayName = 'ColorPickerFormatControls';

export { ColorPickerFormatControls, ColorPickerFormatInput, ColorPickerFormatSelect };
