import type { ColorSelectProps } from '@wordrhyme/shadcn-ui';
import type { FC } from 'react';
import { connect, mapProps } from '@formily/react';

import { ColorSelect as BaseColorSelect } from '@wordrhyme/shadcn-ui';

export type { ColorSelectProps } from '@wordrhyme/shadcn-ui';

export const ColorSelect: FC<ColorSelectProps> = connect(
  BaseColorSelect,
  mapProps({
    dataSource: 'options',
  }),
);
