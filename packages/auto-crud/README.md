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
pnpm add @wordrhyme/auto-crud zod sonner

# npm
npm install @wordrhyme/auto-crud zod sonner

# yarn
yarn add @wordrhyme/auto-crud zod sonner
```

### Peer Dependencies

```json
{
  "react": "^18.0.0 || ^19.0.0",
  "react-dom": "^18.0.0 || ^19.0.0",
  "sonner": "^2.0.0",
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
      fields={{
        id: { hidden: true },
        status: { label: "状态" },
        priority: { label: "优先级" },
      }}
      table={{
        filterModes: ["simple", "advanced", "command"],
        batchFields: ["status", "priority"],
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
interface AutoCrudTableProps<TSchema> {
  // 必需
  schema: TSchema;                              // Zod Schema
  resource: UseAutoCrudResourceReturn<TSchema>; // useAutoCrudResource 返回值

  // 可选
  title?: string;
  description?: string;
  fields?: Fields;                              // 统一字段配置
  table?: {
    hidden?: string[];                          // 隐藏的列
    overrides?: Record<string, any>;            // 列覆盖配置
    filterModes?: FilterMode | FilterMode[];    // 过滤模式
    batchFields?: (string | BatchUpdateField)[]; // 批量更新字段
    defaultSort?: any[];                        // 默认排序
  };
  form?: {
    overrides?: Record<string, any>;            // 表单覆盖配置
    columns?: number;                           // 表单列数
  };
  slots?: {
    toolbarStart?: React.ReactNode;             // 工具栏左侧插槽
    toolbarEnd?: React.ReactNode;               // 工具栏右侧插槽
    rowActions?: (row) => Array<{ label: string; onClick: () => void }>;
  };
}
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
interface UseAutoCrudResourceReturn<TSchema, TData> {
  // 表格数据
  tableData: {
    data: TData[];
    pageCount: number;
  };

  // 模态框状态
  modal: {
    variant: "dialog" | "sheet";
    createOpen: boolean;
    editOpen: boolean;
    viewOpen: boolean;
    deleteOpen: boolean;
    selected: TData | null;
    copySource: TData | null;
  };

  // 操作方法
  handlers: {
    openCreate: () => void;
    openEdit: (item: TData) => void;
    openView: (item: TData) => void;
    openDelete: (item: TData) => void;
    copyRow: (item: TData) => void;
    closeModals: () => void;
    submitCreate: (data: TData) => Promise<void>;
    submitUpdate: (data: TData) => Promise<void>;
    confirmDelete: () => Promise<void>;
    deleteMany: (rows: TData[]) => Promise<void>;
    updateMany: (rows: TData[], data: Record<string, unknown>) => Promise<void>;
  };

  // 加载状态
  mutations: {
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
  };
}
```

---

## 🔧 字段配置

### Field 类型

```typescript
interface Field {
  /** 字段标签（表格和表单共用） */
  label?: string;
  /** 是否隐藏（表格和表单都隐藏） */
  hidden?: boolean;
  /** 表格特定配置 */
  table?: {
    hidden?: boolean;                    // 仅表格隐藏
    meta?: Record<string, unknown>;      // 筛选器配置
    [key: string]: unknown;
  };
  /** 表单特定配置 */
  form?: {
    "x-hidden"?: boolean;                // 仅表单隐藏
    "x-component"?: string;              // 组件类型
    "x-component-props"?: Record<string, unknown>;  // 组件属性
    "x-reactions"?: object;              // 字段联动
    [key: string]: unknown;
  };
}

type Fields = Record<string, Field>;
```

### 基础配置

```typescript
<AutoCrudTable
  schema={taskSchema}
  resource={resource}
  fields={{
    id: { hidden: true },           // 表格和表单都隐藏
    title: { label: "标题" },        // 自定义标签
    createdAt: {
      label: "创建时间",
      form: { "x-hidden": true },    // 仅表单隐藏
    },
  }}
/>
```

### 表格筛选器配置

```typescript
<AutoCrudTable
  schema={taskSchema}
  resource={resource}
  fields={{
    status: {
      label: "状态",
      table: {
        meta: {
          variant: "select",  // "text" | "select" | "multiSelect" | "date" | "dateRange" | "range"
          options: [
            { label: "待处理", value: "pending" },
            { label: "已完成", value: "completed" },
          ],
        },
      },
    },
    amount: {
      label: "金额",
      table: {
        meta: {
          variant: "range",
          range: [0, 10000],
          unit: "¥",
        },
      },
    },
  }}
/>
```

### 表单组件配置

```typescript
<AutoCrudTable
  schema={taskSchema}
  resource={resource}
  fields={{
    description: {
      label: "描述",
      form: {
        "x-component": "Textarea",
        "x-component-props": { rows: 5 },
      },
    },
    assignee: {
      label: "负责人",
      form: {
        "x-component": "Combobox",
        "x-component-props": { placeholder: "选择负责人" },
      },
    },
  }}
/>
```

### 字段联动

```typescript
<AutoCrudTable
  schema={taskSchema}
  resource={resource}
  fields={{
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
/>
```

---

## 🎯 过滤模式

### Simple 模式（默认）

- 适合：快速筛选常用字段
- 特点：下拉选择框，一键清除
- 示例：状态筛选、优先级筛选

```typescript
table={{
  filterModes: "simple",
}}
```

### Advanced 模式（高级筛选）

- 适合：复杂多条件查询
- 特点：Notion 风格，支持 AND/OR 逻辑
- 示例：`status = "done" AND priority = "high"`

```typescript
table={{
  filterModes: "advanced",
}}
```

### Command 模式（命令面板）

- 适合：键盘流用户
- 特点：Linear 风格，快捷键 `Cmd+K`
- 示例：快速搜索并添加筛选条件

```typescript
table={{
  filterModes: "command",
}}
```

### 多模式切换

```typescript
table={{
  filterModes: ["simple", "advanced", "command"],  // 第一个为默认模式
}}
```

---

## 🔄 批量操作

### 批量更新

```typescript
<AutoCrudTable
  schema={taskSchema}
  resource={resource}
  table={{
    batchFields: ["status", "priority"],
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

## 🔌 与其他库集成

### 与 Drizzle ORM 集成

```typescript
import { createSelectSchema } from "drizzle-zod";
import { tasks } from "@/db/schema";

const taskSchema = createSelectSchema(tasks);

<AutoCrudTable schema={taskSchema} resource={resource} />
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

## 🧰 工具函数

### Schema Bridge - 核心转换函数

```typescript
import {
  parseZodField,        // 解析 Zod 字段类型
  createTableSchema,        // Zod Schema → TanStack Table 列定义
  createSelectColumn,   // 创建选择列
  createActionsColumn,  // 创建操作列
  createFormSchema,     // Zod Schema → Formily Schema
  createEditFormSchema, // 创建编辑表单 Schema（排除 id, createdAt, updatedAt）
} from "@wordrhyme/auto-crud";
```

### 自定义列渲染

使用 `createTableSchema` 的 `overrides` 参数自定义列渲染：

```typescript
import { createTableSchema } from "@wordrhyme/auto-crud";
import { Badge } from "@shadcn/ui";

const columns = createTableSchema(taskSchema, {
  overrides: {
    status: {
      label: "状态",
      // 自定义 cell 渲染
      cell: ({ row }) => {
        const status = row.getValue("status");
        return (
          <Badge variant={status === "done" ? "success" : "secondary"}>
            {status}
          </Badge>
        );
      },
    },
    priority: {
      label: "优先级",
      // 自定义列配置
      size: 100,
      enableSorting: false,
    },
  },
  exclude: ["id", "createdAt"],  // 排除字段
});
```

### 自定义表单渲染

使用 `createFormSchema` 的 `overrides` 参数自定义表单组件：

```typescript
import { createFormSchema } from "@wordrhyme/auto-crud";

const formSchema = createFormSchema(taskSchema, {
  overrides: {
    description: {
      "x-component": "Textarea",
      "x-component-props": { rows: 5 },
    },
    status: {
      "x-component": "Select",
      "x-component-props": {
        options: [
          { label: "待办", value: "todo" },
          { label: "完成", value: "done" },
        ],
      },
    },
    dueDate: {
      "x-component": "DatePicker",
      "x-component-props": { format: "YYYY-MM-DD" },
    },
  },
  layout: "grid",
  gridColumns: 2,
  exclude: ["id", "createdAt"],
});
```

---

## 🔀 三种 Schema 类型

`@wordrhyme/auto-crud` 支持三种 Schema 输入格式，通过 `SchemaAdapter` 统一处理：

### 1. Zod Schema（推荐）

```typescript
import { z } from "zod";

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["todo", "in-progress", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  createdAt: z.date(),
});
```

### 2. JSON Schema

```typescript
import type { JSONSchema } from "@wordrhyme/auto-crud";

const taskSchema: JSONSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    title: { type: "string", title: "标题" },
    status: {
      type: "string",
      enum: ["todo", "in-progress", "done"],
      title: "状态",
    },
    createdAt: { type: "string", format: "date-time" },
  },
  required: ["id", "title"],
};
```

### 3. 简化配置（Simple Config）

```typescript
import type { SimpleFieldsConfig } from "@wordrhyme/auto-crud";

const taskSchema: SimpleFieldsConfig = {
  id: { type: "string", required: true },
  title: { type: "string", label: "标题", required: true },
  status: {
    type: "select",
    label: "状态",
    options: ["todo", "in-progress", "done"],
  },
  description: { type: "textarea", label: "描述" },
  createdAt: { type: "datetime" },
};
```

### SchemaAdapter 使用

```typescript
import { SchemaAdapter } from "@wordrhyme/auto-crud";

// 自动检测 Schema 类型
const type = SchemaAdapter.detectType(schema);  // "zod" | "json" | "simple"

// 转换为统一的字段定义
const fields = SchemaAdapter.toUnified(schema);

// 转换为 Formily Schema
const formilySchema = SchemaAdapter.toFormily(fields);
```

---

## 🧩 基础组件（自定义组合）

如果 `AutoCrudTable` 不能满足需求，可以使用基础组件自行组合：

### 组件层级

```
AutoCrudTable         ← 高级封装，一站式 CRUD
  ├── AutoTable       ← 表格 + 工具栏 + 筛选器
  │   ├── DataTable   ← 纯表格组件（TanStack Table）
  │   ├── AutoTableActionBar    ← 批量操作栏
  │   └── AutoTableSimpleFilters ← 简单筛选器
  ├── AutoForm        ← 表单组件（Formily）
  └── CrudFormModal   ← 表单弹窗（创建/编辑/查看）
```

### 使用 DataTable 组件

```typescript
import { DataTable, createTableSchema, createSelectColumn, createActionsColumn } from "@wordrhyme/auto-crud";

function CustomTable({ data }) {
  const columns = [
    createSelectColumn(),
    ...createTableSchema(taskSchema, { exclude: ["id"] }),
    createActionsColumn({
      onEdit: (row) => console.log("Edit", row),
      onDelete: (row) => console.log("Delete", row),
      onView: (row) => console.log("View", row),
      onCopy: (row) => console.log("Copy", row),
    }),
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      pageCount={10}
    />
  );
}
```

### 使用 AutoForm 组件

```typescript
import { AutoForm, createFormSchema } from "@wordrhyme/auto-crud";
import { createForm } from "@formily/core";

function CustomForm() {
  const form = createForm();
  const formSchema = createFormSchema(taskSchema, {
    exclude: ["id", "createdAt"],
    layout: "grid",
    gridColumns: 2,
  });

  return (
    <AutoForm
      form={form}
      schema={formSchema}
      onSubmit={(values) => console.log(values)}
    />
  );
}
```

### 使用 useDataTable Hook

```typescript
import { useDataTable, DataTable, DataTablePagination } from "@wordrhyme/auto-crud";

function CustomDataTable({ data, pageCount }) {
  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
      sorting: [{ id: "createdAt", desc: true }],
    },
  });

  return (
    <div>
      <DataTable table={table} />
      <DataTablePagination table={table} />
    </div>
  );
}
```

### 组件组合示例

```typescript
import {
  AutoTable,
  AutoForm,
  CrudFormModal,
  useAutoCrudResource,
  createTableSchema,
  createFormSchema,
} from "@wordrhyme/auto-crud";

function CustomCrudPage() {
  const resource = useAutoCrudResource({ dataSource, schema: taskSchema });

  const columns = createTableSchema(taskSchema, {
    overrides: {
      status: {
        cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
      },
    },
  });

  const formSchema = createFormSchema(taskSchema, {
    exclude: ["id", "createdAt", "updatedAt"],
  });

  return (
    <div>
      {/* 自定义表格 */}
      <AutoTable
        columns={columns}
        data={resource.tableData.data}
        pageCount={resource.tableData.pageCount}
        filterMode="simple"
      />

      {/* 自定义表单弹窗 */}
      <CrudFormModal
        mode={resource.modal.editOpen ? "edit" : "create"}
        open={resource.modal.createOpen || resource.modal.editOpen}
        onClose={resource.handlers.closeModals}
        schema={formSchema}
        initialValues={resource.modal.selected}
        onSubmit={resource.modal.editOpen
          ? resource.handlers.submitUpdate
          : resource.handlers.submitCreate}
      />
    </div>
  );
}
```

---

## 📦 导出的类型

```typescript
// Auto-CRUD 组件
export { AutoCrudTable } from "./components/auto-crud/auto-crud-table";
export type { Field, Fields, AutoCrudTableProps } from "./components/auto-crud/auto-crud-table";
export { AutoForm } from "./components/auto-crud/auto-form";
export { AutoTable } from "./components/auto-crud/auto-table";
export { AutoTableActionBar } from "./components/auto-crud/auto-table-action-bar";
export { AutoTableSimpleFilters } from "./components/auto-crud/auto-table-simple-filters";
export { CrudFormModal } from "./components/auto-crud/crud-form-modal";

// 数据表格组件
export { DataTable } from "./components/data-table/data-table";
export { DataTableAdvancedToolbar } from "./components/data-table/data-table-advanced-toolbar";
export { DataTableColumnHeader } from "./components/data-table/data-table-column-header";
export { DataTableFacetedFilter } from "./components/data-table/data-table-faceted-filter";
export { DataTablePagination } from "./components/data-table/data-table-pagination";
export { DataTableToolbar } from "./components/data-table/data-table-toolbar";
export { DataTableViewOptions } from "./components/data-table/data-table-view-options";

// Hooks
export { useAutoCrudResource, noopToastAdapter } from "./hooks/use-auto-crud-resource";
export type { ToastAdapter, CrudHooks, UseAutoCrudResourceOptions } from "./hooks/use-auto-crud-resource";
export { useDataTable } from "./hooks/use-data-table";
export { useReadableFilters } from "./hooks/use-readable-filters";
export { useUrlState, useQueryState, useQueryStates } from "./hooks/use-url-state";

// Schema Bridge - 核心工具
export { parseZodField, createTableSchema, createSelectColumn, createActionsColumn } from "./lib/schema-bridge/zod-to-columns";
export { createFormSchema, createEditFormSchema } from "./lib/schema-bridge/zod-to-formily";
export { SchemaAdapter } from "./lib/schema-bridge/schema-adapter";
export type {
  ColumnOverrides, FormSchemaOverrides,
  CreateTableSchemaOptions, CreateFormSchemaOptions,
  UnifiedSchema, JSONSchema, SimpleFieldsConfig, UnifiedField,
} from "./lib/schema-bridge";

// 数据源
export { createTRPCDataSource, createMemoryDataSource } from "./lib/data-source";
export type { DataSource, ListParams, ListResult } from "./lib/data-source";

// 工具函数
export { cn } from "./lib/utils";
export { formatDate } from "./lib/format";
export { humanize } from "./lib/humanize";
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
