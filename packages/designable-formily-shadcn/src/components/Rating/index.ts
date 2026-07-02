import React from 'react';
import { Rating as FormilyRating } from '@wordrhyme/formily-shadcn';
import { createBehavior, createResource } from '@wordrhyme/designable-core';
import type { DnFC } from '@wordrhyme/designable-react';
import { createFieldSchema } from '../Field';
import { AllLocales } from '../../locales';
import { AllSchemas } from '../../schemas';

export const Rating: DnFC<React.ComponentProps<typeof FormilyRating>> = FormilyRating;

Rating.Behavior = createBehavior({
  name: 'Rating',
  extends: ['Field'],
  selector: (node) => node.props['x-component'] === 'Rating',
  designerProps: {
    propsSchema: createFieldSchema(AllSchemas.Rating),
  },
  designerLocales: AllLocales.Rating,
});

Rating.Resource = createResource({
  icon: 'RateSource',
  elements: [
    {
      componentName: 'Field',
      props: {
        type: 'number',
        title: 'Rating',
        'x-decorator': 'FormItem',
        'x-component': 'Rating',
      },
    },
  ],
});
