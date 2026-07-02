import type { ISchema } from '@formily/react';
import type React from 'react';
import { JsonSchemaForm } from '@wordrhyme/formily-shadcn';
import type { FormilyDesignDocument } from '../schema';

export interface FormilySchemaBlockProps extends Omit<
  React.ComponentProps<typeof JsonSchemaForm>,
  'schema'
> {
  schema: ISchema;
}

export function FormilySchemaBlock(props: FormilySchemaBlockProps) {
  const { schema, ...rest } = props;

  return <JsonSchemaForm schema={schema} {...rest} />;
}

export interface FormilyDesignRendererProps extends Omit<
  React.ComponentProps<typeof JsonSchemaForm>,
  'schema'
> {
  document: FormilyDesignDocument;
}

export function FormilyDesignRenderer(props: FormilyDesignRendererProps) {
  const { document, ...rest } = props;

  return <JsonSchemaForm schema={document.schema ?? { type: 'object' }} {...rest} />;
}

export function createFormilyRenderComponents() {
  return {
    'formily.form': FormilySchemaBlock,
  };
}
