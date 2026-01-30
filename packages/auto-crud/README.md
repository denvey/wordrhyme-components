# @wordrhyme/auto-crud

> Schema-first CRUD components with auto-generated tables and forms

基于 Zod Schema 自动生成完整 CRUD 界面的低代码 React 组件库。

[![npm version](https://img.shields.io/npm/v/@wordrhyme/auto-crud.svg)](https://www.npmjs.com/package/@wordrhyme/auto-crud)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ✨ 特性

- 🚀 **零配置 CRUD**: 从 Zod Schema 自动生成表格和表单
- 🎨 **高级数据表格**: 基于 TanStack Table，支持排序、过滤、分页
- 📝 **智能表单**: 集成 Formily，支持复杂表单联动
- 🔌 **灵活集成**: 支持 tRPC、REST API 或内存数据源
- 🎯 **类型安全**: 完整的 TypeScript 类型推断
- 🌐 **URL 状态同步**: 使用 nuqs 实现 URL 状态管理
- 🎭 **三种过滤模式**: Simple / Advanced / Command
- 🔄 **批量操作**: 支持批量更新和删除

---

## 📦 安装

```bash
# pnpm
pnpm add @wordrhyme/auto-crud zod

# npm
npm install @wordrhyme/auto-crud zod

# yarn
yarn add @wordrhyme/auto-crud zod
```

### Peer Dependencies

```json
{
  "react": "^18.0.0 || ^19.0.0",
  "react-dom": "^18.0.0 || ^19.0.0",
  "zod": "^3.0.0 || ^4.0.0"
}
```

---

## 🚀 快速开始

### 基础示例

```typescript
import { AutoCrudTable, useAutoCrudResource, createMemoryDataSource } from "@wordrhyme/auto-crud";
import { z } from "zod";

// 1. 定义 Zod Schema
const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["todo", "in-progress", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  createdAt: z.date(),
});

type Task = z.infer<typeof taskSchema>;

// 2. 创建数据源
const dataSource = createMemoryDataSource<Task>({
  data: [
    { id: "1", title: "Task 1", status: "todo", priority: "high", createdAt: new Date() },
    { id: "2", title: "Task 2", status: "done", priority: "low", createdAt: new Date() },
  ],
  onCreate: async (data) => { /* 创建逻辑 */ },
  onUpdate: async (id, data) => { /* 更新逻辑 */ },
  onDelete: async (id) => { /* 删除逻辑 */ },
});

// 3. 使用组件
function TasksPage() {
  const resource = useAutoCrudResource({
    dataSource,
    schema: taskSchema,
  });

  return (
    <AutoCrudTable
      title="任务管理"
      schema={taskSchema}
      resource={resource}
    />
  );
}
```

### 与 tRPC 集成

```typescript
import { AutoCrudTable, useAutoCrudResource, createTRPCDataSource } from "@wordrhyme/auto-crud";
import { trpc } from "@/lib/trpc/client";
import { createSelectSchema } from "drizzle-zod";
import { tasks } from "@/db/schema";

const taskSchema = createSelectSchema(tasks);

function TasksPage() {
  // URL 状态管理
  const [queryParams] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(10),
    sort: getSortingStateParser().withDefault([]),
    filters: getFiltersStateParser().withDefault([]),
  });

  // 创建 tRPC 数据源
  const dataSource = createTRPCDataSource({
    router: trpc.tasks,
    queryInput: queryParams,
  });

  const resource = useAutoCrudResource({
    dataSource,
    schema: taskSchema,
  });

  return (
    <AutoCrudTable
      title="任务管理"
      schema={taskSchema}
      resource={resource}
      fieldOverrides={{
        id: { hidden: true },
        status: { label: "状态" },
        priority: { label: "优先级" },
      }}
      tableProps={{
        filterMode: ["simple", "advanced", "command"],
        batchUpdateFields: ["status", "priority"],
      }}
    />
  );
}
```

---

## 📖 核心概念

### Schema First 理念

```
Zod Schema → 自动推断字段类型 → 生成表格列 + 表单字段
```

**优势**：
- ✅ 单一数据源（SSOT）
- ✅ 类型安全
- ✅ 零手动配置
- ✅ Schema 变更自动同步

### 数据源（Data Source）

`@wordrhyme/auto-crud` 支持三种数据源：

#### 1. 内存数据源（Memory Data Source）

适合：原型开发、演示、测试

```typescript
import { createMemoryDataSource } from "@wordrhyme/auto-crud";

const dataSource = createMemoryDataSource({
  data: initialData,
  onCreate: async (data) => { /* ... */ },
  onUpdate: async (id, data) => { /* ... */ },
  onDelete: async (id) => { /* ... */ },
});
```

#### 2. tRPC 数据源（tRPC Data Source）

适合：全栈 TypeScript 项目

```typescript
import { createTRPCDataSource } from "@wordrhyme/auto-crud";

const dataSource = createTRPCDataSource({
  router: trpc.tasks,
  queryInput: { page: 1, perPage: 10 },
});
```

**要求**：后端需要使用 `@wordrhyme/auto-crud-server` 创建 CRUD 路由。

#### 3. 自定义数据源（Custom Data Source）

适合：REST API、GraphQL 等

```typescript
const dataSource: DataSource<Task> = {
  list: async (params) => {
    const response = await fetch(`/api/tasks?${new URLSearchParams(params)}`);
    return response.json();
  },
  get: async (id) => {
    const response = await fetch(`/api/tasks/${id}`);
    return response.json();
  },
  create: async (data) => {
    const response = await fetch("/api/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.json();
  },
  update: async (id, data) => {
    const response = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return response.json();
  },
  delete: async (id) => {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  },
  deleteMany: async (ids) => {
    await fetch("/api/tasks/batch", {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    });
  },
};
```

---

## 🎨 组件 API

### `<AutoCrudTable />`

完整的 CRUD 表格组件。

#### Props

```typescript
interface AutoCrudTableProps<TData> {
  // 必需
  title: string;                    // 表格标题
  schema: z.ZodType<TData>;         // Zod Schema
  resource: AutoCrudResource<TData>; // useAutoCrudResource 返回值

  // 可选
  fieldOverrides?: FieldOverrides<TData>;  // 字段配置
  tableProps?: {
    filterMode?: FilterMode | FilterMode[];  // 过滤模式
    batchUpdateFields?: (keyof TData)[];     // 批量更新字段
  };
  slots?: {
    toolbarEnd?: React.ReactNode;  // 工具栏右侧插槽
  };
}
```

#### 示例

```typescript
<AutoCrudTable
  title="用户管理"
  schema={userSchema}
  resource={resource}
  fieldOverrides={{
    id: { hidden: true },
    email: { label: "邮箱" },
    role: {
      label: "角色",
      table: {
        meta: {
          variant: "select",
          options: [
            { label: "管理员", value: "admin" },
            { label: "用户", value: "user" },
          ],
        },
      },
    },
  }}
  tableProps={{
    filterMode: ["simple", "advanced"],
    batchUpdateFields: ["role", "status"],
  }}
/>
```

### `useAutoCrudResource()`

连接数据源到组件的 Hook。

#### 参数

```typescript
interface UseAutoCrudResourceConfig<TData> {
  dataSource: DataSource<TData>;  // 数据源
  schema: z.ZodType<TData>;       // Zod Schema
}
```

#### 返回值

```typescript
interface AutoCrudResource<TData> {
  // 数据
  data: TData[];
  total: number;
  isLoading: boolean;

  // 模态框状态
  modal: {
    variant: "dialog" | "sheet";
    isOpen: boolean;
    mode: "create" | "edit";
    editingItem: TData | null;
  };

  // 操作方法
  handlers: {
    setVariant: (variant: "dialog" | "sheet") => void;
    openCreate: () => void;
    openEdit: (item: TData) => void;
    closeModal: () => void;
    handleCreate: (data: Partial<TData>) => Promise<void>;
    handleUpdate: (id: string, data: Partial<TData>) => Promise<void>;
    handleDelete: (id: string) => Promise<void>;
    handleDeleteMany: (ids: string[]) => Promise<void>;
  };
}
```

---

## 🔧 字段配置

### 基础配置

```typescript
fieldOverrides={{
  fieldName: {
    label: "显示名称",      // 表格和表单共用
    hidden: true,           // 表格和表单都隐藏
  },
}}
```

### 表格特定配置

```typescript
fieldOverrides={{
  amount: {
    label: "金额",
    table: {
      meta: {
        unit: "¥",          // 单位显示
        variant: "number",  // 筛选器类型
      },
    },
  },
  status: {
    label: "状态",
    table: {
      meta: {
        variant: "select",
        options: [
          { label: "待处理", value: "pending" },
          { label: "已完成", value: "completed" },
        ],
      },
    },
  },
}}
```

### 表单特定配置

```typescript
fieldOverrides={{
  description: {
    label: "描述",
    form: {
      "x-component": "Textarea",
      "x-component-props": { rows: 5 },
    },
  },
  createdAt: {
    label: "创建时间",
    form: {
      "x-hidden": true,  // 仅表单隐藏
    },
  },
}}
```

### 字段联动

```typescript
fieldOverrides={{
  endDate: {
    label: "结束日期",
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
}}
```

---

## 🎯 过滤模式

### Simple 模式（简单筛选）

- 适合：快速筛选常用字段
- 特点：下拉选择框，一键清除
- 示例：状态筛选、优先级筛选

```typescript
tableProps={{
  filterMode: "simple",
}}
```

### Advanced 模式（高级筛选）

- 适合：复杂多条件查询
- 特点：Notion 风格，支持 AND/OR 逻辑
- 示例：`status = "done" AND priority = "high"`

```typescript
tableProps={{
  filterMode: "advanced",
}}
```

### Command 模式（命令面板）

- 适合：键盘流用户
- 特点：Linear 风格，快捷键 `Cmd+K`
- 示例：快速搜索并添加筛选条件

```typescript
tableProps={{
  filterMode: "command",
}}
```

### 多模式切换

```typescript
tableProps={{
  filterMode: ["simple", "advanced", "command"],  // 第一个为默认模式
}}
```

---

## 🔄 批量操作

### 批量更新

```typescript
<AutoCrudTable
  schema={taskSchema}
  resource={resource}
  tableProps={{
    batchUpdateFields: ["status", "priority"],
  }}
/>
```

**功能**：
- 选择多行
- 点击批量更新按钮
- 选择字段和新值
- 一键更新所有选中行

### 批量删除

```typescript
// 自动启用，无需配置
<AutoCrudTable schema={taskSchema} resource={resource} />
```

**功能**：
- 选择多行
- 点击批量删除按钮
- 确认删除
- 一次性删除所有选中行

---

## 🎨 自定义样式

### 使用 Tailwind CSS

```typescript
<AutoCrudTable
  schema={taskSchema}
  resource={resource}
  className="custom-table"
/>
```

### 自定义工具栏

```typescript
<AutoCrudTable
  schema={taskSchema}
  resource={resource}
  slots={{
    toolbarEnd: (
      <div className="flex gap-2">
        <Button onClick={handleExport}>导出</Button>
        <Button onClick={handleImport}>导入</Button>
      </div>
    ),
  }}
/>
```

---

## 📚 高级用法

### 自定义列渲染

```typescript
import { createColumns } from "@wordrhyme/auto-crud";

const columns = createColumns(taskSchema, {
  overrides: {
    status: {
      cell: ({ row }) => (
        <Badge variant={row.original.status === "done" ? "success" : "default"}>
          {row.original.status}
        </Badge>
      ),
    },
  },
});
```

### 自定义表单组件

```typescript
fieldOverrides={{
  tags: {
    label: "标签",
    form: {
      "x-component": "TagsInput",
      "x-component-props": {
        placeholder: "输入标签",
        maxTags: 5,
      },
    },
  },
}}
```

### 服务端分页

```typescript
const [queryParams] = useQueryStates({
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(10),
});

const dataSource = createTRPCDataSource({
  router: trpc.tasks,
  queryInput: queryParams,
});
```

---

## 🔌 与其他库集成

### 与 Drizzle ORM 集成

```typescript
import { createSelectSchema } from "drizzle-zod";
import { tasks } from "@/db/schema";

const taskSchema = createSelectSchema(tasks);

<AutoCrudTable schema={taskSchema} resource={resource} />
```

### 与 React Hook Form 集成

```typescript
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

const form = useForm({
  resolver: zodResolver(taskSchema),
});
```

### 与 Next.js 集成

```typescript
// app/tasks/page.tsx
"use client";

import { AutoCrudTable } from "@wordrhyme/auto-crud";

export default function TasksPage() {
  return <AutoCrudTable schema={taskSchema} resource={resource} />;
}
```

---

## 🛠️ 工具函数

### `createColumns()`

从 Zod Schema 自动生成表格列。

```typescript
import { createColumns } from "@wordrhyme/auto-crud";

const columns = createColumns(taskSchema, {
  exclude: ["id", "createdAt"],
  overrides: {
    status: {
      meta: {
        label: "状态",
        variant: "select",
      },
    },
  },
});
```

### `createFormSchema()`

从 Zod Schema 自动生成 Formily 表单 Schema。

```typescript
import { createFormSchema } from "@wordrhyme/auto-crud";

const formSchema = createFormSchema(taskSchema, {
  exclude: ["id", "createdAt"],
  layout: "vertical",
});
```

---

## 📦 导出的类型

```typescript
// 组件
export { AutoCrudTable } from "./components/auto-crud/auto-crud-table";
export { AutoForm } from "./components/auto-crud/auto-form";
export { AutoTable } from "./components/auto-crud/auto-table";

// Hooks
export { useAutoCrudResource } from "./hooks/use-auto-crud-resource";
export { useDataTable } from "./hooks/use-data-table";

// 数据源
export { createTRPCDataSource, createMemoryDataSource } from "./lib/data-source";
export type { DataSource, ListParams, ListResult } from "./lib/data-source";

// 工具函数
export { createColumns, createFormSchema } from "./lib/schema-bridge";
export type {
  FieldOverrides,
  FieldOverride,
  CreateColumnsOptions,
  CreateFormSchemaOptions,
} from "./lib/schema-bridge";
```

---

## 🤝 贡献

欢迎贡献代码！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md)。

---

## 📄 许可证

MIT © [wordrhyme](https://github.com/pixpilot/shadcn-components)

---

## 🔗 相关链接

- [GitHub](https://github.com/pixpilot/shadcn-components)
- [文档](https://github.com/pixpilot/shadcn-components/tree/main/packages/auto-crud)
- [示例](https://github.com/pixpilot/shadcn-components/tree/main/examples)
- [Changelog](./CHANGELOG.md)

---

## 💡 灵感来源

- [TanStack Table](https://tanstack.com/table) - 强大的表格库
- [Formily](https://formilyjs.org/) - 灵活的表单解决方案
- [Shadcn UI](https://ui.shadcn.com/) - 优雅的 UI 组件
- [Notion](https://notion.so) - 高级筛选器设计
- [Linear](https://linear.app) - 命令面板设计
