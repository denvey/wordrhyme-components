[根目录](../../../CLAUDE.md) > [shadcn-components](../../CLAUDE.md) > [packages](../) > **shadcn-ui**

# @wordrhyme/shadcn-ui

> 扩展 UI 组件库，提供 FileUpload、ColorPicker、RichTextEditor 等高级组件。

## 模块职责

本模块在 @wordrhyme/shadcn 基础上提供更复杂的 UI 组件：

- 文件上传组件（FileUpload, AvatarUpload）
- 颜色选择器（ColorPicker, ColorSelect）
- 富文本编辑器（RichTextEditor，基于 TipTap）
- 日期选择器（DatePicker）
- 组合框（Combobox）
- 图标选择器（IconSelector）
- 主题切换（ThemeToggle, ThemeProvider）
- 确认对话框（ConfirmationDialog）
- 虚拟列表（基于 @tanstack/react-virtual）

## 入口与启动

### 入口文件
- **主入口**: `src/index.ts`

### 开发命令

```bash
pnpm build          # 构建
pnpm build:watch    # 监听模式构建
pnpm test           # 测试
pnpm typecheck      # 类型检查
```

## 对外接口

### 组件导出

```typescript
// 文件上传
export { FileUpload, FileUploadInline, AvatarUpload } from './file-upload';
export type { FileMetadata, FileUploadProps, FileUploadProgressCallBacks } from './file-upload';

// 颜色
export { ColorPicker } from './ColorPicker';
export { ColorPickerBase } from './ColorPickerBase';
export { ColorSelect } from './ColorSelect';

// 编辑器
export { RichTextEditor } from './rich-text-editor';

// 选择器
export { DatePicker } from './DatePicker';
export { Combobox } from './Combobox';
export { IconSelector } from './icon-selector';
export { TagsInput } from './tags-input';

// 布局
export { AbsoluteFill } from './AbsoluteFill';
export { ContentCard } from './ContentCard';
export { ScaledPreview } from './ScaledPreview';

// 反馈
export { Alert } from './Alert';
export { LoadingOverlay } from './LoadingOverlay';
export { ConfirmationDialog } from './confirmation-dialog';
export { CircleLoader } from './circle-loader';
export { toast } from './toast';

// 关闭按钮
export { CloseButtonAbsolute } from './CloseButtonAbsolute';
export { CloseButtonRounded } from './CloseButtonRounded';

// 主题
export { ThemeProvider } from './theme-provider';
export { ThemeToggle } from './ThemeToggle';

// 导航
export { Pagination } from './pagination';
export { Tabs } from './tabs';

// 输入
export { Input } from './input';
export { Select } from './Select';
export { Slider } from './slider';
export { Button } from './Button';

// Hooks
export { useMediaQuery, useIsMobile, ... } from './hooks';

// 工具
export { cn } from '@wordrhyme/shadcn';
```

## 关键依赖与配置

### 核心依赖
| 包名 | 用途 |
|------|------|
| @wordrhyme/shadcn | 基础 UI 组件 |
| @tiptap/core | 富文本编辑器核心 |
| @tiptap/react | TipTap React 绑定 |
| @tiptap/starter-kit | TipTap 基础扩展 |
| @tanstack/react-virtual | 虚拟列表 |
| @ebay/nice-modal-react | 模态框管理 |
| next-themes | 主题管理 |
| sonner | Toast 通知 |
| react-responsive | 响应式 Hooks |

### Peer Dependencies
- react >= 18.0.0
- react-dom >= 18.0.0

## 组件目录结构

```
src/
├── AbsoluteFill/
├── Alert/
├── avatar-upload/
├── Button/
├── circle-loader/
├── CloseButtonAbsolute/
├── CloseButtonRounded/
├── ColorPicker/
├── ColorPickerBase/
├── ColorSelect/
├── Combobox/
├── confirmation-dialog/
├── ContentCard/
├── DatePicker/
├── file-upload/
├── file-upload-inline/
├── hooks/
├── icon-selector/
├── input/
├── layout/
├── LoadingOverlay/
├── pagination/
├── rich-text-editor/
├── ScaledPreview/
├── Select/
├── slider/
├── tabs/
├── tags-input/
├── theme-provider/
├── ThemeToggle/
├── toast/
└── index.ts
```

## 测试与质量

```bash
pnpm test           # 运行测试
pnpm test:watch     # 监听模式
pnpm typecheck      # 类型检查
pnpm lint           # 代码检查
```

## 相关文件清单

| 类别 | 关键文件 |
|------|---------|
| 入口 | `src/index.ts` |
| 文件上传 | `src/file-upload/`, `src/avatar-upload/` |
| 编辑器 | `src/rich-text-editor/` |
| 主题 | `src/theme-provider/`, `src/ThemeToggle/` |
| 配置 | `package.json`, `tsconfig.json` |

## 变更记录 (Changelog)

### 2026-01-14
- 初始化模块文档

详细变更历史请查看 [CHANGELOG.md](./CHANGELOG.md)
