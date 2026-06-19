import { connect, mapProps } from '@formily/react';
import { Switch as ShadcnSwitch } from '@wordrhyme/shadcn';
import type * as React from 'react';

import { setCheckboxDefaultDecoratorProps } from '../utils/formily-decorator';

/**
 * Formily-connected Switch component
 * Toggle switch for boolean values
 */
export const Switch: React.ComponentType<
  React.ComponentProps<typeof ShadcnSwitch>
> = connect(
  ShadcnSwitch,
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
