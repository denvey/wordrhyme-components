import type {
  DesignIssue,
  DesignRegistry,
  FormilyDesignDocument,
  JsonObject,
} from './types';
import type { ISchema } from '@formily/react';
import { FormilyDesignDocumentError } from './types';
import { getBlockComponentId } from './registry';

export interface ValidateFormilyDesignDocumentOptions {
  registry?: Pick<DesignRegistry, 'blocks'>;
}

function pushIssue(
  issues: DesignIssue[],
  code: string,
  message: string,
  path: string,
): void {
  issues.push({
    severity: 'error',
    code,
    message,
    path,
  });
}

function getSchemaComponent(
  schema: ISchema | JsonObject | undefined,
): string | undefined {
  const component = schema?.['x-component'];
  return typeof component === 'string' ? component : undefined;
}

function getProperties(
  schema: ISchema | JsonObject | undefined,
): Record<string, ISchema> {
  const properties = schema?.properties;
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    return {};
  }
  return properties as Record<string, ISchema>;
}

function validateSchemaNode(
  schema: ISchema | undefined,
  path: string,
  issues: DesignIssue[],
  componentIds: Set<string> | undefined,
): void {
  if (!schema) {
    pushIssue(issues, 'missing_schema', 'Formily schema node is required.', path);
    return;
  }

  const component = getSchemaComponent(schema as JsonObject);
  if (component && componentIds && !componentIds.has(component)) {
    pushIssue(
      issues,
      'unknown_component',
      `Design component "${component}" is not registered.`,
      `${path}.x-component`,
    );
  }

  const items = schema.items;
  if (items && !Array.isArray(items)) {
    validateSchemaNode(items as ISchema, `${path}.items`, issues, componentIds);
  }

  for (const [key, child] of Object.entries(getProperties(schema))) {
    validateSchemaNode(child, `${path}.properties.${key}`, issues, componentIds);
  }
}

export function validateFormilyDesignDocument(
  document: FormilyDesignDocument,
  options: ValidateFormilyDesignDocumentOptions = {},
): DesignIssue[] {
  const issues: DesignIssue[] = [];
  const componentIds = options.registry
    ? new Set(
        Array.from(options.registry.blocks.values()).flatMap((block) => [
          block.id,
          getBlockComponentId(block),
        ]),
      )
    : undefined;

  validateSchemaNode(document.schema, 'schema', issues, componentIds);

  return issues;
}

export function assertValidFormilyDesignDocument(
  document: FormilyDesignDocument,
  options: ValidateFormilyDesignDocumentOptions = {},
): void {
  const issues = validateFormilyDesignDocument(document, options);

  if (issues.length > 0) {
    throw new FormilyDesignDocumentError(issues);
  }
}
