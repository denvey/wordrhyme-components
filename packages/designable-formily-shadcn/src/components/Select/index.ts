import React from 'react';
import { Select as FormilySelect } from '@wordrhyme/formily-shadcn';
import { createBehavior, createResource } from '@wordrhyme/designable-core';
import type { DnFC } from '@wordrhyme/designable-react';
import { createFieldSchema } from '../Field';
import { AllLocales } from '../../locales';
import { AllSchemas } from '../../schemas';

export const Select: DnFC<React.ComponentProps<typeof FormilySelect>> = FormilySelect;

Select.Behavior = createBehavior({
  name: 'Select',
  extends: ['Field'],
  selector: (node) => node.props['x-component'] === 'Select',
  designerProps: {
    propsSchema: createFieldSchema(AllSchemas.Select),
  },
  designerLocales: AllLocales.Select,
});

Select.Resource = createResource({
  icon: 'SelectSource',
  elements: [
    {
      componentName: 'Field',
      props: {
        title: 'Select',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: 'Option 1', value: 'option-1' },
          { label: 'Option 2', value: 'option-2' },
        ],
      },
    },
  ],
});
