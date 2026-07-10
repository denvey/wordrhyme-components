import { connect, mapProps } from '@formily/react';
import { Switch as ShadcnSwitch, cn } from '@wordrhyme/shadcn';
import type * as React from 'react';

import { setCheckboxDefaultDecoratorProps } from '../utils/formily-decorator';

type CompatibleSwitchProps = React.ComponentProps<typeof ShadcnSwitch> & {
  size?: 'large' | 'small' | 'default' | '';
};

function takeSizeClassName(size: CompatibleSwitchProps['size']) {
  if (size === 'large') return 'scale-110 origin-left';
  if (size === 'small') return 'scale-90 origin-left';
  return undefined;
}

function CompatibleSwitch({ className, size, ...props }: CompatibleSwitchProps) {
  return <ShadcnSwitch {...props} className={cn(takeSizeClassName(size), className)} />;
}

/**
 * Formily-connected Switch component
 * Toggle switch for boolean values
 */
export const Switch: React.ComponentType<CompatibleSwitchProps> = connect(
  CompatibleSwitch,
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
