import type { ITreeNode } from '@wordrhyme/designable-core';
import type { IFormilySchema } from '@wordrhyme/designable-formily-transformer';

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

export type DesignSurface = 'web' | 'admin' | 'app';

/**
 * Persisted document for designed pages/forms.
 *
 * This mirrors Designable's Formily transformer output. WordRhyme stores this
 * document directly instead of translating it into a second platform schema.
 */
export type FormilyDesignDocument = IFormilySchema & {
  meta?: JsonObject;
};

export type DesignableTreeNode = ITreeNode;

export interface DesignableResourceDescriptor {
  title?: string;
  icon?: string;
  category?: string;
  node?: DesignableTreeNode;
  snippets?: JsonObject[];
}

export interface DesignableResource {
  title?: string;
  icon?: string;
  category?: string;
  node: DesignableTreeNode;
  snippets?: JsonObject[];
}

export interface DesignableBehaviorDescriptor {
  name?: string;
  extends?: string[];
  selector?: string;
  designerProps?: JsonObject;
  designerLocales?: JsonObject;
  propsSchema?: JsonObject;
}

export interface DesignBlockDefinition {
  id: string;
  title: string;
  component?: string;
  pluginId?: string;
  description?: string;
  category?: string;
  icon?: string;
  surfaces?: DesignSurface[];
  defaultProps?: JsonObject;
  previewProps?: JsonObject;
  propsSchema?: JsonObject;
  settingsSchema?: JsonObject;
  designable?: {
    resource?: DesignableResourceDescriptor;
    behavior?: DesignableBehaviorDescriptor;
  };
}

export interface DesignSlotDefinition {
  id: string;
  title: string;
  pluginId?: string;
  surfaces?: DesignSurface[];
  accepts?: string[];
  maxChildren?: number;
}

export interface DesignTemplateDefinition {
  id: string;
  title: string;
  pluginId?: string;
  surfaces?: DesignSurface[];
  route?: string;
  document: FormilyDesignDocument;
}

export interface DesignDataSourceDefinition {
  id: string;
  title: string;
  pluginId?: string;
  surfaces?: DesignSurface[];
  permission?: string;
  inputSchema?: JsonObject;
  outputSchema?: JsonObject;
}

export interface DesignActionDefinition {
  id: string;
  title: string;
  pluginId?: string;
  surfaces?: DesignSurface[];
  permission?: string;
  inputSchema?: JsonObject;
}

export interface DesignContribution {
  pluginId: string;
  pluginVersion?: string;
  blocks?: DesignBlockDefinition[];
  slots?: DesignSlotDefinition[];
  templates?: DesignTemplateDefinition[];
  dataSources?: DesignDataSourceDefinition[];
  actions?: DesignActionDefinition[];
}

export interface DesignRegistry {
  blocks: Map<string, DesignBlockDefinition>;
  slots: Map<string, DesignSlotDefinition>;
  templates: Map<string, DesignTemplateDefinition>;
  dataSources: Map<string, DesignDataSourceDefinition>;
  actions: Map<string, DesignActionDefinition>;
  contributions: DesignContribution[];
}

export type DesignIssueSeverity = 'error' | 'warning';

export interface DesignIssue {
  severity: DesignIssueSeverity;
  code: string;
  message: string;
  path: string;
}

export class FormilyDesignDocumentError extends Error {
  readonly issues: DesignIssue[];

  constructor(issues: DesignIssue[]) {
    super(issues.map((issue) => issue.message).join('\n'));
    this.name = 'FormilyDesignDocumentError';
    this.issues = issues;
  }
}
