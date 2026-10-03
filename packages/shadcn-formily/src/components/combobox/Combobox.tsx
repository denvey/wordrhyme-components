'use client';

import type { ComboboxProps } from '@wordrhyme/shadcn-ui';
import type { FC } from 'react';
import { connect, mapProps } from '@formily/react';

import { Combobox as BaseCombobox } from '@wordrhyme/shadcn-ui';

export type { ComboboxProps } from '@wordrhyme/shadcn-ui';

export const Combobox: FC<ComboboxProps> = connect(
  BaseCombobox,
  mapProps({
    dataSource: 'options',
  }),
);
