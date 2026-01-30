# @wordrhyme/auto-crud 快速参考

> 5 分钟快速上手指南

---

## 📦 安装

```bash
# 前端包
pnpm add @wordrhyme/auto-crud zod

# 后端包（如果使用 tRPC）
pnpm add @wordrhyme/auto-crud-server
```

---

## 🚀 最小示例

### 前端（内存数据源）

```typescript
import { AutoCrudTable, useAutoCrudResource, createMemoryDataSource } from "@wordrhyme/auto-crud";
import { z } from "zod";

const schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

function App() {
  const dataSource = createMemoryDataSource({
    data: [{ id: "1", name: "Alice", email: "alice@example.com" }],
    onCreate: async (data) => { /* ... */ },
    onUpdate: async (id, data) => { /* ... */ },
    onDelete: async (id) => { /* ... */ },
  });

  const resource = useAutoCrudResource({ dataSource, schema });

  return <AutoCrudTable title="Users" schema={schema} resource={resource} />;
}
```

### 后端（tRPC + Drizzle）

```typescript
// 1. 定义表
export const users = pgTable("users", {
  id: varchar("id", { length: 30 }).primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  email: varchar("email", { length: 256 }).notNull(),
});

// 2. 创建路由
import { createCrudRouter } from "@wordrhyme/auto-crud-server";
import { createSelectSchema } from "drizzle-zod";

const selectSchema = createSelectSchema(users);
const insertSchema = selectSchema.omit({ id: true });
const updateSchema = insertSchema.partial();

export const usersRouter = createCrudRouter({
  table: users,
  selectSchema,
  insertSchema,
  updateSchema,
});
```

---

## 🎯 常用配置

### 字段配置

```typescript
fieldOverrides={{
  id: { hidden: true },
  email: { label: "邮箱" },
  status: {
    label: "状态",
    table: {
      meta: {
        variant: "select",
        options: [
          { label: "激活", value: "active" },
          { label: "禁用", value: "inactive" },
        ],
      },
    },
  },
}}
```

### 过滤模式

```typescript
tableProps={{
  filterMode: ["simple", "advanced", "command"],
  batchUpdateFields: ["status", "role"],
}}
```

---

## 📚 API 速查

### 前端组件

| 组件 | 用途 |
|------|------|
| `<AutoCrudTable />` | 完整 CRUD 表格 |
| `<AutoForm />` | 自动表单 |
| `<AutoTable />` | 纯表格（无 CRUD） |

### 前端 Hooks

| Hook | 用途 |
|------|------|
| `useAutoCrudResource()` | 连接数据源 |
| `useDataTable()` | 表格状态管理 |

### 后端函数

| 函数 | 用途 |
|------|------|
| `createCrudRouter()` | 生成 CRUD 路由 |

### 数据源

| 函数 | 用途 |
|------|------|
| `createMemoryDataSource()` | 内存数据源 |
| `createTRPCDataSource()` | tRPC 数据源 |

---

## 🔗 完整文档

- [@wordrhyme/auto-crud README](./auto-crud/README.md)
- [@wordrhyme/auto-crud-server README](./auto-crud-server/README.md)
