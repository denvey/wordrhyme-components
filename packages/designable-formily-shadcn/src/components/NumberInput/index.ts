import React from 'react';
import { NumberInput as FormilyNumberInput } from '@wordrhyme/formily-shadcn';
import { createBehavior, createResource } from '@wordrhyme/designable-core';
import type { DnFC } from '@wordrhyme/designable-react';
import { createFieldSchema } from '../Field';
import { AllLocales } from '../../locales';
import { AllSchemas } from '../../schemas';

export const NumberInput: DnFC<React.ComponentProps<typeof FormilyNumberInput>> =
  FormilyNumberInput;

NumberInput.Behavior = createBehavior({
  name: 'NumberInput',
  extends: ['Field'],
  selector: (node) => node.props['x-component'] === 'NumberInput',
  designerProps: {
    propsSchema: createFieldSchema(AllSchemas.NumberInput),
  },
  designerLocales: AllLocales.NumberInput,
});

NumberInput.Resource = createResource({
  icon: 'NumberPickerSource',
  elements: [
    {
      componentName: 'Field',
      props: {
        type: 'number',
        title: 'Number',
        'x-decorator': 'FormItem',
        'x-component': 'NumberInput',
      },
    },
  ],
});
