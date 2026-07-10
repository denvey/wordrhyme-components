import React from 'react';
import { Input as FormilyInput, Textarea } from '@wordrhyme/formily-shadcn';
import { createBehavior, createResource } from '@wordrhyme/designable-core';
import type { DnComponent } from '@wordrhyme/designable-react';
import { createFieldSchema } from '../Field';
import { AllLocales } from '../../locales';
import { AllSchemas } from '../../schemas';

type InputComponent = DnComponent<React.ComponentProps<typeof FormilyInput>> & {
  TextArea?: typeof Textarea;
};

export const Input: InputComponent = FormilyInput;

Input.TextArea = Textarea;

Input.Behavior = createBehavior(
  {
    name: 'Input',
    extends: ['Field'],
    selector: (node) => node.props['x-component'] === 'Input',
    designerProps: {
      propsSchema: createFieldSchema(AllSchemas.Input),
    },
    designerLocales: AllLocales.Input,
  },
  {
    name: 'Input.TextArea',
    extends: ['Field'],
    selector: (node) => node.props['x-component'] === 'Input.TextArea',
    designerProps: {
      propsSchema: createFieldSchema(AllSchemas.Input.TextArea),
    },
    designerLocales: AllLocales.TextArea,
  },
);

Input.Resource = createResource(
  {
    icon: 'InputSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          type: 'string',
          title: 'Input',
          'x-decorator': 'FormItem',
          'x-component': 'Input',
        },
      },
    ],
  },
  {
    icon: 'TextAreaSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          type: 'string',
          title: 'TextArea',
          'x-decorator': 'FormItem',
          'x-component': 'Input.TextArea',
        },
      },
    ],
  },
);
