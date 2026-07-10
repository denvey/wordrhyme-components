import React from 'react';
import { Column as ShadcnColumn } from '@wordrhyme/formily-shadcn';
import { createBehavior, createResource } from '@wordrhyme/designable-core';
import type { DnFC } from '@wordrhyme/designable-react';
import { createVoidFieldSchema } from '../Field';
import { AllLocales } from '../../locales';
import { AllSchemas } from '../../schemas';
import { withContainer } from '../../common/Container';

export const Column: DnFC<React.ComponentProps<typeof ShadcnColumn>> =
  withContainer(ShadcnColumn);

Column.Behavior = createBehavior({
  name: 'Column',
  extends: ['Field'],
  selector: (node) => node.props['x-component'] === 'Column',
  designerProps: {
    droppable: true,
    propsSchema: createVoidFieldSchema(AllSchemas.Column),
  },
  designerLocales: AllLocales.Column,
});

Column.Resource = createResource({
  icon: 'GridSource',
  elements: [
    {
      componentName: 'Field',
      props: {
        type: 'void',
        'x-component': 'Column',
        'x-component-props': {
          className: 'flex-1',
        },
      },
    },
  ],
});
