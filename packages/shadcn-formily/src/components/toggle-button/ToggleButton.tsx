import type { ToggleButtonProps } from '@wordrhyme/shadcn-ui';
import type { FC } from 'react';
import { connect, mapProps } from '@formily/react';
import { ToggleButton as ShadcnToggleButton } from '@wordrhyme/shadcn-ui';

import { setCheckboxDefaultDecoratorProps } from '../../utils/formily-decorator';

export type { ToggleButtonProps } from '@wordrhyme/shadcn-ui';

/**
 * Formily-connected IconToggle component
 * Toggle button with customizable icons for boolean values
 */
export const ToggleButton: FC<ToggleButtonProps> = connect(
  ShadcnToggleButton,
  mapProps(
    {
      value: 'checked',
      onInput: 'onChange',
    },
    (props, field) => {
      setCheckboxDefaultDecoratorProps(field);

      return props;
    },
  ),
);
