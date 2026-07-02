import React from 'react';
import {
  Card as ShadcnCard,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from '@wordrhyme/shadcn';
import { createBehavior, createResource } from '@wordrhyme/designable-core';
import type { DnFC } from '@wordrhyme/designable-react';
import { createVoidFieldSchema } from '../Field';
import { AllLocales } from '../../locales';
import { AllSchemas } from '../../schemas';

export interface DesignableCardProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  bordered?: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  extra?: React.ReactNode;
  type?: 'inner' | '';
}

export const Card: DnFC<DesignableCardProps> = ({
  bordered = true,
  children,
  className,
  description,
  extra,
  title,
  type,
  ...props
}) => {
  return (
    <ShadcnCard
      {...props}
      className={cn(
        'min-h-24 bg-white text-slate-950',
        bordered === false && 'border-transparent shadow-none',
        type === 'inner' && 'bg-slate-50 py-4 shadow-none',
        className,
      )}
    >
      {(title || description || extra) && (
        <CardHeader className={cn(type === 'inner' && 'px-4')}>
          <div>
            {title && (
              <CardTitle data-content-editable="x-component-props.title">
                {title}
              </CardTitle>
            )}
            {description && (
              <CardDescription data-content-editable="x-component-props.description">
                {description}
              </CardDescription>
            )}
          </div>
          {extra && (
            <CardAction data-content-editable="x-component-props.extra">
              {extra}
            </CardAction>
          )}
        </CardHeader>
      )}
      <CardContent className={cn(type === 'inner' && 'px-4')}>{children}</CardContent>
    </ShadcnCard>
  );
};

Card.Behavior = createBehavior({
  name: 'Card',
  extends: ['Field'],
  selector: (node) => node.props['x-component'] === 'Card',
  designerProps: {
    droppable: true,
    propsSchema: createVoidFieldSchema(AllSchemas.Card),
  },
  designerLocales: AllLocales.Card,
});

Card.Resource = createResource({
  icon: 'CardSource',
  elements: [
    {
      componentName: 'Field',
      props: {
        type: 'void',
        'x-component': 'Card',
        'x-component-props': {
          title: 'Card',
          description: 'Drop fields here.',
        },
      },
    },
  ],
});
