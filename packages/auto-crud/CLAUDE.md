[根目录](../../../CLAUDE.md) > [shadcn-components](../../CLAUDE.md) > [packages](../) > **auto-crud**

# @wordrhyme/auto-crud

> Schema-first CRUD components with auto-generated tables and forms

## 模块职责

基于 Zod Schema 自动生成完整 CRUD 界面的低代码组件库。

### 核心功能

- **Schema 驱动**: 从 Zod Schema 自动推断字段类型和验证规则
- **自动表格生成**: 数据表格组件，支持筛选、排序、分页
- **自动表单生成**: 集成 Formily，支持复杂表单联动
- **高级数据表格**: 基于 TanStack Table，支持虚拟滚动、拖拽排序
- **服务端集成**: 可选 tRPC + Drizzle ORM 后端支持

---

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

---

## 对外接口

### Auto-CRUD 组件

```typescript
export { AutoCrudTable } from "./components/auto-crud/auto-crud-table";
export { AutoForm } from "./components/auto-crud/auto-form";
export { AutoTable } from "./components/auto-crud/auto-table";
export { AutoTableActionBar } from "./components/auto-crud/auto-table-action-bar";
export { AutoTableSimpleFilters } from "./components/auto-crud/auto-table-simple-filters";
export { CrudFormModal } from "./components/auto-crud/crud-form-modal";
```

### 数据表格组件

```typescript
export { DataTable } from "./components/data-table/data-table";
export { DataTableAdvancedToolbar } from "./components/data-table/data-table-advanced-toolbar";
export { DataTableColumnHeader } from "./components/data-table/data-table-column-header";
export { DataTableFacetedFilter } from "./components/data-table/data-table-faceted-filter";
export { DataTableFloatingBar } from "./components/data-table/data-table-floating-bar";
export { DataTablePagination } from "./components/data-table/data-table-pagination";
```

### Hooks

```typescript
export { useAutoCrudResource } from "./hooks/use-auto-crud-resource";
export { useDataTable } from "./hooks/use-data-table";
```

### Schema Bridge

```typescript
export { parseZodField, zodToFormilySchema } from "./lib/schema-bridge/zod-to-formily";
export { zodToColumns } from "./lib/schema-bridge/zod-to-columns";
export type { FieldsConfig, FieldConfig, FormFieldConfig, TableFieldConfig } from "./lib/schema-bridge/field-config";
```

---

## 使用示例

### 基础用法

```typescript
import { AutoCrudTable } from "@wordrhyme/auto-crud";
import { z } from "zod";

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["todo", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  createdAt: z.date(),
});

export default function TasksPage() {
  return (
    <AutoCrudTable
      schema={taskSchema}
      data={tasks}
      onCreateSubmit={handleCreate}
      onUpdateSubmit={handleUpdate}
      onDeleteSubmit={handleDelete}
    />
  );
}
```

### 高级用法（字段配置）

```typescript
import { AutoCrudTable, type FieldsConfig } from "@wordrhyme/auto-crud";
import { z } from "zod";

const taskSchema = z.object({
  title: z.string(),
  status: z.enum(["todo", "done"]),
  assignee: z.string().optional(),
});

const fields: FieldsConfig<Task> = {
  status: {
    label: "状态",
    table: {
      filterVariant: "select",
      filterOptions: [
        { label: "待办", value: "todo" },
        { label: "完成", value: "done" },
      ],
    },
    form: {
      component: "Select",
      "x-reactions": {
        dependencies: ["priority"],
        when: "{{$deps[0] === 'urgent'}}",
        fulfill: { state: { required: true } },
      },
    },
  },
  assignee: {
    form: {
      component: "Combobox",
      componentProps: { placeholder: "选择负责人" },
    },
  },
};

export default function TasksPage() {
  return <AutoCrudTable schema={taskSchema} fields={fields} />;
}
```

---

## 关键依赖与配置

### 核心依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| @pixpilot/shadcn | workspace:* | 基础 UI 组件 |
| @pixpilot/formily-shadcn | workspace:* | Formily 表单集成 |
| @pixpilot/shadcn-ui | workspace:* | 扩展 UI 组件 |
| @tanstack/react-table | ^8.21.3 | 数据表格核心 |
| @dnd-kit/* | ^6.3.1 | 拖拽排序 |
| nuqs | ^2.8.6 | URL 状态同步 |

### Peer Dependencies

```json
{
  "react": "^18.0.0 || ^19.0.0",
  "react-dom": "^18.0.0 || ^19.0.0",
  "zod": "^3.0.0 || ^4.0.0"
}
```

### 用户安装

```bash
# 只需 2 个包
pnpm add @wordrhyme/auto-crud zod
```

---

## 目录结构

```
src/
├── components/
│   ├── auto-crud/          # 核心 CRUD 组件
│   │   ├── auto-crud-table.tsx
│   │   ├── auto-form.tsx
│   │   ├── auto-table.tsx
│   │   └── crud-form-modal.tsx
│   ├── data-table/         # 高级数据表格
│   │   ├── data-table.tsx
│   │   ├── data-table-advanced-toolbar.tsx
│   │   └── data-table-faceted-filter.tsx
│   └── ui/                 # 自定义 UI 组件
│       ├── action-bar.tsx
│       ├── faceted.tsx
│       └── sortable.tsx
├── hooks/                  # React Hooks
│   ├── use-auto-crud-resource.ts
│   └── use-data-table.ts
├── lib/
│   ├── schema-bridge/      # Schema 转换工具
│   │   ├── zod-to-formily.ts
│   │   ├── zod-to-columns.tsx
│   │   └── field-config.ts
│   └── utils.ts
├── types/                  # 类型定义
└── index.ts                # 主入口
```

---

## 测试与质量

```bash
pnpm test           # 运行测试
pnpm test:watch     # 监听模式
pnpm typecheck      # 类型检查
pnpm lint           # 代码检查
```

---

## 常见问题 (FAQ)

### Q: 如何自定义字段组件？

使用 `fields` 配置中的 `component` 属性：

```typescript
const fields: FieldsConfig<Task> = {
  description: {
    form: {
      component: "Textarea",
      componentProps: { rows: 5 },
    },
  },
};
```

### Q: 如何实现字段联动？

使用 `x-reactions` 配置：

```typescript
const fields: FieldsConfig<Task> = {
  endDate: {
    form: {
      "x-reactions": {
        dependencies: ["startDate"],
        when: "{{$deps[0] !== undefined}}",
        fulfill: {
          state: {
            visible: true,
            disabled: false,
          },
        },
      },
    },
  },
};
```

### Q: 如何集成服务端（tRPC）？

```typescript
import { createCrudRouter } from "@wordrhyme/auto-crud/server";

const taskRouter = createCrudRouter({
  schema: taskSchema,
  table: "tasks",
  db: drizzle,
});
```

---

## 相关文件清单

| 类别 | 关键文件 |
|------|---------|
| 入口 | `src/index.ts` |
| 核心组件 | `src/components/auto-crud/` |
| 数据表格 | `src/components/data-table/` |
| Schema 转换 | `src/lib/schema-bridge/` |
| 配置 | `package.json`, `tsdown.config.ts`, `tsconfig.json` |

---

## 变更记录 (Changelog)

### 2026-01-26
- 迁移到 shadcn-components monorepo
- 采用 workspace 依赖策略
- 优化 peerDependencies（只保留 react/react-dom/zod）
- 使用 tsdown 构建工具

详细变更历史请查看 [CHANGELOG.md](./CHANGELOG.md)
