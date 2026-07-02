import 'antd/dist/antd.less';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import { observer } from '@formily/reactive-react';
import { GithubOutlined } from '@ant-design/icons';
import { Button, Radio as AntdRadioGroup, Space as AntdButtonSpace } from 'antd';
import type { ITreeNode, TreeNode } from '@wordrhyme/designable-core';
import {
  createBehavior,
  createDesigner,
  createResource,
  GlobalRegistry,
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
  transformToSchema,
  transformToTreeNode,
} from '@wordrhyme/designable-formily-transformer';
import { SettingsForm } from '@wordrhyme/designable-react-settings-form';
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
import { createForm } from '@wordrhyme/formily-shadcn';
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
import type { ComponentType, ReactNode } from 'react';

const FORMILY_TRANSFORM_OPTIONS = {
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

const OfficialSelectedNodeSync = observer(() => {
  const designer = useDesigner();

  useEffect(() => {
    GlobalRegistry.setDesignerLanguage('zh-cn');

    const timeoutId = window.setTimeout(() => {
      const tree = designer?.getCurrentTree();
      const inputNode = tree?.children?.[0];

      if (tree && inputNode) {
        tree.operation.selection.select(inputNode);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
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
          fields: runtimeComponents as never,
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
                <ViewPanel type="JSONTREE">
                  {(tree: TreeNode) => (
                    <div className="h-full overflow-auto bg-white p-4 text-slate-950">
                      <SchemaPreview document={toFormilyDocument(tree?.serialize())} />
                    </div>
                  )}
                </ViewPanel>
                <ViewPanel type="MARKUP">
                  {(tree: TreeNode) => (
                    <div className="h-full overflow-auto bg-white p-4 text-slate-950">
                      <SchemaPreview document={toFormilyDocument(tree?.serialize())} />
                    </div>
                  )}
                </ViewPanel>
                <ViewPanel type="PREVIEW">
                  {(tree: TreeNode) => (
                    <div className="h-full overflow-auto bg-white p-4 text-slate-950">
                      <SchemaPreview document={toFormilyDocument(tree?.serialize())} />
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
                <ViewToolsWidget />
              </ToolbarPanelHost>
              <ViewportPanelHost>
                <ViewPanel type="DESIGNABLE">
                  {() => <ComponentTreeWidget components={editorComponents} />}
                </ViewPanel>
                <ViewPanel type="JSONTREE">
                  {(tree: TreeNode) => (
                    <div className="h-full overflow-auto bg-white p-4 text-slate-950">
                      <SchemaPreview document={toFormilyDocument(tree?.serialize())} />
                    </div>
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
