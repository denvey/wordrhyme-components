import React from 'react';
import { Row as ShadcnRow } from '@wordrhyme/formily-shadcn';
import { createBehavior, createResource } from '@wordrhyme/designable-core';
import type { DnFC } from '@wordrhyme/designable-react';
import { createVoidFieldSchema } from '../Field';
import { AllLocales } from '../../locales';
import { AllSchemas } from '../../schemas';
import { withContainer } from '../../common/Container';

export const Row: DnFC<React.ComponentProps<typeof ShadcnRow>> = withContainer(ShadcnRow);

Row.Behavior = createBehavior({
  name: 'Row',
  extends: ['Field'],
  selector: (node) => node.props['x-component'] === 'Row',
  designerProps: {
    droppable: true,
    inlineChildrenLayout: true,
    propsSchema: createVoidFieldSchema(AllSchemas.Row),
  },
  designerLocales: AllLocales.Row,
});

Row.Resource = createResource({
  icon: 'GridSource',
  elements: [
    {
      componentName: 'Field',
      props: {
        type: 'void',
        'x-component': 'Row',
        'x-component-props': {
          className: 'gap-4',
        },
      },
    },
  ],
});
