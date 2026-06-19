[根目录](../CLAUDE.md) > **shadcn-components**

# shadcn-components

> Shadcn UI 组件库 Monorepo，提供可复用的 React UI 组件集合。

## 模块职责

shadcn-components 是一个基于 Turborepo 的 Monorepo，包含多个 npm 包：

- **@wordrhyme/shadcn** - 基础 Shadcn UI 组件封装
- **@wordrhyme/shadcn-ui** - 扩展 UI 组件（FileUpload, ColorPicker 等）
- **@wordrhyme/formily-shadcn** - Formily 表单框架与 Shadcn 集成
- **@wordrhyme/shadcn-auth** - 认证相关表单组件

## 入口与启动

### Monorepo 根目录命令

```bash
# 安装依赖
pnpm install

# 构建所有包
pnpm build

# 运行 Storybook 开发服务器
pnpm storybook

# 运行所有测试
pnpm test

# 类型检查
pnpm typecheck

# 代码格式化
pnpm format:fix

# 代码检查
pnpm lint:fix

# 创建新包
pnpm run turbo:gen:init
```

### 单包开发

```bash
# 进入特定包目录
cd packages/shadcn-formily

# 构建
pnpm build

# 监听模式构建
pnpm build:watch

# 测试
pnpm test
```

## 对外接口

### @wordrhyme/shadcn

基础 UI 组件，基于 Radix UI 封装：

```typescript
export {
  Button, Input, Label, Checkbox, Switch, Select,
  Dialog, AlertDialog, Popover, Dropdown, Tooltip,
  Card, Badge, Avatar, Separator, Tabs,
  Form, Calendar, Slider, RadioGroup,
  cn, // className 合并工具
} from '@wordrhyme/shadcn';
```

### @wordrhyme/shadcn-ui

扩展 UI 组件：

```typescript
export {
  FileUpload, AvatarUpload, FileUploadInline,
  ColorPicker, ColorSelect, ColorPickerBase,
  DatePicker, Combobox, IconSelector,
  RichTextEditor, Pagination, ThemeToggle,
  LoadingOverlay, ConfirmationDialog,
} from '@wordrhyme/shadcn-ui';
```

### @wordrhyme/formily-shadcn

Formily 集成组件：

```typescript
export {
  // 核心
  Form, FormItem, FormGrid, SchemaField,
  createForm, FormProvider, FormConsumer,

  // 输入组件
  Input, Textarea, NumberInput, Select, Combobox,
  Checkbox, Switch, Radio, Slider, DatePicker,
  ColorSelect, IconPicker, RichTextEditor,
  FileUpload, AvatarUpload, TagsInputInLine,

  // 布局组件
  Row, Column, Separator,

  // 数组组件
  ArrayBase, ArrayCards, ArrayCollapse,

  // Schema 渲染
  JsonSchemaFormRenderer, transformSchema,
} from '@wordrhyme/formily-shadcn';
```

### @wordrhyme/shadcn-auth

认证表单组件：

```typescript
export {
  AuthForms, SignInForm, SignUpForm,
  ResetPasswordForm, GoogleSignIn,
} from '@wordrhyme/shadcn-auth';
```

## 关键依赖与配置

### Monorepo 工具链
| 工具 | 版本 | 用途 |
|------|------|------|
| pnpm | 10.25.0 | 包管理器 |
| Turborepo | ^2.6.3 | Monorepo 构建 |
| tsdown | ^0.15.12 | TypeScript 构建 |
| Vitest | ^3.2.4 | 测试框架 |
| Storybook | ^8.6.14 | 组件文档 |
| Changesets | ^2.29.8 | 版本管理 |

### 核心依赖
| 包名 | 用途 |
|------|------|
| react 19 | UI 框架 |
| @radix-ui/* | 无障碍 UI 原语 |
| tailwindcss 4 | CSS 框架 |
| @formily/core | 表单状态管理 |
| @formily/react | Formily React 绑定 |
| lucide-react | 图标库 |

### 配置文件
| 文件 | 用途 |
|------|------|
| `turbo.json` | Turborepo 任务配置 |
| `pnpm-workspace.yaml` | 工作区配置和版本目录 |
| `commitlint.config.mjs` | 提交信息规范 |
| `eslint.config.mjs` | ESLint 配置 |

## 工作区结构

```
shadcn-components/
├── packages/
│   ├── shadcn/              # 基础 UI 组件
│   ├── shadcn-ui/           # 扩展 UI 组件
│   ├── shadcn-formily/      # Formily 集成
│   ├── shadcn-auth/         # 认证组件
│   └── hooks/               # 共享 Hooks
├── tooling/
│   ├── eslint/              # ESLint 配置包
│   ├── prettier/            # Prettier 配置包
│   ├── storybook/           # Storybook 配置
│   ├── tsdown/              # tsdown 配置包
│   ├── typescript/          # TypeScript 配置包
│   └── vitest/              # Vitest 配置包
├── turbo/                   # Turborepo 生成器
├── .husky/                  # Git Hooks
└── .github/                 # GitHub 配置
```

## 测试与质量

### 测试命令
```bash
pnpm test              # 运行所有测试
pnpm test:ui           # 打开 Vitest UI
pnpm test:coverage     # 生成覆盖率报告
pnpm typecheck         # 类型检查
pnpm lint              # 代码检查
pnpm format            # 格式检查
pnpm check:all         # 运行所有检查
```

### 代码规范
- ESLint + Prettier 统一配置
- Commitlint 验证提交信息（Conventional Commits）
- Husky Git Hooks 自动检查

## 发布流程

```bash
# 添加变更记录
pnpm changeset

# 更新版本
pnpm version

# 发布包
pnpm release
```

## 常见问题 (FAQ)

### Q: 如何添加新组件？
1. 在对应包的 `src/components/` 下创建组件
2. 在 `src/index.ts` 中导出
3. 添加 Storybook stories
4. 编写测试

### Q: 为什么不能使用 `typeof Component`？
使用 `typeof Component` 会导致 tsdown 生成损坏的类型引用。应使用导出的 `*Props` 类型。

### Q: 如何在本地测试包？
使用 `workspace:*` 协议在其他包中引用，或使用 `pnpm link`。

## 相关文件清单

| 类别 | 关键文件 |
|------|---------|
| 入口 | `packages/*/src/index.ts` |
| 配置 | `turbo.json`, `pnpm-workspace.yaml` |
| 文档 | `.github/copilot-instructions.md` |
| Storybook | `tooling/storybook/` |

## 变更记录 (Changelog)

### 2026-01-14
- 初始化模块文档
