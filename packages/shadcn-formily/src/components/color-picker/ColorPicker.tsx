import type { ColorPickerProps } from '@wordrhyme/shadcn-ui';
import { connect, mapProps } from '@formily/react';
import { ColorPicker as MainColorPicker } from '@wordrhyme/shadcn-ui';

const ColorPickerBase: React.FC<ColorPickerProps> = (props) => {
  return <MainColorPicker {...props} />;
};

export const ColorPicker = connect(
  ColorPickerBase,
  mapProps(
    {
      onInput: 'onValueChange',
    },
    (props) => {
      return props;
    },
  ),
);
