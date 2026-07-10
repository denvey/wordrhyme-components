[根目录](../../../CLAUDE.md) > [shadcn-components](../../CLAUDE.md) > [packages](../) > **shadcn**

# @wordrhyme/shadcn

> 基础 Shadcn UI 组件库，基于 Radix UI 原语构建的可复用 React 组件集合。

## 模块职责

本模块提供 Shadcn UI 的核心组件封装，包括：

- 基于 Radix UI 的无障碍组件
- Tailwind CSS 样式封装
- 通用工具函数（cn 等）
- React Hook Form 集成

## 入口与启动

### 入口文件

- **主入口**: `src/index.ts`
- **组件入口**: `src/components/index.ts`
- **工具入口**: `src/lib/index.ts`

### 开发命令

```bash
pnpm build          # 构建
pnpm build:watch    # 监听模式构建
pnpm test           # 测试
pnpm typecheck      # 类型检查
pnpm shadcn:add     # 添加官方 shadcn 组件
```

## 对外接口

### 组件导出

```typescript
// 基础组件
export { Button } from './ui/button';
export { Input } from './ui/input';
export { Label } from './ui/label';
export { Checkbox } from './ui/checkbox';
export { Switch } from './ui/switch';
export { Slider } from './ui/slider';
export { Textarea } from './ui/textarea';

// 选择组件
export { Select, SelectTrigger, SelectContent, SelectItem, ... } from './ui/select';
export { RadioGroup, RadioGroupItem } from './ui/radio-group';
export { Command, CommandInput, CommandList, ... } from './ui/command';

// 弹出组件
export { Dialog, DialogTrigger, DialogContent, ... } from './ui/dialog';
export { AlertDialog, AlertDialogTrigger, ... } from './ui/alert-dialog';
export { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
export { DropdownMenu, DropdownMenuTrigger, ... } from './ui/dropdown-menu';
export { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
export { Sheet, SheetTrigger, SheetContent, ... } from './ui/sheet';

// 展示组件
export { Card, CardHeader, CardContent, CardFooter, ... } from './ui/card';
export { Badge } from './ui/badge';
export { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
export { Alert, AlertTitle, AlertDescription } from './ui/alert';
export { Separator } from './ui/separator';

// 导航组件
export { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
export { Pagination, ... } from './ui/pagination';

// 表单组件
export { Form, FormField, FormItem, FormLabel, ... } from './ui/form';
export { Calendar } from './ui/calendar';
export { ColorPicker } from './ui/color-picker';

// 工具
export { cn } from './lib/utils';
```

## 关键依赖与配置

### 核心依赖

| 包名                     | 用途              |
| ------------------------ | ----------------- |
| @radix-ui/react-\*       | 无障碍 UI 原语    |
| class-variance-authority | 组件变体管理      |
| tailwind-merge           | Tailwind 类名合并 |
| clsx                     | 条件类名          |
| lucide-react             | 图标              |
| react-hook-form          | 表单处理          |
| zod                      | 验证              |
| date-fns                 | 日期处理          |
| react-day-picker         | 日历组件          |
| cmdk                     | 命令面板          |

### Peer Dependencies

- react ^18.0.0 || ^19.0.0
- react-dom ^18.0.0 || ^19.0.0

## 组件目录结构

```
src/
├── components/
│   ├── ui/
│   │   ├── alert-dialog.tsx
│   │   ├── alert.tsx
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── calendar.tsx
│   │   ├── card.tsx
│   │   ├── checkbox.tsx
│   │   ├── color-picker.tsx
│   │   ├── command.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── pagination.tsx
│   │   ├── popover.tsx
│   │   ├── radio-group.tsx
│   │   ├── select.tsx
│   │   ├── separator.tsx
│   │   ├── sheet.tsx
│   │   ├── slider.tsx
│   │   ├── switch.tsx
│   │   ├── tabs.tsx
│   │   ├── textarea.tsx
│   │   └── tooltip.tsx
│   └── visually-hidden-input.tsx
├── lib/
│   └── utils.ts              # cn 工具函数
└── index.ts
```

## 测试与质量

```bash
pnpm test           # 运行测试
pnpm test:watch     # 监听模式
pnpm typecheck      # 类型检查
pnpm lint           # 代码检查
```

## 常见问题 (FAQ)

### Q: 如何添加新的 shadcn 组件？

```bash
pnpm shadcn:add [component-name]
```

### Q: 如何自定义组件样式？

使用 `className` prop 或通过 CVA variants 扩展。

## 相关文件清单

| 类别 | 关键文件                        |
| ---- | ------------------------------- |
| 入口 | `src/index.ts`                  |
| 组件 | `src/components/ui/*.tsx`       |
| 工具 | `src/lib/utils.ts`              |
| 配置 | `package.json`, `tsconfig.json` |

## 变更记录 (Changelog)

### 2026-01-14

- 初始化模块文档

详细变更历史请查看 [CHANGELOG.md](./CHANGELOG.md)
