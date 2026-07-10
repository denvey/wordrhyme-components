import React from 'react';
import { Checkbox as FormilyCheckbox } from '@wordrhyme/formily-shadcn';
import { createBehavior, createResource } from '@wordrhyme/designable-core';
import type { DnFC } from '@wordrhyme/designable-react';
import { createFieldSchema } from '../Field';
import { AllLocales } from '../../locales';
import { AllSchemas } from '../../schemas';

export const Checkbox: DnFC<React.ComponentProps<typeof FormilyCheckbox>> = (props) =>
  React.createElement(FormilyCheckbox, props);

Checkbox.Behavior = createBehavior({
  name: 'Checkbox',
  extends: ['Field'],
  selector: (node) => node.props['x-component'] === 'Checkbox',
  designerProps: {
    propsSchema: createFieldSchema(AllSchemas.Checkbox),
  },
  designerLocales: AllLocales.Checkbox,
});

Checkbox.Resource = createResource({
  icon: 'CheckboxGroupSource',
  elements: [
    {
      componentName: 'Field',
      props: {
        type: 'boolean',
        title: 'Checkbox',
        'x-decorator': 'FormItem',
        'x-component': 'Checkbox',
        'x-component-props': {
          label: 'Checkbox',
        },
      },
    },
  ],
});
