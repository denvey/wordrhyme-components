import '@wordrhyme/designable-react/scoped-antd.less';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import { observer } from '@formily/reactive-react';
import { GithubOutlined } from '@ant-design/icons';
import { Button, Radio as AntdRadioGroup, Space as AntdButtonSpace } from 'antd';
import {
  createBehavior,
  createDesigner,
  createResource,
  GlobalRegistry,
  type ITreeNode,
  TreeNode,
} from '@wordrhyme/designable-core';
import {
  ArrayCards,
  ArrayTable,
  Card,
  Cascader,
  Checkbox,
  DatePicker,
  Field as AntdField,
  Form as AntdForm,
  FormCollapse,
  FormGrid,
  FormLayout,
  FormTab,
  Input,
  NumberPicker,
  ObjectContainer,
  Password,
  Radio,
  Rate,
  Select,
  Slider,
  Space,
  Switch,
  Text,
  TimePicker,
  Transfer,
  TreeSelect,
  Upload,
} from '@wordrhyme/designable-formily-antd';
import {
  Card as ShadcnCard,
  Checkbox as ShadcnCheckbox,
  Column as ShadcnColumn,
  Field as ShadcnField,
  Form as ShadcnForm,
  Input as ShadcnInput,
  NumberInput as ShadcnNumberInput,
  ObjectContainer as ShadcnObjectContainer,
  Rating as ShadcnRating,
  Row as ShadcnRow,
  Select as ShadcnSelect,
  Separator as ShadcnSeparator,
  Switch as ShadcnSwitch,
  Text as ShadcnText,
} from '@wordrhyme/designable-formily-shadcn';
import {
  type ITransformerOptions,
  transformToSchema,
  transformToTreeNode,
} from '@wordrhyme/designable-formily-transformer';
import { MonacoInput, SettingsForm } from '@wordrhyme/designable-react-settings-form';
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
  useSelectedNode,
  useTreeNode,
  ViewPanel,
  ViewportPanel,
  ViewToolsWidget,
  Workbench,
  Workspace,
  WorkspacePanel,
} from '@wordrhyme/designable-react';
import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, HTMLAttributes } from 'react';
import {
  createForm,
  Input as RuntimeInput,
  Textarea as RuntimeTextarea,
} from '@wordrhyme/formily-shadcn';
import {
  cloneJsonObject,
  createDesignRegistry,
  FormilyDesignRenderer,
  getBlockComponentId,
  toDesignableResources,
} from '../src';
import type {
  DesignBlockDefinition,
  DesignContribution,
  DesignRegistry,
  FormilyDesignDocument,
  JsonObject,
  JsonValue,
} from '../src';
import type { ComponentProps, ComponentType, ReactNode } from 'react';

const FORMILY_TRANSFORM_OPTIONS: ITransformerOptions = {
  designableFieldName: 'Field',
  designableFormName: 'Form',
};

const shopContribution: DesignContribution = {
  pluginId: 'com.wordrhyme.shop',
  pluginVersion: '0.1.0',
  blocks: [
    {
      id: 'shop.productHero',
      title: 'Product Hero',
      category: 'Shop',
      icon: 'Package',
      component: 'ShopProductHero',
      surfaces: ['web'],
      defaultProps: {
        title: 'Studio Lamp',
        subtitle: 'Local published products rendered from the editor canvas.',
        cta: 'View products',
      },
      propsSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', title: 'Title' },
          subtitle: { type: 'string', title: 'Subtitle' },
          cta: { type: 'string', title: 'CTA' },
        },
      },
    },
    {
      id: 'shop.productGrid',
      title: 'Product Grid',
      category: 'Shop',
      icon: 'LayoutGrid',
      component: 'ShopProductGrid',
      surfaces: ['web'],
      defaultProps: {
        source: 'local',
        limit: 4,
      },
      propsSchema: {
        type: 'object',
        properties: {
          source: {
            type: 'string',
            title: 'Source',
            enum: ['local', '1688'],
          },
          limit: { type: 'number', title: 'Limit' },
        },
      },
    },
    {
      id: 'shop.adminMetric',
      title: 'Admin Metric',
      surfaces: ['admin'],
    },
  ],
};

const registry = createDesignRegistry([shopContribution], { surface: 'web' });

const initialDocument: FormilyDesignDocument = {
  meta: {
    pageId: 'shop-editor-demo',
    route: '/products',
    editor: 'designable-formily',
  },
  form: {
    labelCol: 0,
    wrapperCol: 24,
  },
  schema: {
    type: 'object',
    properties: {
      hero: {
        type: 'void',
        'x-component': 'ShopProductHero',
        'x-component-props': {
          title: 'Studio Lamp',
          subtitle: 'Local published products rendered from the editor canvas.',
          cta: 'View products',
        },
      },
      grid: {
        type: 'void',
        'x-component': 'ShopProductGrid',
        'x-component-props': {
          source: 'local',
          limit: 4,
        },
      },
    },
  },
};

const editorInitialTree = transformToTreeNode(initialDocument, FORMILY_TRANSFORM_OPTIONS);

function ProductHeroBlock({
  title = 'Featured collection',
  subtitle = 'Published products from the tenant catalog.',
  cta = 'View products',
}: {
  title?: string;
  subtitle?: string;
  cta?: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Shop plugin block
      </p>
      <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
      <button
        type="button"
        className="mt-4 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white"
      >
        {cta}
      </button>
    </section>
  );
}

function ProductGridBlock({
  source = 'local',
  limit = 4,
}: {
  source?: string;
  limit?: number;
}) {
  const products = [
    { id: 'local-1', name: 'Studio Lamp', price: '$89' },
    { id: 'local-2', name: 'Oak Desk Tray', price: '$42' },
    { id: 'local-3', name: 'Canvas Tote', price: '$28' },
    { id: 'local-4', name: 'Ceramic Cup', price: '$24' },
    { id: 'local-5', name: 'Wool Throw', price: '$64' },
    { id: 'local-6', name: 'Brass Hook', price: '$18' },
  ].slice(0, limit);

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 text-slate-950 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold">Public catalog</h2>
        <p className="text-sm text-slate-600">
          Source: <span className="font-medium">{source}</span>
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {products.map((product) => (
          <article
            key={product.id}
            className="rounded-md border border-slate-200 bg-white p-3"
          >
            <div className="mb-3 aspect-square rounded bg-slate-100" />
            <h3 className="text-sm font-medium">{product.name}</h3>
            <p className="text-xs text-slate-500">{product.price}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function UnknownBlock({ component }: { component: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
      Unknown block: {component}
    </div>
  );
}

const runtimeComponents = {
  ShopProductHero: ProductHeroBlock,
  ShopProductGrid: ProductGridBlock,
};

const runtimeFormilyComponents = {
  ShopProductHero: { component: ProductHeroBlock },
  ShopProductGrid: { component: ProductGridBlock },
};

const designableIconAliases: Record<string, string> = {
  LayoutGrid: 'Component',
  Package: 'Component',
};

function toDesignableIcon(icon: DesignBlockDefinition['icon']) {
  return typeof icon === 'string' ? (designableIconAliases[icon] ?? icon) : icon;
}

type DesignableCanvasComponent = ComponentType<HTMLAttributes<HTMLDivElement>> & {
  Behavior?: ReturnType<typeof createBehavior>;
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
const WorkspaceHost = Workspace as WithChildren<{ id: string }>;

const officialInputResources = createResource(
  {
    title: '输入框',
    icon: 'InputSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          title: '输入框',
          type: 'string',
          'x-component': 'Input',
        },
      },
    ],
  },
  {
    title: '多行输入',
    icon: 'TextAreaSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          title: '多行输入',
          type: 'string',
          'x-component': 'TextArea',
        },
      },
    ],
  },
  {
    title: '密码输入',
    icon: 'PasswordSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          title: '密码输入',
          type: 'string',
          'x-component': 'Password',
        },
      },
    ],
  },
  {
    title: '数字输入',
    icon: 'NumberPickerSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          title: '数字输入',
          type: 'number',
          'x-component': 'NumberPicker',
        },
      },
    ],
  },
  {
    title: '评分器',
    icon: 'RateSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          title: '评分器',
          type: 'number',
          'x-component': 'Rate',
        },
      },
    ],
  },
  {
    title: '滑动条',
    icon: 'SliderSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          title: '滑动条',
          type: 'number',
          'x-component': 'Slider',
        },
      },
    ],
  },
  {
    title: '选择框',
    icon: 'SelectSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          title: '选择框',
          type: 'string',
          'x-component': 'Select',
        },
      },
    ],
  },
  {
    title: '树选择',
    icon: 'TreeSelectSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          title: '树选择',
          type: 'string',
          'x-component': 'TreeSelect',
        },
      },
    ],
  },
  {
    title: '联级选择',
    icon: 'CascaderSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          title: '联级选择',
          type: 'string',
          'x-component': 'Cascader',
        },
      },
    ],
  },
  {
    title: '穿梭框',
    icon: 'TransferSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          title: '穿梭框',
          type: 'array',
          'x-component': 'Transfer',
        },
      },
    ],
  },
  {
    title: '复选框组',
    icon: 'CheckboxGroupSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          title: '复选框组',
          type: 'array',
          'x-component': 'Checkbox.Group',
        },
      },
    ],
  },
  {
    title: '单选框组',
    icon: 'RadioGroupSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          title: '单选框组',
          type: 'string',
          'x-component': 'Radio.Group',
        },
      },
    ],
  },
  {
    title: '日期选择',
    icon: 'DatePickerSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          title: '日期选择',
          type: 'string',
          'x-component': 'DatePicker',
        },
      },
    ],
  },
  {
    title: '日期范围',
    icon: 'DateRangePickerSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          title: '日期范围',
          type: 'array',
          'x-component': 'DateRangePicker',
        },
      },
    ],
  },
  {
    title: '时间选择',
    icon: 'TimePickerSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          title: '时间选择',
          type: 'string',
          'x-component': 'TimePicker',
        },
      },
    ],
  },
  {
    title: '时间范围',
    icon: 'TimeRangePickerSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          title: '时间范围',
          type: 'array',
          'x-component': 'TimeRangePicker',
        },
      },
    ],
  },
  {
    title: '上传',
    icon: 'UploadSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          title: '上传',
          type: 'array',
          'x-component': 'Upload',
        },
      },
    ],
  },
  {
    title: '拖拽上传',
    icon: 'UploadDraggerSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          title: '拖拽上传',
          type: 'array',
          'x-component': 'Upload.Dragger',
        },
      },
    ],
  },
  {
    title: '开关',
    icon: 'SwitchSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          title: '开关',
          type: 'boolean',
          'x-component': 'Switch',
        },
      },
    ],
  },
  {
    title: '{Object}',
    icon: 'ObjectSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          title: '{Object}',
          type: 'object',
          'x-component': 'Object',
        },
      },
    ],
  },
);

const officialLayoutResources = createResource(
  {
    title: '卡片',
    icon: 'CardSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          type: 'void',
          'x-component': 'Card',
        },
      },
    ],
  },
  {
    title: '表格布局',
    icon: 'GridSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          type: 'void',
          'x-component': 'FormGrid',
        },
      },
    ],
  },
  {
    title: '标签页',
    icon: 'TabSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          type: 'void',
          'x-component': 'FormTab',
        },
      },
    ],
  },
  {
    title: '表单布局',
    icon: 'FormLayoutSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          type: 'void',
          'x-component': 'FormLayout',
        },
      },
    ],
  },
  {
    title: '折叠面板',
    icon: 'CollapseSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          type: 'void',
          'x-component': 'FormCollapse',
        },
      },
    ],
  },
  {
    title: '间距',
    icon: 'SpaceSource',
    elements: [
      {
        componentName: 'Field',
        props: {
          type: 'void',
          'x-component': 'Space',
        },
      },
    ],
  },
);

const OfficialFormCanvas = observer((props: HTMLAttributes<HTMLDivElement>) => {
  const { children, ...rest } = props;

  return (
    <div
      {...getDomProps(rest as Record<string, unknown>)}
      className="wr-official-form-canvas"
    >
      {children}
    </div>
  );
}) as DesignableCanvasComponent;

OfficialFormCanvas.Behavior = createBehavior({
  name: 'Form',
  selector: 'Form',
  designerProps: {
    title: '表单',
    icon: 'FormLayoutSource',
    draggable: false,
    droppable: true,
    deletable: false,
    propsSchema: {
      type: 'object',
      properties: {
        labelCol: { type: 'number', title: '标签网格宽度' },
        wrapperCol: { type: 'number', title: '组件网格宽度' },
      },
    },
  },
  designerLocales: {
    'zh-cn': { title: '表单' },
    'en-us': { title: 'Form' },
  },
});

const OfficialFieldCanvas = observer((props: HTMLAttributes<HTMLDivElement>) => {
  const { children, ...rest } = props;
  const node = useTreeNode();
  const title = String(node?.props?.title ?? node?.props?.['x-component'] ?? 'Field');

  return (
    <div
      {...getDomProps(rest as Record<string, unknown>)}
      className="wr-official-field-preview"
    >
      <span>{title}</span>
      <div className="wr-official-field-preview-control" />
      {children}
    </div>
  );
}) as DesignableCanvasComponent;

OfficialFieldCanvas.Behavior = createBehavior({
  name: 'Field',
  selector: 'Field',
  designerProps: {
    draggable: true,
    droppable: true,
    cloneable: true,
    deletable: true,
  },
});

const officialEditorComponents = {
  Form: AntdForm,
  Field: AntdField,
  Input,
  Select,
  TreeSelect,
  Cascader,
  Radio,
  Checkbox,
  Slider,
  Rate,
  NumberPicker,
  Transfer,
  Password,
  DatePicker,
  TimePicker,
  Upload,
  Switch,
  Text,
  Card,
  ArrayCards,
  ArrayTable,
  Space,
  FormTab,
  FormCollapse,
  FormGrid,
  FormLayout,
  ObjectContainer,
};

const officialInitialTree: ITreeNode = {
  componentName: 'Form',
  props: {
    labelCol: 6,
    wrapperCol: 12,
  },
  children: [
    {
      componentName: 'Field',
      props: {
        type: 'string',
        title: 'Input',
        name: 'input',
        'x-decorator': 'FormItem',
        'x-component': 'Input',
      },
    },
  ],
};

function OfficialPreviewWidget({ tree }: { tree: TreeNode }) {
  const form = useMemo(() => createForm(), []);

  return (
    <FormilyDesignRenderer form={form} document={toFormilyDocument(tree.serialize())} />
  );
}

const shadcnEditorComponents = {
  Form: ShadcnForm,
  Field: ShadcnField,
  Input: ShadcnInput,
  Select: ShadcnSelect,
  NumberInput: ShadcnNumberInput,
  Switch: ShadcnSwitch,
  Checkbox: ShadcnCheckbox,
  Rating: ShadcnRating,
  Card: ShadcnCard,
  Row: ShadcnRow,
  Column: ShadcnColumn,
  Separator: ShadcnSeparator,
  ObjectContainer: ShadcnObjectContainer,
  Text: ShadcnText,
};

const shadcnInitialTree: ITreeNode = {
  componentName: 'Form',
  props: {
    layout: {
      density: 'md',
      labelPlacement: 'top',
    },
  },
  children: [
    {
      componentName: 'Field',
      props: {
        type: 'string',
        title: 'Product name',
        name: 'productName',
        default: 'Studio Lamp',
        'x-decorator': 'FormItem',
        'x-decorator-props': {
          layout: 'horizontal',
          labelWidth: '120px',
          tooltip: 'Public product title shown in the storefront.',
          wrapperWidth: '320px',
        },
        'x-component': 'Input',
        'x-component-props': {
          addonAfter: 'CN',
          addonBefore: 'SKU',
          allowClear: true,
          bordered: false,
          placeholder: 'Studio Lamp',
          size: 'large',
        },
      },
    },
    {
      componentName: 'Field',
      props: {
        type: 'string',
        title: 'Description',
        name: 'description',
        default: 'A warm desk lamp with a brass arm and linen shade.',
        'x-decorator': 'FormItem',
        'x-component': 'Input.TextArea',
        'x-component-props': {
          autoSize: true,
          bordered: false,
          maxLength: 120,
          placeholder: 'Product description',
          showCount: true,
        },
      },
    },
    {
      componentName: 'Field',
      props: {
        type: 'string',
        title: 'Source',
        name: 'source',
        enum: [
          { label: 'Local', value: 'local' },
          { label: '1688', value: '1688' },
        ],
        default: 'local',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        'x-component-props': {
          allowClear: true,
          bordered: false,
          listHeight: 120,
          notFoundContent: 'No source',
          placeholder: 'Select source',
          showSearch: true,
        },
      },
    },
    {
      componentName: 'Field',
      props: {
        type: 'number',
        title: 'Limit',
        name: 'limit',
        default: 4,
        'x-decorator': 'FormItem',
        'x-component': 'NumberInput',
        'x-component-props': {
          bordered: false,
          min: 1,
          max: 12,
          placeholder: 'Limit',
          precision: 0,
          size: 'small',
        },
      },
    },
    {
      componentName: 'Field',
      props: {
        type: 'boolean',
        title: 'Featured',
        name: 'featured',
        default: true,
        'x-decorator': 'FormItem',
        'x-component': 'Checkbox',
        'x-component-props': {
          label: 'Show in featured collection',
          size: 'small',
        },
      },
    },
    {
      componentName: 'Field',
      props: {
        type: 'boolean',
        title: 'Published',
        name: 'published',
        default: true,
        'x-decorator': 'FormItem',
        'x-component': 'Switch',
        'x-component-props': {
          size: 'large',
        },
      },
    },
    {
      componentName: 'Field',
      props: {
        type: 'number',
        title: 'Rating',
        name: 'rating',
        default: 2,
        'x-decorator': 'FormItem',
        'x-component': 'Rating',
        'x-component-props': {
          allowClear: true,
          count: 3,
          tooltips: ['Basic', 'Good', 'Best'],
        },
      },
    },
    {
      componentName: 'Field',
      props: {
        type: 'void',
        'x-component': 'Card',
        'x-component-props': {
          bordered: false,
          title: 'Shadcn block',
          description: 'This card is rendered by shadcn materials.',
          extra: 'Manage',
          type: 'inner',
        },
      },
      children: [
        {
          componentName: 'Field',
          props: {
            type: 'void',
            'x-component': 'Text',
            'x-component-props': {
              content: 'Drop more shadcn fields into this card.',
              mode: 'p',
              className: 'text-sm text-muted-foreground',
            },
          },
        },
      ],
    },
  ],
};

const RuntimeInputWithTextArea = Object.assign(
  (props: ComponentProps<typeof RuntimeInput>) => <RuntimeInput {...props} />,
  {
    TextArea: RuntimeTextarea,
  },
);

function RuntimeText({
  content,
  mode,
  value,
  ...props
}: {
  content?: string;
  mode?: 'h1' | 'h2' | 'h3' | 'normal' | 'p';
  value?: string;
  [key: string]: unknown;
}) {
  const Tag = mode === 'normal' || !mode ? 'div' : mode;

  return <Tag {...props}>{content || value || 'Text'}</Tag>;
}

function RuntimeCard({
  bordered = true,
  children,
  description,
  extra,
  title,
  type,
}: {
  bordered?: boolean;
  children?: ReactNode;
  description?: ReactNode;
  extra?: ReactNode;
  title?: ReactNode;
  type?: 'inner' | '';
}) {
  return (
    <section
      data-slot="card"
      className={`rounded-lg bg-white p-4 text-slate-950 ${
        bordered === false ? '' : 'border border-slate-200 shadow-sm'
      } ${type === 'inner' ? 'bg-slate-50' : ''}`}
    >
      {(title || description || extra) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h3 className="text-base font-semibold">{title}</h3>}
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          {extra && <div className="text-sm text-slate-500">{extra}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

function ShadcnTreePreview({ tree }: { tree: ITreeNode | undefined }) {
  const form = useMemo(() => createForm(), []);
  const document = useMemo(() => toFormilyDocument(tree), [tree]);
  const components = useMemo(
    () => ({
      fields: {
        Input: { component: RuntimeInputWithTextArea, decorator: 'FormItem' },
        Card: { component: RuntimeCard },
        Text: { component: RuntimeText },
      },
    }),
    [],
  );

  return (
    <FormilyDesignRenderer form={form} document={document} components={components} />
  );
}

const OfficialSelectedNodeSync = observer(() => {
  const designer = useDesigner();

  useEffect(() => {
    GlobalRegistry.setDesignerLanguage('zh-cn');

    const selectInitialField = () => {
      const tree = designer?.getCurrentTree();
      const inputNode = tree?.children?.[0];

      if (!tree || !inputNode) return;

      const selection = tree.operation.selection;
      const selectedNode = selection.selectedNodes.find(Boolean);
      const shouldSelectInitialField =
        selection.length === 0 || selectedNode?.id === tree.id;

      if (shouldSelectInitialField) {
        selection.select(inputNode);
      }
    };

    const timeoutIds = [0, 80, 240, 500].map((delay) =>
      window.setTimeout(selectInitialField, delay),
    );

    return () => timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
  }, [designer]);

  return null;
});

function OfficialLogo() {
  return (
    <div className="wr-official-logo" aria-label="Formily visual editor">
      <img
        alt="Formily"
        src="https://img.alicdn.com/imgextra/i2/O1CN01Kq3OHU1fph6LGqjIz_!!6000000004056-55-tps-1141-150.svg"
        style={{ margin: '12px 8px', height: 18, width: 'auto' }}
      />
    </div>
  );
}

function OfficialActions() {
  const [language, setLanguage] = useState(
    () => GlobalRegistry.getDesignerLanguage() || 'zh-cn',
  );

  return (
    <AntdButtonSpace className="wr-official-actions">
      <Button href="https://designable-fusion.formilyjs.org">Alibaba Fusion</Button>
      <AntdRadioGroup.Group
        value={language}
        optionType="button"
        options={[
          { label: 'English', value: 'en-us' },
          { label: '简体中文', value: 'zh-cn' },
          { label: '한국어', value: 'ko-kr' },
        ]}
        onChange={(event) => {
          GlobalRegistry.setDesignerLanguage(event.target.value);
          setLanguage(event.target.value);
        }}
      />
      <Button href="https://github.com/alibaba/designable" target="_blank">
        <GithubOutlined />
        Github
      </Button>
      <Button>
        <TextWidget token="save" defaultMessage="Save" />
      </Button>
      <Button type="primary">
        <TextWidget token="publish" defaultMessage="Publish" />
      </Button>
    </AntdButtonSpace>
  );
}

function EditorShellStyles() {
  return (
    <style>
      {`
        .wr-designable-story {
          position: relative;
          height: 100dvh;
          min-height: 0;
          overflow: hidden;
          background: #fff;
          color: #222;
        }

        .wr-designable-story .dn-main-panel-container {
          min-height: 0;
        }

        .wr-designable-story .dn-main-panel-container.absolute {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .wr-designable-story .dn-main-panel-header {
          min-height: 56px;
          padding: 0 12px;
          background: #fff;
        }

        .wr-designable-story .dn-main-panel {
          background: #f7f7f7;
        }

        .wr-official-logo {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #6d31d5;
          font-weight: 800;
          letter-spacing: 0;
        }

        .wr-official-logo-mark {
          font-size: 22px;
          line-height: 1;
        }

        .wr-official-logo-text {
          font-size: 26px;
          line-height: 1;
        }

        .wr-official-logo-version {
          border-radius: 7px;
          background: #6d31d5;
          color: #fff;
          font-size: 9px;
          font-weight: 700;
          line-height: 1;
          padding: 2px 4px;
        }

        .wr-official-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .wr-official-action {
          height: 36px;
          border: 1px solid #d9d9d9;
          border-radius: 2px;
          background: #fff;
          color: #222;
          font-size: 15px;
          line-height: 34px;
          padding: 0 16px;
          white-space: nowrap;
        }

        .wr-official-action.is-active {
          border-color: #1890ff;
          color: #1890ff;
        }

        .wr-official-action.is-primary {
          border-color: #1890ff;
          background: #1890ff;
          color: #fff;
        }

        .wr-official-editor .dn-composite-panel-tabs-pane {
          min-width: 52px;
          min-height: 48px;
          padding: 8px;
        }

        .wr-official-editor .dn-composite-panel-tabs-content {
          width: clamp(300px, 22vw, 360px);
        }

        .wr-official-editor .dn-settings-panel {
          width: clamp(300px, 24vw, 360px);
        }

        .wr-official-editor .dn-composite-panel-tabs-header,
        .wr-official-editor .dn-settings-panel-header {
          min-height: 52px;
          padding: 0 10px;
          align-items: center;
        }

        .wr-official-editor .dn-composite-panel-tabs-header-title,
        .wr-official-editor .dn-settings-panel-header-title {
          font-size: 20px;
          font-weight: 500;
        }

        .wr-official-editor .dn-resource-header {
          height: 36px;
          background: #f0f0f0;
          border-bottom: 1px solid #d9d9d9;
        }

        .wr-official-editor .dn-resource-content {
          grid-auto-rows: 104px;
        }

        .wr-official-editor .dn-resource-item {
          min-height: 104px;
          background: #fff;
        }

        .wr-official-editor .dn-resource-item-icon {
          color: #666;
        }

        .wr-official-editor .dn-resource-item-text {
          margin-top: 6px;
          font-size: 14px;
          color: #333;
        }

        .wr-official-editor .dn-workspace-panel {
          padding: 4px;
          background: #f2f2f2;
        }

        .wr-official-editor .dn-toolbar-panel {
          min-height: 30px;
          background: #f8f8f8;
          border: 1px solid #d9d9d9;
          border-bottom: 0;
        }

        .wr-official-editor .dn-viewport {
          background: #fff;
          border: 1px solid #1890ff;
        }

        .wr-official-editor .dn-empty {
          background: #fff;
        }

        .wr-official-editor .dn-empty .animations {
          gap: 10px;
        }

        .wr-official-editor .dn-empty .hotkeys-list {
          color: #888;
          font-size: 14px;
          line-height: 28px;
        }

        .wr-official-form-canvas {
          min-height: 100%;
          background: #fff;
        }

        .wr-official-field-preview {
          display: grid;
          grid-template-columns: 120px minmax(160px, 1fr);
          align-items: center;
          gap: 12px;
          margin: 12px;
          padding: 10px 12px;
          border: 1px dashed #bfbfbf;
          color: #333;
          font-size: 14px;
        }

        .wr-official-field-preview-control {
          height: 32px;
          border: 1px solid #d9d9d9;
          border-radius: 2px;
          background: #fff;
        }

        .wr-official-settings {
          padding: 0 22px 16px;
          font-size: 14px;
        }

        .wr-official-breadcrumb {
          height: 44px;
          display: flex;
          align-items: center;
          border-bottom: 1px solid #eee;
          color: #888;
          font-size: 14px;
        }

        .wr-official-setting-row {
          display: grid;
          grid-template-columns: 118px 1fr;
          align-items: center;
          min-height: 48px;
          border-bottom: 1px solid #eee;
          gap: 12px;
          color: #333;
        }

        .wr-official-setting-row input,
        .wr-official-setting-row select {
          width: 100%;
          height: 32px;
          border: 1px solid #d9d9d9;
          border-radius: 2px;
          background: #fff;
          color: #333;
          text-align: center;
          font-size: 14px;
        }

        .wr-official-setting-row select:disabled {
          opacity: 1;
        }

        .wr-official-switch {
          justify-self: end;
          position: relative;
          width: 46px;
          height: 24px;
          border: 0;
          border-radius: 16px;
          background: #bfbfbf;
          padding: 2px;
        }

        .wr-official-switch span {
          display: block;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        .wr-official-switch.is-on {
          background: #1890ff;
        }

        .wr-official-switch.is-on span {
          transform: translateX(22px);
        }

        @media (max-width: 1100px) {
          .wr-official-actions {
            gap: 6px;
          }

          .wr-official-action {
            padding: 0 10px;
          }
        }

        .wr-official-logo img {
          display: block;
          height: 18px;
          width: auto;
          margin: 12px 8px;
        }

        .wr-official-editor .dn-main-panel-header {
          min-height: auto;
          padding: 4px;
        }

        .wr-official-editor .dn-composite-panel-tabs-pane {
          min-width: 48px;
          min-height: 48px;
          padding: 10px;
        }

        .wr-official-editor .dn-composite-panel-tabs-content,
        .wr-official-editor .dn-settings-panel {
          width: 300px;
        }

        .wr-official-editor .dn-composite-panel-tabs-header,
        .wr-official-editor .dn-settings-panel-header {
          min-height: auto;
          padding: 14px 7px;
          align-items: initial;
        }

        .wr-official-editor .dn-composite-panel-tabs-header-title,
        .wr-official-editor .dn-settings-panel-header-title {
          font-size: 20px;
          font-weight: normal;
        }

        .wr-official-editor .dn-resource-header {
          height: auto;
          background-color: var(--dn-panel-active-bg-color);
          border-bottom: 1px solid var(--dn-panel-border-color);
        }

        .wr-official-editor .dn-resource-content {
          grid-auto-rows: auto;
        }

        .wr-official-editor .dn-resource-item {
          min-height: 40px;
          background: var(--dn-resource-content-bg-color);
        }

        .wr-official-editor .dn-resource-item-icon {
          color: inherit;
        }

        .wr-official-editor .dn-resource-item-text {
          margin-top: 0;
          margin-bottom: 12px;
          color: inherit;
          font-size: 12px;
          line-height: 1;
        }

        .wr-official-editor .dn-workspace-panel {
          padding: 4px;
          background-color: var(--dn-workspace-panel-bg-color);
        }

        .wr-official-editor .dn-viewport {
          border: 0;
          background: transparent;
        }
      `}
    </style>
  );
}

function getComponentProps(nodeProps: Record<string, unknown> | undefined): JsonObject {
  const props = nodeProps?.['x-component-props'];
  return cloneJsonObject((props && typeof props === 'object' ? props : {}) as JsonObject);
}

function getDomProps(props: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(props).filter(([key]) => key.startsWith('data-')),
  ) as HTMLAttributes<HTMLDivElement>;
}

const FormCanvas = observer((props: HTMLAttributes<HTMLDivElement>) => {
  const { children, ...rest } = props;

  return (
    <main
      {...getDomProps(rest as Record<string, unknown>)}
      className="min-h-full space-y-5 bg-white p-6 text-slate-950"
    >
      {children || (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
          Drop Shop blocks here
        </div>
      )}
    </main>
  );
}) as DesignableCanvasComponent;

FormCanvas.Behavior = createBehavior({
  name: 'Form',
  selector: 'Form',
  designerProps: {
    droppable: true,
    draggable: false,
    deletable: false,
  },
});

const FieldCanvas = observer((props: HTMLAttributes<HTMLDivElement>) => {
  const { children, ...rest } = props;
  const node = useTreeNode();
  const component = String(node?.props?.['x-component'] ?? '');
  const componentProps = getComponentProps(node?.props);
  const Component = runtimeComponents[component as keyof typeof runtimeComponents];

  return (
    <div
      {...getDomProps(rest as Record<string, unknown>)}
      className="relative rounded-xl border border-transparent p-1 transition hover:border-blue-400"
    >
      {Component ? (
        <Component {...componentProps} />
      ) : (
        <UnknownBlock component={component} />
      )}
      {children}
    </div>
  );
}) as DesignableCanvasComponent;

function createFieldBehaviors(targetRegistry: Pick<DesignRegistry, 'blocks'>) {
  return createBehavior(
    Array.from(targetRegistry.blocks.values()).map((block) => {
      const component = getBlockComponentId(block);

      return {
        name: component,
        selector: (node) =>
          node.componentName === 'Field' && node.props?.['x-component'] === component,
        designerProps: {
          title: block.title,
          icon: toDesignableIcon(block.icon),
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
      };
    }),
  );
}

FieldCanvas.Behavior = createFieldBehaviors(registry);

const editorComponents = {
  Form: FormCanvas,
  Field: FieldCanvas,
};

function createEditorResources(targetRegistry: Pick<DesignRegistry, 'blocks'>) {
  return createResource(
    ...toDesignableResources(targetRegistry).map((resource) => ({
      title: resource.title,
      icon: toDesignableIcon(resource.icon) ?? 'Component',
      elements: [resource.node],
    })),
  );
}

function createBlockNode(block: DesignBlockDefinition): ITreeNode {
  return {
    componentName: 'Field',
    props: {
      type: 'void',
      'x-component': getBlockComponentId(block),
      'x-component-props': cloneJsonObject(block.defaultProps),
    },
  };
}

function toFormilyDocument(tree: ITreeNode | undefined): FormilyDesignDocument {
  if (!tree) {
    return {
      meta: initialDocument.meta,
      schema: {
        type: 'object',
        properties: {},
      },
    };
  }

  return {
    meta: initialDocument.meta,
    ...transformToSchema(tree, FORMILY_TRANSFORM_OPTIONS),
  };
}

function SchemaPreview({ document }: { document: FormilyDesignDocument }) {
  return (
    <pre
      data-testid="editor-schema-output"
      className="max-h-80 overflow-auto rounded-md bg-slate-950 p-3 text-xs leading-5 text-slate-100"
    >
      {JSON.stringify(document, null, 2)}
    </pre>
  );
}

function toFormilySchema(
  tree: TreeNode | ITreeNode,
  options = FORMILY_TRANSFORM_OPTIONS,
) {
  const sourceTree = tree instanceof TreeNode ? tree.serialize() : tree;

  return transformToSchema(sourceTree, options);
}

function SchemaEditorWidget({
  onChange,
  options = FORMILY_TRANSFORM_OPTIONS,
  tree,
}: {
  onChange?: (tree: ITreeNode) => void;
  options?: ITransformerOptions;
  tree: TreeNode;
}) {
  return (
    <MonacoInput
      value={JSON.stringify(toFormilySchema(tree, options), null, 2)}
      language="json"
      onChange={(value) => {
        try {
          onChange?.(transformToTreeNode(JSON.parse(value), options));
        } catch {
          // Keep the editor usable while the JSON document is temporarily invalid.
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

function toMarkupAttributeValue(value: unknown) {
  if (typeof value === 'string') return `"${value}"`;
  return `{${JSON.stringify(value)}}`;
}

function takeSchemaFieldTag(node: ITreeNode) {
  if (node.props?.type === 'string') return 'SchemaField.String';
  if (node.props?.type === 'number') return 'SchemaField.Number';
  if (node.props?.type === 'boolean') return 'SchemaField.Boolean';
  if (node.props?.type === 'date') return 'SchemaField.Date';
  if (node.props?.type === 'datetime') return 'SchemaField.DateTime';
  if (node.props?.type === 'array') return 'SchemaField.Array';
  if (node.props?.type === 'object') return 'SchemaField.Object';
  if (node.props?.type === 'void') return 'SchemaField.Void';
  return 'SchemaField.Markup';
}

function printMarkupAttributes(node: ITreeNode) {
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
        key === 'type'
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

function transformToMarkupSchemaCode(
  tree: TreeNode,
  {
    componentPackage,
    extraImports = [],
    setupCode = '',
  }: {
    componentPackage: string;
    extraImports?: string[];
    setupCode?: string;
  },
) {
  const serialized = tree.serialize();
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
  componentPackage: string;
  extraImports?: string[];
  setupCode?: string;
  tree: TreeNode;
}) {
  return (
    <MonacoInput
      options={{ readOnly: true }}
      value={transformToMarkupSchemaCode(tree, {
        componentPackage,
        extraImports,
        setupCode,
      })}
      language="typescript"
    />
  );
}

const EditorActions = observer(
  ({
    onPersist,
    onStatus,
  }: {
    onPersist: (document: FormilyDesignDocument) => void;
    onStatus: (message: string) => void;
  }) => {
    const designer = useDesigner();

    const persist = () => {
      onPersist(toFormilyDocument(designer?.getCurrentTree()?.serialize()));
      onStatus('Schema saved from editor tree');
    };

    const insertBlock = (blockId: string) => {
      const block = registry.blocks.get(blockId);
      const tree = designer?.getCurrentTree();
      if (!block || !tree || !designer) return;

      const inserted = tree.append(designer.createNode(createBlockNode(block)));
      const first = inserted[0];
      if (first) {
        tree.operation.selection.select(first);
      }
      onPersist(toFormilyDocument(tree.serialize()));
      onStatus(`Inserted ${block.title}`);
    };

    return (
      <div className="flex items-center gap-2 pr-2">
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
          onClick={() => insertBlock('shop.productGrid')}
        >
          Add Product Grid to canvas
        </button>
        <button
          type="button"
          className="rounded-md bg-slate-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          onClick={persist}
        >
          Save schema
        </button>
      </div>
    );
  },
);

const PropertyPanel = observer(
  ({
    onPersist,
    onStatus,
  }: {
    onPersist: (document: FormilyDesignDocument) => void;
    onStatus: (message: string) => void;
  }) => {
    const node = useSelectedNode();
    const designer = useDesigner();
    const component = String(node?.props?.['x-component'] ?? '');
    const block = Array.from(registry.blocks.values()).find(
      (candidate) => getBlockComponentId(candidate) === component,
    );

    if (!node || node.componentName === 'Form' || !block) {
      return (
        <div className="space-y-3 p-4 text-sm text-slate-500">
          <p>Select a Shop block on the canvas.</p>
          <p className="rounded-md bg-slate-100 p-3">
            The editor keeps Designable/Formily schema as the persisted document.
          </p>
        </div>
      );
    }

    const componentProps = getComponentProps(node.props);

    const setComponentProp = (key: string, value: JsonValue) => {
      node.setProps({
        'x-component-props': {
          ...componentProps,
          [key]: value,
        },
      });
      onPersist(toFormilyDocument(designer?.getCurrentTree()?.serialize()));
      onStatus(`Updated ${block.title}`);
    };

    const onTextChange = (key: string) => (event: ChangeEvent<HTMLInputElement>) => {
      setComponentProp(key, event.currentTarget.value);
    };

    return (
      <div className="space-y-4 p-4 text-sm text-slate-950">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Selected block</p>
          <h3 className="mt-1 font-semibold">{block.title}</h3>
        </div>
        {component === 'ShopProductHero' && (
          <div className="space-y-3">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-500">Title</span>
              <input
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950"
                value={String(componentProps.title ?? '')}
                onChange={onTextChange('title')}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-500">Subtitle</span>
              <input
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950"
                value={String(componentProps.subtitle ?? '')}
                onChange={onTextChange('subtitle')}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-500">CTA</span>
              <input
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950"
                value={String(componentProps.cta ?? '')}
                onChange={onTextChange('cta')}
              />
            </label>
          </div>
        )}
        {component === 'ShopProductGrid' && (
          <div className="space-y-3">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-500">Source</span>
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950"
                value={String(componentProps.source ?? 'local')}
                onChange={(event) =>
                  setComponentProp('source', event.currentTarget.value)
                }
              >
                <option value="local">local</option>
                <option value="1688">1688</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-500">Limit</span>
              <input
                type="number"
                min={1}
                max={6}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950"
                value={Number(componentProps.limit ?? 4)}
                onChange={(event) =>
                  setComponentProp('limit', Number(event.currentTarget.value))
                }
              />
            </label>
          </div>
        )}
      </div>
    );
  },
);

function EditorPreview({ tree }: { tree: ITreeNode | undefined }) {
  const form = useMemo(() => createForm(), []);

  return (
    <div className="min-h-full bg-white p-6 text-slate-950">
      <FormilyDesignRenderer
        form={form}
        document={toFormilyDocument(tree)}
        components={{
          fields: runtimeFormilyComponents,
        }}
      />
    </div>
  );
}

function OfficialEditorShellDemo() {
  const engine = useMemo(
    () =>
      createDesigner({
        rootComponentName: 'Form',
        defaultComponentTree: officialInitialTree,
      }),
    [],
  );

  return (
    <div
      data-testid="visual-editor-shell"
      className="wr-designable-story wr-official-editor"
    >
      <EditorShellStyles />
      <DesignerHost engine={engine} position="absolute">
        <OfficialSelectedNodeSync />
        <StudioPanelHost logo={<OfficialLogo />} actions={<OfficialActions />}>
          <CompositePanelHost>
            <CompositePanelItemHost title="组件" icon="Component">
              <ResourceWidget
                title="输入控件"
                sources={[
                  Input,
                  Password,
                  NumberPicker,
                  Rate,
                  Slider,
                  Select,
                  TreeSelect,
                  Cascader,
                  Transfer,
                  Checkbox,
                  Radio,
                  DatePicker,
                  TimePicker,
                  Upload,
                  Switch,
                  ObjectContainer,
                ]}
              />
              <ResourceWidget
                title="布局组件"
                sources={[Card, FormGrid, FormTab, FormLayout, FormCollapse, Space]}
              />
              <ResourceWidget title="自增组件" sources={[ArrayCards, ArrayTable]} />
              <ResourceWidget title="展示组件" sources={[Text]} />
            </CompositePanelItemHost>
            <CompositePanelItemHost title="大纲树" icon="Outline">
              <OutlineTreeWidget />
            </CompositePanelItemHost>
            <CompositePanelItemHost title="历史记录" icon="History">
              <HistoryWidget />
            </CompositePanelItemHost>
          </CompositePanelHost>
          <WorkspaceHost id="form">
            <WorkspacePanelHost>
              <ToolbarPanelHost>
                <DesignerToolsWidget />
                <ViewToolsWidget use={['DESIGNABLE', 'JSONTREE', 'MARKUP', 'PREVIEW']} />
              </ToolbarPanelHost>
              <ViewportPanelHost>
                <ViewPanel type="DESIGNABLE">
                  {() => <ComponentTreeWidget components={officialEditorComponents} />}
                </ViewPanel>
                <ViewPanel type="JSONTREE" scrollable={false}>
                  {(tree: TreeNode, onChange: (tree: ITreeNode) => void) => (
                    <SchemaEditorWidget tree={tree} onChange={onChange} />
                  )}
                </ViewPanel>
                <ViewPanel type="MARKUP" scrollable={false}>
                  {(tree: TreeNode) => (
                    <MarkupSchemaWidget
                      tree={tree}
                      componentPackage="@wordrhyme/designable-formily-antd"
                    />
                  )}
                </ViewPanel>
                <ViewPanel type="PREVIEW">
                  {(tree: TreeNode) => (
                    <div className="h-full overflow-auto bg-white p-4 text-slate-950">
                      <OfficialPreviewWidget tree={tree} />
                    </div>
                  )}
                </ViewPanel>
              </ViewportPanelHost>
            </WorkspacePanelHost>
          </WorkspaceHost>
          <SettingsPanelHost title="属性配置">
            <SettingsForm uploadAction="https://www.mocky.io/v2/5cc8019d300000980a055e76" />
          </SettingsPanelHost>
        </StudioPanelHost>
      </DesignerHost>
    </div>
  );
}

function ShadcnEditorShellDemo() {
  const engine = useMemo(
    () =>
      createDesigner({
        rootComponentName: 'Form',
        defaultComponentTree: shadcnInitialTree,
      }),
    [],
  );

  return (
    <div
      data-testid="shadcn-editor-shell"
      className="wr-designable-story wr-official-editor"
    >
      <EditorShellStyles />
      <DesignerHost engine={engine} position="absolute">
        <OfficialSelectedNodeSync />
        <StudioPanelHost
          logo={<div className="px-3 text-sm font-semibold">WordRhyme shadcn editor</div>}
          actions={<OfficialActions />}
        >
          <CompositePanelHost>
            <CompositePanelItemHost title="组件" icon="Component">
              <ResourceWidget
                title="基础控件"
                sources={[
                  ShadcnInput,
                  ShadcnSelect,
                  ShadcnNumberInput,
                  ShadcnSwitch,
                  ShadcnCheckbox,
                  ShadcnRating,
                ]}
              />
              <ResourceWidget
                title="布局组件"
                sources={[
                  ShadcnCard,
                  ShadcnRow,
                  ShadcnColumn,
                  ShadcnObjectContainer,
                  ShadcnSeparator,
                ]}
              />
              <ResourceWidget title="展示组件" sources={[ShadcnText]} />
            </CompositePanelItemHost>
            <CompositePanelItemHost title="大纲树" icon="Outline">
              <OutlineTreeWidget />
            </CompositePanelItemHost>
            <CompositePanelItemHost title="历史记录" icon="History">
              <HistoryWidget />
            </CompositePanelItemHost>
          </CompositePanelHost>
          <WorkspaceHost id="form">
            <WorkspacePanelHost>
              <ToolbarPanelHost>
                <DesignerToolsWidget />
                <ViewToolsWidget use={['DESIGNABLE', 'JSONTREE', 'MARKUP', 'PREVIEW']} />
              </ToolbarPanelHost>
              <ViewportPanelHost>
                <ViewPanel type="DESIGNABLE">
                  {() => <ComponentTreeWidget components={shadcnEditorComponents} />}
                </ViewPanel>
                <ViewPanel type="JSONTREE" scrollable={false}>
                  {(tree: TreeNode, onChange: (tree: ITreeNode) => void) => (
                    <SchemaEditorWidget tree={tree} onChange={onChange} />
                  )}
                </ViewPanel>
                <ViewPanel type="MARKUP" scrollable={false}>
                  {(tree: TreeNode) => (
                    <MarkupSchemaWidget
                      tree={tree}
                      componentPackage="@wordrhyme/designable-formily-shadcn"
                      extraImports={['Card', 'Text']}
                    />
                  )}
                </ViewPanel>
                <ViewPanel type="PREVIEW">
                  {(tree: TreeNode) => (
                    <div className="h-full overflow-auto bg-white p-4 text-slate-950">
                      <ShadcnTreePreview tree={tree?.serialize()} />
                    </div>
                  )}
                </ViewPanel>
              </ViewportPanelHost>
            </WorkspacePanelHost>
          </WorkspaceHost>
          <SettingsPanelHost title="属性配置">
            <SettingsForm uploadAction="https://www.mocky.io/v2/5cc8019d300000980a055e76" />
          </SettingsPanelHost>
        </StudioPanelHost>
      </DesignerHost>
    </div>
  );
}

function ShopPageEditorShellDemo() {
  const engine = useMemo(
    () =>
      createDesigner({
        rootComponentName: 'Form',
        defaultComponentTree: editorInitialTree,
      }),
    [],
  );
  const resources = useMemo(() => createEditorResources(registry), []);
  const [persistedDocument, setPersistedDocument] = useState<FormilyDesignDocument>(() =>
    toFormilyDocument(editorInitialTree),
  );
  const [status, setStatus] = useState('Editor loaded');

  return (
    <div
      data-testid="shop-page-editor-shell"
      className="wr-designable-story bg-white text-slate-950"
    >
      <EditorShellStyles />
      <DesignerHost engine={engine} position="absolute">
        <WorkbenchHost>
          <StudioPanelHost
            logo={
              <div className="px-3 text-sm font-semibold">WordRhyme visual editor</div>
            }
            actions={
              <EditorActions onPersist={setPersistedDocument} onStatus={setStatus} />
            }
          >
            <CompositePanelHost>
              <CompositePanelItemHost title="Shop blocks" icon="Component">
                <ResourceWidget title="Shop blocks" sources={[resources]} />
              </CompositePanelItemHost>
              <CompositePanelItemHost title="Outline" icon="Outline">
                <OutlineTreeWidget />
              </CompositePanelItemHost>
              <CompositePanelItemHost title="History" icon="History">
                <HistoryWidget />
              </CompositePanelItemHost>
            </CompositePanelHost>
            <WorkspacePanelHost>
              <ToolbarPanelHost>
                <DesignerToolsWidget />
                <div className="text-xs text-slate-500" role="status">
                  {status}
                </div>
                <ViewToolsWidget use={['DESIGNABLE', 'JSONTREE', 'MARKUP', 'PREVIEW']} />
              </ToolbarPanelHost>
              <ViewportPanelHost>
                <ViewPanel type="DESIGNABLE">
                  {() => <ComponentTreeWidget components={editorComponents} />}
                </ViewPanel>
                <ViewPanel type="JSONTREE" scrollable={false}>
                  {(tree: TreeNode, onChange: (tree: ITreeNode) => void) => (
                    <SchemaEditorWidget
                      tree={tree}
                      onChange={(nextTree) => {
                        onChange(nextTree);
                        setPersistedDocument(toFormilyDocument(nextTree));
                        setStatus('Schema updated from JSON editor');
                      }}
                    />
                  )}
                </ViewPanel>
                <ViewPanel type="MARKUP" scrollable={false}>
                  {(tree: TreeNode) => (
                    <MarkupSchemaWidget
                      tree={tree}
                      componentPackage="@wordrhyme/design-engine"
                      extraImports={['ShopProductHero', 'ShopProductGrid']}
                    />
                  )}
                </ViewPanel>
                <ViewPanel type="PREVIEW">
                  {(tree: TreeNode) => <EditorPreview tree={tree?.serialize()} />}
                </ViewPanel>
              </ViewportPanelHost>
            </WorkspacePanelHost>
            <SettingsPanelHost title="Properties">
              <PropertyPanel onPersist={setPersistedDocument} onStatus={setStatus} />
              <div className="border-t border-slate-200 p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Persisted document
                </p>
                <SchemaPreview document={persistedDocument} />
              </div>
            </SettingsPanelHost>
          </StudioPanelHost>
        </WorkbenchHost>
      </DesignerHost>
    </div>
  );
}

const meta: Meta<typeof OfficialEditorShellDemo> = {
  title: 'Design Engine/Editor Shell',
  component: OfficialEditorShellDemo,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const VisualEditorShell: Story = {
  render: () => <OfficialEditorShellDemo />,
};

export const ShadcnEditorShell: Story = {
  render: () => <ShadcnEditorShellDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const settingsPanel = canvasElement.querySelector('.dn-settings-panel');
    const viewport = canvasElement.querySelector('.dn-viewport');

    if (!settingsPanel) {
      throw new Error('Expected the Designable settings panel to render.');
    }
    if (!viewport) {
      throw new Error('Expected the Designable viewport to render.');
    }

    const settings = within(settingsPanel as HTMLElement);
    const hasFieldValue = (value: string) =>
      Array.from(canvasElement.querySelectorAll('input, textarea')).some((element) =>
        element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
          ? element.value === value
          : false,
      );

    const clickViewportControl = async (selector: string, panelPattern: RegExp) => {
      const control = viewport.querySelector(selector);
      if (!control) {
        throw new Error(`Expected viewport control "${selector}" to render.`);
      }

      await userEvent.click(control as HTMLElement);
      await waitFor(
        async () => {
          await expect(settingsPanel).toHaveTextContent(panelPattern);
        },
        { timeout: 5000 },
      );
    };

    await expect(canvas.getByText('WordRhyme shadcn editor')).toBeInTheDocument();
    await waitFor(
      () => {
        expect(settingsPanel).toHaveTextContent('字段属性');
        expect(settingsPanel).toHaveTextContent('组件属性');
        expect(settingsPanel).toHaveTextContent('占位提示');
        expect(hasFieldValue('productName')).toBe(true);
        expect(hasFieldValue('Studio Lamp')).toBe(true);
      },
      { timeout: 5000 },
    );
    await expect(settingsPanel).toHaveTextContent(/表单\s*\/\s*输入框/);
    await expect(settingsPanel).toHaveTextContent('显示');
    await expect(settingsPanel).toHaveTextContent('可编辑');
    await expect(settingsPanel).toHaveTextContent('前缀标签');
    await expect(settingsPanel).toHaveTextContent('后缀标签');
    await expect(settingsPanel).toHaveTextContent('允许清除内容');
    await expect(settingsPanel).toHaveTextContent('是否有边框');
    await expect(settingsPanel).toHaveTextContent('尺寸');

    await userEvent.click(settings.getByText('容器属性'));
    await expect(settingsPanel).toHaveTextContent('标签网格宽度');
    await expect(settingsPanel).toHaveTextContent('组件网格宽度');
    await expect(settingsPanel).toHaveTextContent('标签宽度');
    await expect(settingsPanel).toHaveTextContent('组件宽度');

    await userEvent.click(settings.getByText('组件样式'));
    await expect(settingsPanel).toHaveTextContent('展示');
    await expect(settingsPanel).toHaveTextContent('背景');
    await expect(settingsPanel).toHaveTextContent('阴影');
    await expect(settingsPanel).toHaveTextContent('字体');
    await expect(settingsPanel).toHaveTextContent('外边距');

    await clickViewportControl('input[placeholder="Studio Lamp"]', /表单\s*\/\s*输入框/);
    await clickViewportControl(
      'textarea[placeholder="Product description"]',
      /表单\s*\/\s*多行输入/,
    );
    await clickViewportControl('[role="combobox"]', /表单\s*\/\s*选择框/);
    await expect(settingsPanel).toHaveTextContent('配置可选项');
    await expect(settingsPanel).toHaveTextContent('配置响应器');
    await expect(settingsPanel).toHaveTextContent('校验规则');
    await expect(settingsPanel).toHaveTextContent('容器样式');
    await userEvent.keyboard('{Escape}');
    await clickViewportControl('input[type="number"]', /表单\s*\/\s*数字输入/);
    await clickViewportControl('[role="checkbox"]', /表单\s*\/\s*复选框/);
    await clickViewportControl('[role="switch"]', /表单\s*\/\s*开关/);
    await clickViewportControl('[role="radio"]', /表单\s*\/\s*评分器/);
    await clickViewportControl('[data-slot="card"]', /表单\s*\/\s*卡片/);
  },
};

export const ShopPageEditorShell: Story = {
  render: () => <ShopPageEditorShellDemo />,
};

export const AddProductGridInteraction: Story = {
  render: () => <ShopPageEditorShellDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('WordRhyme visual editor')).toBeInTheDocument();
    await expect(canvas.getByText('Product Hero')).toBeInTheDocument();
    await expect(canvas.getByText('Product Grid')).toBeInTheDocument();
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Studio Lamp' }),
    ).toBeInTheDocument();
    await expect(canvas.getByText('Public catalog')).toBeInTheDocument();

    await userEvent.click(
      canvas.getByRole('button', { name: 'Add Product Grid to canvas' }),
    );
    await expect(canvas.getByText('Inserted Product Grid')).toBeInTheDocument();
    await expect(canvas.getByTestId('editor-schema-output')).toHaveTextContent(
      'ShopProductGrid',
    );
  },
};
