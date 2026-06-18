import type {
  ColorPickerContent as BaseColorPickerContent,
  ColorPickerSwatch as BaseColorPickerSwatch,
  Button,
  ColorPickerProps,
} from '@pixpilot/shadcn';
import type { ComponentProps, ReactNode } from 'react';

export interface PresetColor {
  label: string;
  value: string;
}

export type ColorPickerBaseSection = 'swatch' | 'picker' | 'format-select' | 'input';

export type ColorPickerBaseSections = ReadonlyArray<ColorPickerBaseSection>;

export interface ColorPickerContentWrapperProps extends React.ComponentProps<
  typeof BaseColorPickerContent
> {
  width?: number | string;
}

export type ColorPickerContentProps = Required<
  Pick<ColorPickerBaseProps, 'onValueChange' | 'presetColors' | 'sections'>
> & {
  id?: string;
  currentValue: string;
  contentProps?: Partial<ColorPickerContentWrapperProps>;
};

export interface ColorPickerRootProps extends Omit<ColorPickerProps, 'onChange'> {
  // options?: ColorPikerOptions;
  value?: string;
  onChange?: (value: string) => void;
}

export interface ColorPickerBaseProps extends Omit<
  ColorPickerProps,
  'onChange' | 'children'
> {
  // options?: ColorPikerOptions;
  value?: string;
  onChange?: (value: string) => void;
  presetColors?: PresetColor[];
  layout?: 'full' | 'compact';
  /**
   * Controls which UI sections render in the picker content.
   * Defaults to all sections: ['swatch', 'picker', 'format-select', 'input'].
   */
  sections?: ColorPickerBaseSections;
  contentProps?: Partial<ColorPickerContentWrapperProps>;
  children:
    | React.ReactNode
    | ((props: {
        value?: string;
        onValueChange: (value: string) => void;
        isPickerOpen: boolean;
        id?: string;
      }) => React.ReactNode);
}

export interface ColorPickerResetOptions {
  value: string;
  label?: string;
  icon?: ReactNode;
  tooltip?: string;
  swatchColor?: string;
}

export interface ColorPickerSlots {
  swatch?: ComponentProps<typeof BaseColorPickerSwatch>;
  clearButton?: ComponentProps<typeof Button>;
}
