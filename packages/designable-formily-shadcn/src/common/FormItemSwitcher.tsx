import React from 'react';
import { Switch } from '@wordrhyme/shadcn';

export interface FormItemSwitcherProps {
  value?: string;
  onChange?: (value?: string) => void;
}

export const FormItemSwitcher: React.FC<FormItemSwitcherProps> = ({
  onChange,
  value,
}) => {
  return (
    <Switch
      checked={value === 'FormItem'}
      onCheckedChange={(checked) => {
        onChange?.(checked ? 'FormItem' : undefined);
      }}
    />
  );
};
