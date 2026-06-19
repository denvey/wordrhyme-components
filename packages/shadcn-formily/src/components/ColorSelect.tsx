import type { FC } from 'react';
import { connect, mapProps } from '@formily/react';

import { ColorSelect as BaseColorSelect } from '@wordrhyme/shadcn-ui';

export const ColorSelect: FC = connect(
  BaseColorSelect,
  mapProps({
    dataSource: 'options',
  }),
);
