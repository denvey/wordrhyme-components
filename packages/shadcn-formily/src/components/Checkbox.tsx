import { connect, mapProps } from '@formily/react';
import { Checkbox as ShadcnCheckbox } from '@wordrhyme/shadcn';
import type * as React from 'react';

import { setCheckboxDefaultDecoratorProps } from '../utils/formily-decorator';

/**
 * Formily-connected Checkbox component
 * Maps Formily field checked state to shadcn Checkbox
 */
export const Checkbox: React.ComponentType<
  React.ComponentProps<typeof ShadcnCheckbox>
> = connect(
  ShadcnCheckbox,
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
