import React from 'react';
import { Separator as ShadcnSeparator } from '@wordrhyme/formily-shadcn';
import { createBehavior, createResource } from '@wordrhyme/designable-core';
import type { DnFC } from '@wordrhyme/designable-react';
import { createVoidFieldSchema } from '../Field';
import { AllLocales } from '../../locales';
import { AllSchemas } from '../../schemas';

export const Separator: DnFC<React.ComponentProps<typeof ShadcnSeparator>> = (props) =>
  React.createElement(ShadcnSeparator, props);

Separator.Behavior = createBehavior({
  name: 'Separator',
  extends: ['Field'],
  selector: (node) => node.props['x-component'] === 'Separator',
  designerProps: {
    propsSchema: createVoidFieldSchema(AllSchemas.Separator),
  },
  designerLocales: AllLocales.Separator,
});

Separator.Resource = createResource({
  icon: 'TextSource',
  elements: [
    {
      componentName: 'Field',
      props: {
        type: 'void',
        'x-component': 'Separator',
      },
    },
  ],
});
