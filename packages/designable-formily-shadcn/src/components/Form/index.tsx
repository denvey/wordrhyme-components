import React, { useMemo } from 'react';
import { createForm } from '@formily/core';
import { observer } from '@formily/react';
import { createBehavior, createResource } from '@wordrhyme/designable-core';
import { type DnFC, usePrefix } from '@wordrhyme/designable-react';
import { Form as ShadcnForm } from '@wordrhyme/formily-shadcn';
import { AllLocales } from '../../locales';
import { AllSchemas } from '../../schemas';

export const Form: DnFC<React.ComponentProps<typeof ShadcnForm>> = observer((props) => {
  const prefix = usePrefix('designable-shadcn-form');
  const form = useMemo(
    () =>
      createForm({
        designable: true,
      }),
    [],
  );

  return (
    <ShadcnForm
      {...props}
      className={`${prefix} min-h-full space-y-4 bg-white p-4 text-slate-950 ${props.className ?? ''}`}
      form={form}
      layout={props.layout ?? { density: 'md', labelPlacement: 'top' }}
      settings={props.settings ?? {}}
    >
      {props.children}
    </ShadcnForm>
  );
});

Form.Behavior = createBehavior({
  name: 'Form',
  selector: (node) => node.componentName === 'Form',
  designerProps(node) {
    return {
      draggable: !node.isRoot,
      cloneable: !node.isRoot,
      deletable: !node.isRoot,
      droppable: true,
      propsSchema: AllSchemas.Form,
      defaultProps: {
        layout: { density: 'md', labelPlacement: 'top' },
      },
    };
  },
  designerLocales: AllLocales.Form,
});

Form.Resource = createResource({
  title: { 'zh-CN': '表单', 'en-US': 'Form' },
  icon: 'FormLayoutSource',
  elements: [
    {
      componentName: 'Field',
      props: {
        type: 'object',
        'x-component': 'Form',
      },
    },
  ],
});
