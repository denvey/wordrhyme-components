import React from 'react';
import { ObjectContainer as FormilyObjectContainer } from '@wordrhyme/formily-shadcn';
import { createBehavior, createResource } from '@wordrhyme/designable-core';
import type { DnFC } from '@wordrhyme/designable-react';
import { createVoidFieldSchema } from '../Field';
import { AllLocales } from '../../locales';
import { AllSchemas } from '../../schemas';
import { withContainer } from '../../common/Container';

export const ObjectContainer: DnFC<React.ComponentProps<typeof FormilyObjectContainer>> =
  withContainer(FormilyObjectContainer);

ObjectContainer.Behavior = createBehavior({
  name: 'ObjectContainer',
  extends: ['Field'],
  selector: (node) => node.props['x-component'] === 'ObjectContainer',
  designerProps: {
    droppable: true,
    propsSchema: createVoidFieldSchema(AllSchemas.ObjectContainer),
  },
  designerLocales: AllLocales.ObjectContainer,
});

ObjectContainer.Resource = createResource({
  icon: 'ObjectSource',
  elements: [
    {
      componentName: 'Field',
      props: {
        type: 'object',
        title: 'Object',
        'x-component': 'ObjectContainer',
        'x-component-props': {
          label: 'Object',
          variant: 'grouped',
        },
      },
    },
  ],
});
