import type { IconToggleProps } from '@wordrhyme/shadcn-ui';
import type { FC } from 'react';
import { connect, mapProps } from '@formily/react';
import { IconToggle as ShadcnIconToggle } from '@wordrhyme/shadcn-ui';

import { setCheckboxDefaultDecoratorProps } from '../../utils/formily-decorator';

export type { IconToggleProps } from '@wordrhyme/shadcn-ui';

/**
 * Formily-connected IconToggle component
 * Toggle button with customizable icons for boolean values
 */
export const IconToggle: FC<IconToggleProps> = connect(
  ShadcnIconToggle,
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
