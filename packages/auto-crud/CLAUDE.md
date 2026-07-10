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
export { AutoCrudTable } from './components/auto-crud/auto-crud-table';
export type {
  Field,
  Fields,
  AutoCrudTableProps,
} from './components/auto-crud/auto-crud-table';
export type { CrudPermissions, CrudOperationPermissions } from './types/permissions';
export { AutoForm } from './components/auto-crud/auto-form';
export { AutoTable } from './components/auto-crud/auto-table';
export { AutoTableActionBar } from './components/auto-crud/auto-table-action-bar';
export { AutoTableSimpleFilters } from './components/auto-crud/auto-table-simple-filters';
export { CrudFormModal } from './components/auto-crud/crud-form-modal';
```

### 数据表格组件

```typescript
export { DataTable } from './components/data-table/data-table';
export { DataTableAdvancedToolbar } from './components/data-table/data-table-advanced-toolbar';
export { DataTableColumnHeader } from './components/data-table/data-table-column-header';
export { DataTableFacetedFilter } from './components/data-table/data-table-faceted-filter';
export { DataTablePagination } from './components/data-table/data-table-pagination';
```

### Hooks

```typescript
export { useAutoCrudResource, noopToastAdapter } from './hooks/use-auto-crud-resource';
export type {
  ToastAdapter,
  CrudHooks,
  UseAutoCrudResourceOptions,
} from './hooks/use-auto-crud-resource';
export { useDataTable } from './hooks/use-data-table';
export { useReadableFilters } from './hooks/use-readable-filters';
```

### Schema Bridge - 核心工具

```typescript
// 转换函数
export {
  parseZodField,
  createTableSchema,
  createSelectColumn,
  createActionsColumn,
} from './lib/schema-bridge/zod-to-columns';
export {
  createFormSchema,
  createEditFormSchema,
} from './lib/schema-bridge/zod-to-formily';

// Schema 适配器（支持 3 种 Schema 类型）
export { SchemaAdapter } from './lib/schema-bridge/schema-adapter';
export type {
  UnifiedSchema, // Zod | JSON Schema | Simple Config
  JSONSchema, // JSON Schema 格式
  SimpleFieldsConfig, // 简化配置格式
  UnifiedField, // 统一字段定义
} from './lib/schema-bridge/schema-adapter';

// 类型定义
export type {
  ColumnOverrides,
  FormSchemaOverrides,
  CreateTableSchemaOptions,
  CreateFormSchemaOptions,
} from './lib/schema-bridge/types';
```

### 数据源

```typescript
export { createTRPCDataSource, createMemoryDataSource } from './lib/data-source';
export type { DataSource, ListParams, ListResult } from './lib/data-source';
```

---

## 使用示例

### 基础用法

```typescript
import { AutoCrudTable, useAutoCrudResource } from "@wordrhyme/auto-crud";
import { z } from "zod";

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["todo", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  createdAt: z.date(),
});

export default function TasksPage() {
  const resource = useAutoCrudResource({ schema: taskSchema, /* ... */ });

  return (
    <AutoCrudTable
      title="任务管理"
      schema={taskSchema}
      resource={resource}
    />
  );
}
```

### 高级用法（字段配置）

使用 `fields` prop 进行统一字段配置，支持共用配置 + 表格/表单特定配置：

```typescript
import { AutoCrudTable, type Fields } from "@wordrhyme/auto-crud";
import { z } from "zod";

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["todo", "done"]),
  assignee: z.string().optional(),
  createdAt: z.date(),
});

// 统一字段配置
const fields: Fields = {
  id: {
    hidden: true,  // 表格和表单都隐藏
  },
  status: {
    label: "状态",  // 表格和表单共用标签
    table: {
      meta: {
        variant: "select",
        options: [
          { label: "待办", value: "todo" },
          { label: "完成", value: "done" },
        ],
      },
    },
    form: {
      "x-component": "Select",
      "x-reactions": {
        dependencies: ["priority"],
        when: "{{$deps[0] === 'urgent'}}",
        fulfill: { state: { required: true } },
      },
    },
  },
  assignee: {
    label: "负责人",
    form: {
      "x-component": "Combobox",
      "x-component-props": { placeholder: "选择负责人" },
    },
  },
  createdAt: {
    label: "创建时间",
    form: {
      "x-hidden": true,  // 仅表单隐藏
    },
  },
};

export default function TasksPage() {
  const resource = useAutoCrudResource({ schema: taskSchema, /* ... */ });

  return (
    <AutoCrudTable
      title="任务管理"
      schema={taskSchema}
      resource={resource}
      fields={fields}
      table={{
        filterModes: ["simple", "advanced", "command"],  // 过滤模式，第一个为默认
        batchFields: ["status", "priority"],  // 批量更新字段
        defaultSort: [{ id: "createdAt", desc: true }],
      toolbarActions={[
        { type: "export", label: "自定义导出按钮" },
        // ...
      ]}
    />
  );
}
```

---

## API 参考

### Field 类型

```typescript
interface Field {
  /** 字段标签（表格和表单共用） */
  label?: string;
  /** 是否隐藏（表格和表单都隐藏） */
  hidden?: boolean;
  /** 筛选器独立配置（不影响表格列显示/隐藏） */
  filter?: {
    enabled?: boolean; // 是否启用筛选（默认 true）
    variant?:
      | 'text'
      | 'number'
      | 'range'
      | 'date'
      | 'dateRange'
      | 'boolean'
      | 'select'
      | 'multiSelect';
    options?: Option[]; // select/multiSelect 的选项
    range?: [number, number]; // range 的范围
    unit?: string; // number 的单位
    placeholder?: string; // 占位符
    hidden?: boolean; // 筛选栏中隐藏（不影响表格列）
  };
  /** 表格特定配置 */
  table?: {
    hidden?: boolean; // 仅表格隐藏
    meta?: Record<string, unknown>; // 筛选器配置
    [key: string]: unknown;
  };
  /** 表单特定配置 */
  form?: {
    'x-hidden'?: boolean; // 仅表单隐藏
    'x-component'?: string; // 组件类型
    'x-component-props'?: Record<string, unknown>; // 组件属性
    'x-reactions'?: object; // 字段联动
    [key: string]: unknown;
  };
}

type Fields = Record<string, Field>;
```

### AutoCrudTableProps

```typescript
interface AutoCrudTableProps<TSchema> {
  title?: string;
  description?: string;
  schema: TSchema;
  resource: UseAutoCrudResourceReturn<TSchema, z.output<TSchema>>;
  fields?: Fields;
  table?: {
    hidden?: string[];
    overrides?: Record<string, any>;
    filterModes?: FilterMode | FilterMode[]; // "simple" | "advanced" | "command"
    batchFields?: (string | BatchUpdateField)[];
    defaultSort?: any[];
  };
  form?: {
    overrides?: Record<string, any>;
    columns?: number;
  };
  /**
   * 工具栏右侧操作配置
   * - 只传 custom 项：内置保持默认，custom 追加到首/尾
   * - 包含任意内置 type：数组完全接管，未列出的内置项自动隐藏
   */
  toolbarActions?: ToolbarActionItem[];
  /**
   * 行操作配置
   * - 只传 custom 项：内置保持默认，custom 追加到首/尾
   * - 包含任意内置 type：数组完全接管，未列出的隐藏，顺序即渲染顺序
   */
  actions?: ActionItem<z.output<TSchema>>[];
  permissions?: CrudPermissions;
}
```

### CrudPermissions 类型

```typescript
/**
 * CRUD 操作权限
 */
interface CrudOperationPermissions {
  create?: boolean;
  update?: boolean;
  delete?: boolean;
  export?: boolean;
}

/**
 * AutoCrudTable 权限配置
 */
interface CrudPermissions {
  /** 操作权限（默认 true） */
  can?: CrudOperationPermissions;
  /** 禁止访问的字段列表 */
  deny?: string[];
}
```

---

## 关键依赖与配置

### 核心依赖

| 包名                      | 版本         | 用途             |
| ------------------------- | ------------ | ---------------- |
| @wordrhyme/shadcn         | workspace:\* | 基础 UI 组件     |
| @wordrhyme/formily-shadcn | workspace:\* | Formily 表单集成 |
| @wordrhyme/shadcn-ui      | workspace:\* | 扩展 UI 组件     |
| @tanstack/react-table     | ^8.21.3      | 数据表格核心     |

### Peer Dependencies

```json
{
  "react": "^18.0.0 || ^19.0.0",
  "react-dom": "^18.0.0 || ^19.0.0",
  "sonner": "^2.0.0",
  "zod": "^3.0.0 || ^4.0.0"
}
```

### 用户安装

```bash
pnpm add @wordrhyme/auto-crud zod sonner
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
│   │   ├── auto-table-action-bar.tsx
│   │   ├── auto-table-simple-filters.tsx
│   │   └── crud-form-modal.tsx
│   ├── data-table/         # 高级数据表格
│   │   ├── data-table.tsx
│   │   ├── data-table-advanced-toolbar.tsx
│   │   ├── data-table-filter-list.tsx
│   │   ├── data-table-filter-menu.tsx
│   │   └── data-table-faceted-filter.tsx
│   └── ui/                 # 自定义 UI 组件
├── hooks/                  # React Hooks
│   ├── use-auto-crud-resource.ts
│   ├── use-data-table.ts
│   ├── use-readable-filters.ts
│   └── use-url-state.ts
├── lib/
│   ├── schema-bridge/      # Schema 转换工具
│   │   ├── zod-to-formily.ts
│   │   ├── zod-to-columns.tsx
│   │   ├── schema-adapter.ts
│   │   └── types.ts
│   ├── data-source.ts      # 数据源抽象
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

### Q: 如何自定义列渲染？

使用 `createTableSchema` 的 `overrides` 配置 `cell` 属性：

```typescript
import { createTableSchema } from "@wordrhyme/auto-crud";
import { Badge } from "@shadcn/ui";

const columns = createTableSchema(taskSchema, {
  overrides: {
    status: {
      label: "状态",
      cell: ({ row }) => {
        const status = row.getValue("status");
        return <Badge variant={status === "done" ? "success" : "secondary"}>{status}</Badge>;
      },
    },
  },
  exclude: ["id"],
});
```

### Q: 支持哪些 Schema 格式？

支持 3 种 Schema 格式，通过 `SchemaAdapter` 自动检测和转换：

```typescript
import { SchemaAdapter } from '@wordrhyme/auto-crud';

// 1. Zod Schema（推荐）
const zodSchema = z.object({ title: z.string() });

// 2. JSON Schema
const jsonSchema = {
  type: 'object',
  properties: { title: { type: 'string' } },
};

// 3. 简化配置
const simpleConfig = {
  title: { type: 'string', label: '标题' },
};

// 自动检测类型
const type = SchemaAdapter.detectType(schema); // "zod" | "json" | "simple"

// 统一转换
const fields = SchemaAdapter.toUnified(schema);
```

### Q: 如何使用基础组件自定义组合？

`AutoCrudTable` 是高级封装，如需更细粒度控制，可使用基础组件：

```typescript
import {
  DataTable,           // 纯表格组件
  AutoTable,           // 表格 + 工具栏
  AutoForm,            // 表单组件
  CrudFormModal,       // 表单弹窗
  useDataTable,        // 表格状态 Hook
  createTableSchema,       // 列定义工具
  createFormSchema,    // 表单 Schema 工具
} from "@wordrhyme/auto-crud";

// 自定义组合
function CustomCrud() {
  const columns = createTableSchema(schema, { /* ... */ });
  const formSchema = createFormSchema(schema, { /* ... */ });

  return (
    <>
      <DataTable columns={columns} data={data} />
      <CrudFormModal schema={formSchema} /* ... */ />
    </>
  );
}
```

### Q: 如何实现字段联动？

使用 `form["x-reactions"]` 配置：

```typescript
const fields: Fields = {
  endDate: {
    label: '结束日期',
    form: {
      'x-reactions': {
        dependencies: ['startDate'],
        when: '{{$deps[0] !== undefined}}',
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

### Q: 如何配置表格筛选器？

使用 `table.meta` 配置（传统方式）或 `filter` 独立配置（推荐）：

```typescript
const fields: Fields = {
  // 方式 1: 使用 filter 独立配置（推荐）
  status: {
    label: '状态',
    filter: {
      variant: 'select',
      options: [
        { label: '待办', value: 'todo' },
        { label: '完成', value: 'done' },
      ],
    },
  },
  // 方式 2: 使用 table.meta 配置（传统方式，仍然支持）
  amount: {
    label: '金额',
    table: {
      meta: {
        variant: 'range',
        range: [0, 10000],
        unit: '¥',
      },
    },
  },
  // 筛选器隐藏但表格列保留
  internalCode: {
    label: '内部编码',
    filter: { hidden: true }, // 筛选栏中不显示，但表格列正常显示
  },
};
```

> **filter vs table.meta 优先级**: `filter` 配置会覆盖 `table.meta` 中的同名属性。
> **自动折叠行**: 当 simple 模式下筛选项过多超出一行时，会自动折叠多余行并显示「+N 筛选」展开按钮。

### Q: 如何集成服务端（tRPC）？

```typescript
import { createCrudRouter } from '@wordrhyme/auto-crud-server';

const taskRouter = createCrudRouter({
  table: tasks,
  insertSchema: insertTaskSchema,
  updateSchema: updateTaskSchema,
});
```

### Q: 如何控制按钮和字段的可见性？

使用 `permissions` prop 配置权限：

```typescript
import { AutoCrudTable, type CrudPermissions } from "@wordrhyme/auto-crud";

function EmployeesPage() {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  // 业务层计算权限
  const permissions: CrudPermissions = useMemo(() => ({
    can: {
      create: user?.role === 'admin',
      update: user?.role === 'admin' || user?.role === 'editor',
      delete: user?.role === 'admin',
      export: true,
    },
    // 非管理员隐藏敏感字段
    deny: user?.role !== 'admin' ? ['salary', 'ssn'] : [],
  }), [user?.role]);

  const resource = useAutoCrudResource({ schema: employeeSchema, /* ... */ });

  return (
    <AutoCrudTable
      schema={employeeSchema}
      resource={resource}
      permissions={permissions}
    />
  );
}
```

**权限效果：**

- `can.create = false` → 隐藏「新建」按钮和「复制」行操作
- `can.update = false` → 隐藏「编辑」按钮和批量更新功能
- `can.delete = false` → 隐藏「删除」按钮和批量删除功能
- `can.export = false` → 隐藏「导出」按钮
- `deny: ['salary']` → 表格和表单中都隐藏 salary 字段

---

## 相关文件清单

| 类别        | 关键文件                                            |
| ----------- | --------------------------------------------------- |
| 入口        | `src/index.ts`                                      |
| 核心组件    | `src/components/auto-crud/`                         |
| 数据表格    | `src/components/data-table/`                        |
| Schema 转换 | `src/lib/schema-bridge/`                            |
| 数据源      | `src/lib/data-source.ts`                            |
| 配置        | `package.json`, `tsdown.config.ts`, `tsconfig.json` |

---

## 变更记录 (Changelog)

### 2026-02-03

- 新增 `permissions` prop 支持权限控制
- 新增 `CrudPermissions` 和 `CrudOperationPermissions` 类型导出
- 支持通过 `can.create/update/delete/export` 控制按钮显示
- 支持通过 `deny` 字段列表隐藏敏感字段

### 2026-01-30

- 默认过滤模式改为 "simple"
- 文档更新：统一使用 `fields` API（替代旧的 `fieldOverrides`）

### 2026-01-26

- 迁移到 shadcn-components monorepo
- 采用 workspace 依赖策略
- 优化 peerDependencies
- 使用 tsdown 构建工具

详细变更历史请查看 [CHANGELOG.md](./CHANGELOG.md)
