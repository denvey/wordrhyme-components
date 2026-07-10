import '@wordrhyme/designable-react/scoped-antd.less';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  type CSSProperties,
  type ComponentType,
  type ReactNode,
} from 'react';
import {
  createBehavior,
  createDesigner,
  createResource,
  GlobalRegistry,
  TreeNode,
  type IBehavior,
  type IResourceLike,
  type ITreeNode,
} from '@wordrhyme/designable-core';
import {
  transformToSchema,
  transformToTreeNode,
  type ITransformerOptions,
} from '@wordrhyme/designable-formily-transformer';
import {
  ComponentTreeWidget,
  CompositePanel,
  Designer,
  DesignerToolsWidget,
  HistoryWidget,
  OutlineTreeWidget,
  ResourceWidget,
  SettingsPanel,
  StudioPanel,
  TextWidget,
  ToolbarPanel,
  useDesigner,
  ViewPanel,
  ViewportPanel,
  ViewToolsWidget,
  Workbench,
  WorkspacePanel,
} from '@wordrhyme/designable-react';
import {
  Card,
  Checkbox,
  Column,
  Field,
  Form,
  Input,
  NumberInput,
  ObjectContainer,
  Rating,
  Row,
  Select,
  Separator,
  Switch,
  Text,
} from '@wordrhyme/designable-formily-shadcn';
import { MonacoInput, SettingsForm } from '@wordrhyme/designable-react-settings-form';
import { createForm } from '@wordrhyme/formily-shadcn';
import {
  FormilyDesignRenderer,
  type FormilyDesignRendererProps,
} from './render/FormilySchemaBlock';
import {
  createDesignRegistry,
  getBlockComponentId,
  toDesignableResources,
} from './schema/registry';
import type {
  DesignBlockDefinition,
  DesignContribution,
  DesignRegistry,
  DesignSurface,
  FormilyDesignDocument,
} from './schema/types';

const DEFAULT_TRANSFORM_OPTIONS: ITransformerOptions = {
  designableFieldName: 'Field',
  designableFormName: 'Form',
};

type WithChildren<P = object> = ComponentType<P & { children?: ReactNode }>;

const DesignerHost = Designer as WithChildren<{
  engine: ReturnType<typeof createDesigner>;
  position?: 'fixed' | 'absolute' | 'relative';
}>;
const WorkbenchHost = Workbench as WithChildren;
const StudioPanelHost = StudioPanel as WithChildren<{
  actions?: ReactNode;
  logo?: ReactNode;
}>;
const CompositePanelHost = CompositePanel as WithChildren;
const CompositePanelItemHost = CompositePanel.Item as WithChildren<{
  icon?: ReactNode;
  title?: ReactNode;
}>;
const WorkspacePanelHost = WorkspacePanel as WithChildren;
const ToolbarPanelHost = ToolbarPanel as WithChildren;
const ViewportPanelHost = ViewportPanel as WithChildren;
const SettingsPanelHost = SettingsPanel as WithChildren<{ title?: ReactNode }>;

export interface FormilyDesignableEditorHandle {
  getDocument: () => FormilyDesignDocument;
}

export interface FormilyDesignableEditorActions {
  readDocument: () => FormilyDesignDocument;
}

export interface FormilyDesignableResourcePanel {
  icon?: ReactNode;
  sources: IResourceLike[];
  title: ReactNode;
}

export interface FormilyDesignableEditorProps {
  autoSelectFirstNode?: boolean;
  className?: string;
  components: Record<string, ComponentType<any>>;
  'data-testid'?: string;
  document: FormilyDesignDocument;
  fill?: boolean;
  language?: string;
  logo?: ReactNode;
  onSchemaChange?: (document: FormilyDesignDocument) => void;
  previewComponents?: FormilyDesignRendererProps['components'];
  renderActions?: (actions: FormilyDesignableEditorActions) => ReactNode;
  renderPreview?: (payload: {
    document: FormilyDesignDocument;
    tree: TreeNode;
  }) => ReactNode;
  resourcePanels?: FormilyDesignableResourcePanel[];
  rootComponentName?: string;
  settingsTitle?: ReactNode;
  settingsUploadAction?: string;
  status?: ReactNode;
  style?: CSSProperties;
  transformOptions?: ITransformerOptions;
  viewTools?: string[];
  markupComponentPackage?: string;
  markupExtraImports?: string[];
  markupSetupCode?: string;
}

export type FormilyShadcnDesignerComponentMap = Record<string, ComponentType<any>>;

export interface FormilyShadcnDesignerActions extends FormilyDesignableEditorActions {
  publish: () => void;
  save: () => void;
}

export interface FormilyShadcnDesignerProps extends Omit<
  FormilyDesignableEditorProps,
  'components' | 'previewComponents' | 'renderActions' | 'resourcePanels'
> {
  blockResourceTitle?: ReactNode;
  contributions?: DesignContribution[];
  designerComponents?: Record<string, ComponentType<any>>;
  iconAliases?: Record<string, string>;
  includeShadcnResources?: boolean;
  onPublish?: (document: FormilyDesignDocument) => void;
  onSave?: (document: FormilyDesignDocument) => void;
  previewComponents?: FormilyDesignRendererProps['components'];
  registry?: DesignRegistry;
  renderActions?: (actions: FormilyShadcnDesignerActions) => ReactNode;
  resourcePanels?: FormilyDesignableResourcePanel[];
  runtimeComponents?: FormilyShadcnDesignerComponentMap;
  shadcnResourceTitle?: ReactNode;
  surface?: DesignSurface;
}

function getTreeDocument(
  tree: ITreeNode | undefined,
  initialDocument: FormilyDesignDocument,
  options: ITransformerOptions,
): FormilyDesignDocument {
  if (!tree) return initialDocument;

  return {
    meta: initialDocument.meta,
    ...transformToSchema(tree, options),
  } as FormilyDesignDocument;
}

function getInitialTree(
  document: FormilyDesignDocument,
  options: ITransformerOptions,
): ITreeNode {
  try {
    return transformToTreeNode(document, options);
  } catch {
    return transformToTreeNode(
      {
        ...document,
        schema: {
          type: 'object',
          properties: {},
        },
      },
      options,
    );
  }
}

function SchemaEditorWidget({
  onChange,
  options,
  tree,
}: {
  onChange?: (tree: ITreeNode) => void;
  options: ITransformerOptions;
  tree: TreeNode;
}) {
  return (
    <MonacoInput
      value={JSON.stringify(transformToSchema(tree.serialize(), options), null, 2)}
      height="100%"
      language="json"
      options={{
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        tabSize: 2,
        wordWrap: 'on',
      }}
      onChange={(value) => {
        try {
          onChange?.(transformToTreeNode(JSON.parse(value), options));
        } catch {
          // Keep the editor responsive while the JSON document is temporarily invalid.
        }
      }}
    />
  );
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    value != null &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function isEmptyRecord(value: unknown) {
  return isPlainRecord(value) && Object.keys(value).length === 0;
}

function toMarkupAttributeValue(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') {
    return `{${JSON.stringify(value)}}`;
  }
  return `{${JSON.stringify(value)}}`;
}

function takeSchemaFieldTag(node: ITreeNode): string {
  if (node.componentName === 'Field') {
    const component = node.props?.['x-component'];
    return typeof component === 'string' ? component : 'Field';
  }
  return node.componentName ?? 'Field';
}

function printMarkupAttributes(node: ITreeNode): string {
  const props = { ...(node.props ?? {}) };

  if (node.componentName !== 'Form') {
    props.name = props.name || node.id;
  }

  return Object.keys(props)
    .map((key) => {
      if (
        key === 'x-designable-id' ||
        key === 'x-designable-source-name' ||
        key === '_isJSONSchemaObject' ||
        key === 'version' ||
        key === 'type' ||
        key === 'x-index'
      ) {
        return '';
      }

      const value = props[key];
      if (value === undefined || value === null || value === '') return '';
      if (isEmptyRecord(value)) return '';

      return `${key}=${toMarkupAttributeValue(value)}`;
    })
    .filter(Boolean)
    .join(' ');
}

function printMarkupNode(node: ITreeNode): string {
  const children = node.children ?? [];
  const tag = takeSchemaFieldTag(node);
  const attributes = printMarkupAttributes(node);
  const openTag = attributes ? `<${tag} ${attributes}` : `<${tag}`;

  if (children.length === 0) return `${openTag} />`;

  return `${openTag}>
${children.map((child) => printMarkupNode(child)).join('\n')}
</${tag}>`;
}

export function transformToMarkupSchemaCode(
  tree: TreeNode | ITreeNode,
  {
    componentPackage = '@wordrhyme/design-engine',
    extraImports = [],
    setupCode = '',
  }: {
    componentPackage?: string;
    extraImports?: string[];
    setupCode?: string;
  } = {},
) {
  const serialized = tree instanceof TreeNode ? tree.serialize() : tree;
  const root =
    serialized.componentName === 'Form'
      ? serialized
      : serialized.children?.find((child) => child.componentName === 'Form');
  const formAttributes = root ? printMarkupAttributes(root) : '';
  const children =
    root?.children?.map((child) => printMarkupNode(child)).join('\n') ?? '';
  const imports = [
    'Form',
    'FormItem',
    'Input',
    'Select',
    'NumberInput',
    'Switch',
    'Checkbox',
    'Rating',
    'Row',
    'Column',
    'Separator',
    'ObjectContainer',
    ...extraImports,
  ];

  return `import React, { useMemo } from 'react'
import { createForm } from '@formily/core'
import { createSchemaField } from '@formily/react'
import { ${Array.from(new Set(imports)).join(', ')} } from '${componentPackage}'

${setupCode}
const SchemaField = createSchemaField({
  components: {
    FormItem,
    Input,
    Select,
    NumberInput,
    Switch,
    Checkbox,
    Rating,
    Row,
    Column,
    Separator,
    ObjectContainer,
    ${extraImports.join(',\n    ')}
  },
})

export default () => {
  const form = useMemo(() => createForm(), [])

  return <Form form={form} ${formAttributes}>
    <SchemaField>
${children}
    </SchemaField>
  </Form>
}
`;
}

function MarkupSchemaWidget({
  componentPackage,
  extraImports,
  setupCode,
  tree,
}: {
  componentPackage?: string;
  extraImports?: string[];
  setupCode?: string;
  tree: TreeNode;
}) {
  return (
    <MonacoInput
      value={transformToMarkupSchemaCode(tree, {
        componentPackage,
        extraImports,
        setupCode,
      })}
      height="100%"
      language="typescript"
      options={{
        minimap: { enabled: false },
        readOnly: true,
        scrollBeyondLastLine: false,
        tabSize: 2,
        wordWrap: 'on',
      }}
    />
  );
}

function DesignerLanguageSync({
  autoSelectFirstNode,
  language,
}: {
  autoSelectFirstNode: boolean;
  language: string;
}) {
  const designer = useDesigner();

  useEffect(() => {
    GlobalRegistry.setDesignerLanguage(language);

    if (!autoSelectFirstNode) return undefined;

    const selectFirstNode = () => {
      const tree = designer?.getCurrentTree();
      const firstNode = tree?.children?.[0];
      if (!tree || !firstNode || tree.operation.selection.length > 0) return;
      tree.operation.selection.select(firstNode);
    };

    const timeoutIds = [0, 120, 360].map((delay) =>
      window.setTimeout(selectFirstNode, delay),
    );
    return () => timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
  }, [autoSelectFirstNode, designer, language]);

  return null;
}

function DefaultPreview({
  components,
  document,
}: {
  components?: FormilyDesignRendererProps['components'];
  document: FormilyDesignDocument;
}) {
  const form = useMemo(() => createForm(), []);

  return (
    <div className="wr-formily-designable-editor__preview">
      <FormilyDesignRenderer document={document} components={components} form={form} />
    </div>
  );
}

function EditorStyles() {
  return (
    <style>
      {`
        .wr-formily-designable-editor {
          position: relative;
          height: min(820px, calc(100dvh - 168px));
          min-height: 640px;
          overflow: hidden;
          border: 1px solid hsl(var(--border, 214 32% 91%));
          border-radius: 8px;
          background: #fff;
          color: #222;
        }

        .wr-formily-designable-editor--fill {
          height: 100%;
          min-height: 0;
          border: 0;
          border-radius: 0;
        }

        .wr-formily-designable-editor--fill .dn-main-panel-header-logo {
          padding-left: 44px;
        }

        .wr-formily-designable-editor--fill .dn-main-panel-header-actions {
          padding-right: 20px;
        }

        .wr-formily-designable-editor .dn-main-panel-container.absolute {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .wr-formily-designable-editor .dn-main-panel-header {
          min-height: auto;
          padding: 4px;
          background: #fff;
        }

        .wr-formily-designable-editor .dn-main-panel {
          background: #f7f7f7;
        }

        .wr-formily-designable-editor .dn-composite-panel-tabs-pane {
          min-width: 48px;
          min-height: 48px;
          padding: 10px;
        }

        .wr-formily-designable-editor .dn-composite-panel-tabs-content,
        .wr-formily-designable-editor .dn-settings-panel {
          width: 320px;
        }

        .wr-formily-designable-editor .dn-composite-panel-tabs-header,
        .wr-formily-designable-editor .dn-settings-panel-header {
          min-height: auto;
          padding: 14px 8px;
        }

        .wr-formily-designable-editor .dn-composite-panel-tabs-header-title,
        .wr-formily-designable-editor .dn-settings-panel-header-title {
          font-size: 18px;
          font-weight: 500;
        }

        .wr-formily-designable-editor .dn-resource-content {
          grid-auto-rows: auto;
        }

        .wr-formily-designable-editor .dn-resource-item {
          min-height: 44px;
        }

        .wr-formily-designable-editor .dn-resource-item-text {
          margin-top: 0;
          margin-bottom: 10px;
          font-size: 12px;
          line-height: 1;
        }

        .wr-formily-designable-editor .dn-workspace-panel {
          padding: 4px;
          background: #f2f2f2;
        }

        .wr-formily-designable-editor .dn-toolbar-panel {
          min-height: 34px;
          background: #fafafa;
        }

        .wr-formily-designable-editor .dn-viewport {
          background: transparent;
          border: 0;
        }

        .wr-formily-designable-editor__actions {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-right: 8px;
        }

        .wr-formily-designable-editor__logo {
          padding: 0 12px;
          font-size: 14px;
          font-weight: 600;
        }

        .wr-formily-designable-editor__status {
          padding: 0 8px;
          color: #64748b;
          font-size: 12px;
          line-height: 1;
        }

        .wr-formily-designable-editor__button {
          height: 28px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: #fff;
          color: #334155;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          padding: 0 10px;
        }

        .wr-formily-designable-editor__button:hover {
          background: #f8fafc;
        }

        .wr-formily-designable-editor__button--primary {
          border-color: #0f172a;
          background: #0f172a;
          color: #fff;
        }

        .wr-formily-designable-editor__button--primary:hover {
          background: #1e293b;
        }

        .wr-formily-designable-editor__preview {
          height: 100%;
          overflow: auto;
          background: #fff;
          color: #0f172a;
        }
      `}
    </style>
  );
}

export function createDesignableResourceSource(
  registry: Pick<DesignRegistry, 'blocks'>,
  options: {
    fallbackIcon?: string;
    iconAliases?: Record<string, string>;
  } = {},
) {
  const { fallbackIcon = 'Component', iconAliases = {} } = options;

  return createResource(
    ...toDesignableResources(registry).map((resource) => {
      const icon =
        typeof resource.icon === 'string'
          ? (iconAliases[resource.icon] ?? resource.icon)
          : resource.icon;

      return {
        title: resource.title,
        icon: icon ?? fallbackIcon,
        elements: [resource.node],
      };
    }),
  );
}

export function createDesignableBlockNode(block: {
  component?: string;
  defaultProps?: Record<string, unknown>;
  id: string;
}): ITreeNode {
  return {
    componentName: 'Field',
    props: {
      type: 'void',
      'x-component': block.component ?? block.id,
      'x-component-props': block.defaultProps,
    },
  };
}

export const defaultFormilyShadcnDesignerComponents: Record<
  string,
  ComponentType<any>
> = {
  Form,
  Field,
  Input,
  Select,
  NumberInput,
  Switch,
  Checkbox,
  Rating,
  Text,
  Card,
  Row,
  Column,
  Separator,
  ObjectContainer,
} satisfies Record<string, ComponentType<any>>;

function collectResourceLikes(components: Record<string, ComponentType<any>>) {
  return Object.values(components)
    .map((component) => (component as { Resource?: IResourceLike }).Resource)
    .filter((resource): resource is IResourceLike => Boolean(resource));
}

function createBlockBehavior(
  block: DesignBlockDefinition,
  iconAliases: Record<string, string>,
): IBehavior[] {
  const component = getBlockComponentId(block);
  const icon =
    typeof block.icon === 'string' ? (iconAliases[block.icon] ?? block.icon) : block.icon;

  return createBehavior({
    name: component,
    selector: (node) =>
      node.componentName === 'Field' && node.props?.['x-component'] === component,
    designerProps: {
      title: block.title,
      icon,
      draggable: true,
      droppable: false,
      cloneable: true,
      deletable: true,
      propsSchema: (block.propsSchema ?? block.settingsSchema) as never,
    },
    designerLocales: {
      'en-us': { title: block.title },
      'zh-cn': { title: block.title },
    },
  });
}

function MissingDesignBlock({ component }: { component: string }) {
  return (
    <div
      style={{
        border: '1px dashed #cbd5e1',
        borderRadius: 8,
        background: '#f8fafc',
        color: '#64748b',
        fontSize: 13,
        padding: 16,
      }}
    >
      Unknown block: {component}
    </div>
  );
}

export function createFormilyShadcnDesignerComponents({
  designerComponents = {},
  iconAliases = {},
  registry,
  runtimeComponents = {},
}: {
  designerComponents?: Record<string, ComponentType<any>>;
  iconAliases?: Record<string, string>;
  registry: Pick<DesignRegistry, 'blocks'>;
  runtimeComponents?: FormilyShadcnDesignerComponentMap;
}): Record<string, ComponentType<any>> {
  const blockComponents = Array.from(registry.blocks.values()).reduce<
    Record<string, ComponentType<any>>
  >((buffer, block) => {
    const componentName = getBlockComponentId(block);
    const RuntimeComponent = runtimeComponents[componentName];

    const DesignableRuntimeComponent = (props: Record<string, unknown>) =>
      RuntimeComponent ? (
        <RuntimeComponent {...props} />
      ) : (
        <MissingDesignBlock component={componentName} />
      );

    DesignableRuntimeComponent.displayName = `Designable${componentName}`;
    (
      DesignableRuntimeComponent as ComponentType<any> & { Behavior?: IBehavior[] }
    ).Behavior = createBlockBehavior(block, iconAliases);

    buffer[componentName] = DesignableRuntimeComponent;
    return buffer;
  }, {});

  return {
    ...defaultFormilyShadcnDesignerComponents,
    ...blockComponents,
    ...designerComponents,
  };
}

export function createFormilyShadcnPreviewComponents({
  previewComponents,
  runtimeComponents = {},
}: {
  previewComponents?: FormilyDesignRendererProps['components'];
  runtimeComponents?: FormilyShadcnDesignerComponentMap;
}): FormilyDesignRendererProps['components'] {
  return {
    ...previewComponents,
    fields: {
      ...Object.fromEntries(
        Object.entries(runtimeComponents).map(([name, component]) => [
          name,
          { component },
        ]),
      ),
      ...(previewComponents?.fields ?? {}),
    },
  };
}

function DefaultShadcnDesignerActions({
  onPublish,
  onSave,
  publish,
  save,
}: {
  onPublish?: (document: FormilyDesignDocument) => void;
  onSave?: (document: FormilyDesignDocument) => void;
  publish: () => void;
  save: () => void;
}) {
  if (!onSave && !onPublish) return null;

  return (
    <>
      {onSave ? (
        <button
          type="button"
          className="wr-formily-designable-editor__button"
          onClick={save}
        >
          Save
        </button>
      ) : null}
      {onPublish ? (
        <button
          type="button"
          className="wr-formily-designable-editor__button wr-formily-designable-editor__button--primary"
          onClick={publish}
        >
          Publish
        </button>
      ) : null}
    </>
  );
}

export const FormilyDesignableEditor = forwardRef<
  FormilyDesignableEditorHandle,
  FormilyDesignableEditorProps
>(
  (
    {
      autoSelectFirstNode = true,
      className,
      components,
      'data-testid': testId,
      document,
      fill = false,
      language = 'zh-cn',
      logo,
      onSchemaChange,
      previewComponents,
      renderActions,
      renderPreview,
      resourcePanels = [],
      rootComponentName = 'Form',
      settingsTitle,
      settingsUploadAction = '/api/media',
      status,
      style,
      transformOptions = DEFAULT_TRANSFORM_OPTIONS,
      viewTools = ['DESIGNABLE', 'JSONTREE', 'MARKUP', 'PREVIEW'],
      markupComponentPackage = '@wordrhyme/design-engine',
      markupExtraImports = [],
      markupSetupCode,
    },
    ref,
  ) => {
    const initialTree = useMemo(
      () => getInitialTree(document, transformOptions),
      [document, transformOptions],
    );
    const engine = useMemo(
      () =>
        createDesigner({
          rootComponentName,
          defaultComponentTree: initialTree,
        }),
      [initialTree, rootComponentName],
    );

    const readDocument = () =>
      getTreeDocument(engine.getCurrentTree()?.serialize(), document, transformOptions);

    useImperativeHandle(ref, () => ({ getDocument: readDocument }), [
      document,
      engine,
      transformOptions,
    ]);

    const actions = renderActions?.({ readDocument });
    const rootClassName = [
      'wr-formily-designable-editor',
      fill ? 'wr-formily-designable-editor--fill' : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={rootClassName} data-testid={testId} style={style}>
        <EditorStyles />
        <DesignerHost engine={engine} position="absolute">
          <DesignerLanguageSync
            autoSelectFirstNode={autoSelectFirstNode}
            language={language}
          />
          <WorkbenchHost>
            <StudioPanelHost
              logo={
                logo ?? (
                  <div className="wr-formily-designable-editor__logo">
                    WordRhyme Designer
                  </div>
                )
              }
              actions={
                actions ? (
                  <div className="wr-formily-designable-editor__actions">{actions}</div>
                ) : null
              }
            >
              <CompositePanelHost>
                {resourcePanels.map((panel, index) => (
                  <CompositePanelItemHost
                    key={index}
                    title={panel.title}
                    icon={panel.icon ?? 'Component'}
                  >
                    <ResourceWidget title={panel.title} sources={panel.sources} />
                  </CompositePanelItemHost>
                ))}
                <CompositePanelItemHost title="大纲树" icon="Outline">
                  <OutlineTreeWidget />
                </CompositePanelItemHost>
                <CompositePanelItemHost title="历史记录" icon="History">
                  <HistoryWidget />
                </CompositePanelItemHost>
              </CompositePanelHost>
              <WorkspacePanelHost>
                <ToolbarPanelHost>
                  <DesignerToolsWidget />
                  {status ? (
                    <div className="wr-formily-designable-editor__status" role="status">
                      {status}
                    </div>
                  ) : null}
                  <ViewToolsWidget use={viewTools} />
                </ToolbarPanelHost>
                <ViewportPanelHost>
                  <ViewPanel type="DESIGNABLE">
                    {() => <ComponentTreeWidget components={components} />}
                  </ViewPanel>
                  <ViewPanel type="JSONTREE" scrollable={false}>
                    {(tree: TreeNode, onChange: (tree: ITreeNode) => void) => (
                      <SchemaEditorWidget
                        tree={tree}
                        options={transformOptions}
                        onChange={(nextTree) => {
                          onChange(nextTree);
                          onSchemaChange?.(
                            getTreeDocument(nextTree, document, transformOptions),
                          );
                        }}
                      />
                    )}
                  </ViewPanel>
                  <ViewPanel type="MARKUP" scrollable={false}>
                    {(tree: TreeNode) => (
                      <MarkupSchemaWidget
                        tree={tree}
                        componentPackage={markupComponentPackage}
                        extraImports={markupExtraImports}
                        setupCode={markupSetupCode}
                      />
                    )}
                  </ViewPanel>
                  <ViewPanel type="PREVIEW">
                    {(tree: TreeNode) => {
                      const nextDocument = getTreeDocument(
                        tree.serialize(),
                        document,
                        transformOptions,
                      );
                      return renderPreview ? (
                        renderPreview({ tree, document: nextDocument })
                      ) : (
                        <DefaultPreview
                          document={nextDocument}
                          components={previewComponents}
                        />
                      );
                    }}
                  </ViewPanel>
                </ViewportPanelHost>
              </WorkspacePanelHost>
              <SettingsPanelHost
                title={
                  settingsTitle ?? (
                    <TextWidget token="settings" defaultMessage="属性配置" />
                  )
                }
              >
                <SettingsForm uploadAction={settingsUploadAction} />
              </SettingsPanelHost>
            </StudioPanelHost>
          </WorkbenchHost>
        </DesignerHost>
      </div>
    );
  },
);

FormilyDesignableEditor.displayName = 'FormilyDesignableEditor';

export function FormilyShadcnDesigner({
  blockResourceTitle = 'Blocks',
  contributions = [],
  designerComponents,
  iconAliases,
  includeShadcnResources = true,
  onPublish,
  onSave,
  previewComponents,
  registry: registryProp,
  renderActions,
  resourcePanels = [],
  runtimeComponents,
  shadcnResourceTitle = 'Components',
  surface,
  ...props
}: FormilyShadcnDesignerProps) {
  const registry = useMemo(
    () => registryProp ?? createDesignRegistry(contributions, { surface }),
    [contributions, registryProp, surface],
  );

  const editorComponents = useMemo(
    () =>
      createFormilyShadcnDesignerComponents({
        designerComponents,
        iconAliases,
        registry,
        runtimeComponents,
      }),
    [designerComponents, iconAliases, registry, runtimeComponents],
  );

  const mergedPreviewComponents = useMemo(
    () =>
      createFormilyShadcnPreviewComponents({
        previewComponents,
        runtimeComponents,
      }),
    [previewComponents, runtimeComponents],
  );

  const panels = useMemo(() => {
    const nextPanels: FormilyDesignableResourcePanel[] = [];

    if (includeShadcnResources) {
      nextPanels.push({
        title: shadcnResourceTitle,
        icon: 'Component',
        sources: collectResourceLikes(defaultFormilyShadcnDesignerComponents),
      });
    }

    if (registry.blocks.size > 0) {
      nextPanels.push({
        title: blockResourceTitle,
        icon: 'Component',
        sources: [
          createDesignableResourceSource(registry, {
            iconAliases,
          }),
        ],
      });
    }

    return nextPanels.concat(resourcePanels);
  }, [
    blockResourceTitle,
    iconAliases,
    includeShadcnResources,
    registry,
    resourcePanels,
    shadcnResourceTitle,
  ]);

  const renderEditorActions = (actions: FormilyDesignableEditorActions) => {
    const save = () => onSave?.(actions.readDocument());
    const publish = () => onPublish?.(actions.readDocument());
    const designerActions: FormilyShadcnDesignerActions = {
      ...actions,
      publish,
      save,
    };

    return renderActions ? (
      renderActions(designerActions)
    ) : (
      <DefaultShadcnDesignerActions
        onPublish={onPublish}
        onSave={onSave}
        publish={publish}
        save={save}
      />
    );
  };

  return (
    <FormilyDesignableEditor
      {...props}
      components={editorComponents}
      previewComponents={mergedPreviewComponents}
      renderActions={renderEditorActions}
      resourcePanels={panels}
    />
  );
}
