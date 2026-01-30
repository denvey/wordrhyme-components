import { connect, mapProps } from '@formily/react';
import { Switch as ShadcnSwitch } from '@pixpilot/shadcn';
import type * as React from 'react';

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
      // eslint-disable-next-line no-param-reassign
      field.decoratorProps.labelPlacement = 'end';
      return props;
    },
  ),
);
