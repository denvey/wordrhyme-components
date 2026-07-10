[根目录](../../../CLAUDE.md) > [shadcn-components](../../CLAUDE.md) > [packages](../) > **shadcn-formily**

# @wordrhyme/formily-shadcn

> Formily 表单框架与 Shadcn UI 组件的集成库，支持 JSON Schema 驱动的表单渲染。

## 模块职责

本模块提供 Formily 表单框架与 Shadcn UI 组件的无缝集成，核心功能包括：

- 将 Shadcn UI 组件适配为 Formily Field 组件
- 支持 JSON Schema 驱动的表单渲染
- 提供表单布局组件（FormGrid, Row, Column）
- 支持数组字段组件（ArrayCards, ArrayCollapse）
- 提供 Schema 转换工具

## 入口与启动

### 入口文件

- **主入口**: `src/index.ts`
- **构建输出**: `dist/index.js` (ESM), `dist/index.cjs` (CJS)

### 开发命令

```bash
# 构建
pnpm build

# 监听模式构建
pnpm build:watch

# 测试
pnpm test

# 类型检查
pnpm typecheck
```

## 对外接口

### 核心导出

```typescript
// 表单核心
export { Form, FormItem, FormGrid } from './components';
export {
  createForm,
  FormProvider,
  FormConsumer,
  Field,
  ObjectField,
  VoidField,
} from '@formily/react';
export type { ISchema, IForm } from '@formily/react';

// Schema 渲染
export { SchemaField } from './components/schema-field';
export { JsonSchemaFormRenderer } from './components/json-schema-form-renderer';
export { transformSchema } from './utils';

// 输入组件
export { Input } from './components/input';
export { Textarea } from './components/textarea';
export { NumberInput } from './components/number';
export { Select } from './components/select';
export { Combobox } from './components/combobox';
export { Checkbox } from './components/checkbox';
export { Switch } from './components/switch';
export { Radio, ConnectedRadio } from './components/radio';
export { Slider } from './components/slider';
export { DatePicker } from './components/date-picker';
export { ColorSelect } from './components/color-select';
export { IconPicker } from './components/icon-picker';
export { RichTextEditor } from './components/rich-text-editor';
export { FileUpload, AvatarUpload, FileUploadInline } from './components/file-upload';
export { TagsInputInLine } from './components/tags-input-inline';

// 布局组件
export { Row } from './components/row';
export { Column } from './components/column';
export { Separator } from './components/separator';

// 数组组件
export { ArrayBase } from './components/array-base';
export { ArrayCards } from './components/array-cards';
export { ArrayCollapse } from './components/array-collapse';
```

### 使用示例

```typescript
import { Form, FormItem, Input, Select, createForm, SchemaField } from '@wordrhyme/formily-shadcn';

const form = createForm();

// 命令式使用
<Form form={form}>
  <FormItem name="username" label="用户名">
    <Input />
  </FormItem>
  <FormItem name="role" label="角色">
    <Select options={[{ label: '管理员', value: 'admin' }]} />
  </FormItem>
</Form>

// Schema 驱动使用
const schema = {
  type: 'object',
  properties: {
    username: { type: 'string', title: '用户名', 'x-component': 'Input' },
    role: { type: 'string', title: '角色', 'x-component': 'Select' },
  },
};

<Form form={form}>
  <SchemaField schema={schema} />
</Form>
```

## 关键依赖与配置

### 核心依赖

| 包名                 | 版本         | 用途         |
| -------------------- | ------------ | ------------ |
| @formily/core        | ^2.3.7       | 表单状态管理 |
| @formily/react       | ^2.3.7       | React 绑定   |
| @formily/reactive    | ^2.3.7       | 响应式状态   |
| @wordrhyme/shadcn    | workspace:\* | 基础 UI 组件 |
| @wordrhyme/shadcn-ui | workspace:\* | 扩展 UI 组件 |

### Peer Dependencies

- react >= 18.0.0
- react-dom >= 18.0.0

## 组件目录结构

```
src/
├── components/
│   ├── array-base/          # 数组字段基础组件
│   ├── array-cards/         # 卡片式数组
│   ├── array-collapse/      # 折叠式数组
│   ├── checkbox/            # 复选框
│   ├── color-select/        # 颜色选择器
│   ├── combobox/            # 组合框
│   ├── context/             # 表单上下文
│   ├── date-picker/         # 日期选择器
│   ├── file-upload/         # 文件上传
│   ├── form/                # 表单容器
│   ├── form-grid/           # 表单网格布局
│   ├── form-item/           # 表单项
│   ├── icon-picker/         # 图标选择器
│   ├── input/               # 输入框
│   ├── json-schema-form-renderer/  # JSON Schema 渲染器
│   ├── number/              # 数字输入
│   ├── radio/               # 单选框
│   ├── rich-text-editor/    # 富文本编辑器
│   ├── row/                 # 行布局
│   ├── column/              # 列布局
│   ├── schema-field/        # Schema 字段
│   ├── select/              # 下拉选择
│   ├── separator/           # 分隔符
│   ├── slider/              # 滑块
│   ├── switch/              # 开关
│   ├── tags-input-inline/   # 标签输入
│   └── textarea/            # 多行文本
├── utils/                   # 工具函数
└── index.ts                 # 主入口
```

## 测试与质量

```bash
pnpm test           # 运行测试
pnpm test:watch     # 监听模式
pnpm test:coverage  # 覆盖率报告
pnpm typecheck      # 类型检查
pnpm lint           # 代码检查
```

## 常见问题 (FAQ)

### Q: 如何自定义 SchemaField 的组件映射？

在 `SchemaField` 中传入 `components` prop 覆盖默认映射。

### Q: 如何处理表单验证？

使用 Formily 的验证规则，在 schema 中通过 `x-validator` 或在 Field 上使用 `required`, `pattern` 等属性。

### Q: 如何获取表单值？

```typescript
const values = form.values;
// 或
form.submit((values) => console.log(values));
```

## 相关文件清单

| 类别        | 关键文件                                                                      |
| ----------- | ----------------------------------------------------------------------------- |
| 入口        | `src/index.ts`                                                                |
| 表单核心    | `src/components/form/`, `src/components/form-item/`                           |
| Schema 渲染 | `src/components/schema-field/`, `src/components/json-schema-form-renderer/`   |
| 配置        | `package.json`, `tsconfig.json`, `tsdown.config.ts`                           |
| 文档        | `docs/form-layout-options.md`, `docs/json-schema-form-headless-vs-default.md` |

## 变更记录 (Changelog)

### 2026-01-14

- 初始化模块文档

详细变更历史请查看 [CHANGELOG.md](./CHANGELOG.md)
