# @wordrhyme/auto-crud-server

> tRPC server utilities for auto-crud - automatic CRUD routers for Drizzle ORM

为 Drizzle ORM 表自动生成 tRPC CRUD 路由，支持分页、排序、高级过滤。

[![npm version](https://img.shields.io/npm/v/@wordrhyme/auto-crud-server.svg)](https://www.npmjs.com/package/@wordrhyme/auto-crud-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ✨ 特性

- 🚀 **零代码 CRUD**: 一行代码生成完整 CRUD 路由
- 🔒 **类型安全**: 完整的 TypeScript 类型推断
- 🎯 **高级过滤**: 支持多条件、多操作符（等于、包含、范围等）
- 📊 **排序分页**: 内置分页和多字段排序支持
- 🔌 **Drizzle 集成**: 无缝集成 Drizzle ORM
- 🌐 **tRPC 原生**: 基于 tRPC v11 构建
- 📦 **零依赖**: 所有依赖都是 peer dependencies

---

## 📦 安装

```bash
# pnpm
pnpm add @wordrhyme/auto-crud-server

# npm
npm install @wordrhyme/auto-crud-server

# yarn
yarn add @wordrhyme/auto-crud-server
```

### Peer Dependencies

```json
{
  "@trpc/server": "^11.0.0",
  "drizzle-orm": "^0.40.0",
  "zod": "^3.0.0 || ^4.0.0"
}
```

---

## 🚀 快速开始

### 步骤 1: 定义数据库 Schema

```typescript
// src/db/schema.ts
import { pgTable, varchar, real, boolean, timestamp } from 'drizzle-orm/pg-core';

export const tasks = pgTable('tasks', {
  id: varchar('id', { length: 30 }).primaryKey(),
  title: varchar('title', { length: 128 }).notNull(),
  status: varchar('status', {
    enum: ['todo', 'in-progress', 'done', 'canceled'],
  })
    .notNull()
    .default('todo'),
  priority: varchar('priority', {
    enum: ['low', 'medium', 'high'],
  })
    .notNull()
    .default('low'),
  estimatedHours: real('estimated_hours').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### 步骤 2: 创建 CRUD 路由

```typescript
// src/server/routers/tasks.ts
import { createCrudRouter } from '@wordrhyme/auto-crud-server';
import { tasks } from '@/db/schema';

// 🚀 零配置！一行代码生成完整 CRUD 路由
export const tasksRouter = createCrudRouter({
  table: tasks,
  // Schema 自动从 table 派生，排除平台托管字段
});
```

**或者，显式传入 Schema：**

```typescript
import { createCrudRouter } from '@wordrhyme/auto-crud-server';
import { tasks } from '@/db/schema';
import { createSelectSchema } from 'drizzle-zod';

// 从 Drizzle Schema 自动生成 Zod Schema
const taskSchema = createSelectSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const tasksRouter = createCrudRouter({
  table: tasks,
  schema: taskSchema, // 主 Schema（用于 create/upsert）
  // updateSchema 自动派生为 schema.partial()
});
```

### 步骤 3: 汇总路由

```typescript
// src/server/routers/index.ts
import { router } from '../trpc';
import { tasksRouter } from './tasks';

export const appRouter = router({
  tasks: tasksRouter,
});

export type AppRouter = typeof appRouter;
```

### 步骤 4: 创建 API 路由处理器

```typescript
// src/app/api/trpc/[trpc]/route.ts (Next.js App Router)
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers';
import { db } from '@/db';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => ({ db }),
  });

export { handler as GET, handler as POST };
```

---

## 📖 自动生成的路由

`createCrudRouter` 会自动生成以下 8 个路由：

### 1. `list` - 列表查询

**输入**:

```typescript
{
  page: number;           // 页码（从 1 开始）
  perPage: number;        // 每页条数
  sort?: Array<{          // 排序
    id: string;           // 字段名
    desc: boolean;        // 是否降序
  }>;
  filters?: Array<{       // 过滤条件
    id: string;           // 字段名
    value: any;           // 值
    operator: string;     // 操作符
    variant: string;      // 筛选器类型
  }>;
  joinOperator?: "and" | "or";  // 多条件连接方式
}
```

未传 `sort` 或传空数组时，如果表存在 `createdAt` 且未被 `sortableColumns`
白名单排除，列表默认按 `createdAt` 降序返回。

**输出**:

```typescript
{
  data: Task[];           // 数据列表
  total: number;          // 总条数
}
```

**示例**:

```typescript
const result = await trpc.tasks.list({
  page: 1,
  perPage: 10,
  sort: [{ id: 'createdAt', desc: true }],
  filters: [
    { id: 'status', value: 'done', operator: 'eq', variant: 'select' },
    { id: 'priority', value: 'high', operator: 'eq', variant: 'select' },
  ],
  joinOperator: 'and',
});
```

### 2. `get` - 单条查询

**输入**:

```typescript
{
  id: string;
}
```

**输出**:

```typescript
Task;
```

**示例**:

```typescript
const task = await trpc.tasks.get({ id: '123' });
```

### 3. `create` - 创建

**输入**:

```typescript
Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;
```

**输出**:

```typescript
Task;
```

**示例**:

```typescript
const newTask = await trpc.tasks.create({
  title: 'New Task',
  status: 'todo',
  priority: 'high',
});
```

### 4. `update` - 更新

**输入**:

```typescript
{
  id: string;
  data: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>;
}
```

**输出**:

```typescript
Task;
```

**示例**:

```typescript
const updatedTask = await trpc.tasks.update({
  id: '123',
  data: { status: 'done' },
});
```

### 5. `delete` - 删除

**输入**:

```typescript
{
  id: string;
}
```

**输出**:

```typescript
void
```

**示例**:

```typescript
await trpc.tasks.delete({ id: '123' });
```

### 6. `deleteMany` - 批量删除

**输入**:

```typescript
{ ids: string[] }
```

**输出**:

```typescript
void
```

**示例**:

```typescript
await trpc.tasks.deleteMany({ ids: ['1', '2', '3'] });
```

### 7. `updateMany` - 批量更新

**输入**:

```typescript
{
  ids: string[];
  data: Partial<Omit<Task, "id" | "createdAt" | "updatedAt">>;
}
```

**输出**:

```typescript
{
  updated: number;
}
```

**示例**:

```typescript
await trpc.tasks.updateMany({
  ids: ['1', '2', '3'],
  data: { status: 'done' },
});
```

### 8. `upsert` - 存在则更新，不存在则创建

**输入**:

```typescript
Omit<Task, 'createdAt' | 'updatedAt'>; // 需要包含 id
```

**输出**:

```typescript
{
  data: Task; // 创建或更新后的记录
  isNew: boolean; // true = 新建, false = 更新
}
```

**示例**:

```typescript
// 如果 id="123" 存在则更新，不存在则创建
const { data, isNew } = await trpc.tasks.upsert({
  id: '123',
  title: 'My Task',
  status: 'todo',
});

if (isNew) {
  console.log('Created new task');
} else {
  console.log('Updated existing task');
}
```

**适用场景**：

- 同步外部数据
- 幂等导入
- 配置项更新

---

## 🎯 高级过滤

### 支持的操作符

| 操作符      | 说明       | 示例                                              |
| ----------- | ---------- | ------------------------------------------------- |
| `eq`        | 等于       | `status = "done"`                                 |
| `ne`        | 不等于     | `status != "canceled"`                            |
| `gt`        | 大于       | `estimatedHours > 5`                              |
| `gte`       | 大于等于   | `estimatedHours >= 5`                             |
| `lt`        | 小于       | `estimatedHours < 10`                             |
| `lte`       | 小于等于   | `estimatedHours <= 10`                            |
| `like`      | 包含       | `title LIKE "%bug%"`                              |
| `notLike`   | 不包含     | `title NOT LIKE "%test%"`                         |
| `in`        | 在列表中   | `status IN ["todo", "in-progress"]`               |
| `notIn`     | 不在列表中 | `status NOT IN ["canceled"]`                      |
| `between`   | 范围       | `createdAt BETWEEN "2024-01-01" AND "2024-12-31"` |
| `isNull`    | 为空       | `description IS NULL`                             |
| `isNotNull` | 不为空     | `description IS NOT NULL`                         |

### 过滤示例

#### 单条件过滤

```typescript
await trpc.tasks.list({
  page: 1,
  perPage: 10,
  filters: [{ id: 'status', value: 'done', operator: 'eq', variant: 'select' }],
});
```

#### 多条件 AND 过滤

```typescript
await trpc.tasks.list({
  page: 1,
  perPage: 10,
  filters: [
    { id: 'status', value: 'done', operator: 'eq', variant: 'select' },
    { id: 'priority', value: 'high', operator: 'eq', variant: 'select' },
  ],
  joinOperator: 'and', // status = "done" AND priority = "high"
});
```

#### 多条件 OR 过滤

```typescript
await trpc.tasks.list({
  page: 1,
  perPage: 10,
  filters: [
    { id: 'status', value: 'todo', operator: 'eq', variant: 'select' },
    { id: 'status', value: 'in-progress', operator: 'eq', variant: 'select' },
  ],
  joinOperator: 'or', // status = "todo" OR status = "in-progress"
});
```

#### 范围过滤

```typescript
await trpc.tasks.list({
  page: 1,
  perPage: 10,
  filters: [
    {
      id: 'createdAt',
      value: ['2024-01-01', '2024-12-31'],
      operator: 'between',
      variant: 'dateRange',
    },
  ],
});
```

#### 模糊搜索

```typescript
await trpc.tasks.list({
  page: 1,
  perPage: 10,
  filters: [{ id: 'title', value: 'bug', operator: 'like', variant: 'text' }],
});
```

---

## 🔧 API 参考

### `createCrudRouter(config)`

创建 CRUD 路由。

#### 参数

```typescript
interface CrudRouterConfig<TTable, TSelect, TInsert, TUpdate> {
  // ========== 必填 ==========
  table: TTable; // Drizzle 表定义

  // ========== Schema 配置（可选） ==========
  schema?: z.ZodType<TInsert>; // 主 Schema（用于 create/upsert）
  updateSchema?: z.ZodType<TUpdate>; // 更新 Schema（覆盖自动派生）
  selectSchema?: z.ZodType<TSelect>; // 查询返回 Schema
  listInputSchema?: z.ZodType; // list 输入 Schema（可扩展）
  getInputSchema?: z.ZodType; // get 输入 Schema（可扩展）
  exportInputSchema?: z.ZodType; // export 输入 Schema（可扩展）

  // ========== 其他配置 ==========
  idField?: string; // ID 字段名，默认 "id"
  filterableColumns?: CrudColumnRef<TTable>[]; // 可过滤字段白名单
  sortableColumns?: CrudColumnRef<TTable>[]; // 可排序字段白名单
  omitFields?: string[]; // 自动派生时额外排除的业务字段
  // 默认已排除 ["id", "createdAt", "updatedAt", "createdBy", "createdByType", "updatedBy", "updatedByType"]
}
```

#### Schema 派生规则

| 配置              | 派生行为                                             |
| ----------------- | ---------------------------------------------------- |
| 无 `schema`       | 从 `table` 自动派生，排除默认托管字段和 `omitFields` |
| 无 `updateSchema` | 从 `schema.partial().refine(nonEmpty)` 派生          |
| 无 `selectSchema` | 若有 `schema` 则使用它，否则从 `table` 派生          |

#### 使用示例

```typescript
// 1. 零配置 - 全部自动派生
const tasksRouter = createCrudRouter({
  table: tasks,
});

// 2. 传入 schema，updateSchema 自动派生
const postsRouter = createCrudRouter({
  table: posts,
  schema: postSchema,
});

// 3. 传入 schema + 自定义 updateSchema
const usersRouter = createCrudRouter({
  table: users,
  schema: userSchema,
  updateSchema: customUpdateSchema,
});

// 4. 自定义排除字段
const ordersRouter = createCrudRouter({
  table: orders,
  omitFields: ['internalCode'],
});
```

### 扩展读取输入

默认 `list` 输入为 `baseListInputSchema`：

```typescript
{
  page: number;
  perPage: number;
  sort?: Array<{ id: string; desc: boolean }>;
  filters?: Array<FilterItem>;
  joinOperator: "and" | "or";
}
```

业务侧可以用 `baseListInputSchema.extend(...)` 增加自定义参数，不需要覆盖
`list` procedure。默认查询逻辑仍只读取分页、排序、过滤和 `joinOperator`，
额外字段会保留在 `middleware.list` 的 `input` 中。

```typescript
import { baseListInputSchema, createCrudRouter } from '@wordrhyme/auto-crud-server';
import { z } from 'zod';

const productsRouter = createCrudRouter({
  table: shopProducts,
  idField: 'spuId',
  schema: createProductSchema,
  updateSchema: updateProductSchema,
  listInputSchema: baseListInputSchema.extend({
    include: z
      .object({
        skus: z.boolean().optional(),
      })
      .optional(),
  }),
  middleware: {
    list: async ({ ctx, input, next }) => {
      const result = await next(input);
      if (!input.include?.skus) return result;
      return attachSkus(ctx, result);
    },
  },
});

// 调用方
await trpc.products.list.query({
  page: 1,
  perPage: 20,
  include: { skus: true },
});
```

`get` 也可以扩展。默认仍兼容 `get("spu_1")`，业务侧如需详情页按需挂载关联数据，可以改成对象输入：

```typescript
import { baseGetInputSchema, createCrudRouter } from '@wordrhyme/auto-crud-server';
import { z } from 'zod';

const productsRouter = createCrudRouter({
  table: shopProducts,
  idField: 'spuId',
  schema: createProductSchema,
  updateSchema: updateProductSchema,
  getInputSchema: baseGetInputSchema.extend({
    include: z.object({ skus: z.boolean().optional() }).optional(),
  }),
  middleware: {
    get: async ({ ctx, input, next }) => {
      const product = await next(input);
      if (!product || typeof input === 'string' || !input.include?.skus) {
        return product;
      }
      return attachProductSkus(ctx, product);
    },
  },
});

await trpc.products.get.query({
  id: 'spu_1',
  include: { skus: true },
});
```

`export` 支持同样的扩展方式，默认导出逻辑只读取 `sort`、`filters`、`joinOperator` 和 `limit`：

```typescript
import { baseExportInputSchema, createCrudRouter } from '@wordrhyme/auto-crud-server';
import { z } from 'zod';

const productsRouter = createCrudRouter({
  table: shopProducts,
  schema: createProductSchema,
  updateSchema: updateProductSchema,
  exportInputSchema: baseExportInputSchema.extend({
    format: z.enum(['csv', 'xlsx']).optional(),
  }),
  middleware: {
    export: async ({ input, next }) => {
      const result = await next(input);
      return input.format === 'xlsx' ? toXlsxExport(result) : result;
    },
  },
});

await trpc.products.export.query({
  limit: 1000,
  format: 'xlsx',
});
```

写入类内置方法（`create`、`update`、`upsert`、`createMany`）不提供通用控制参数扩展；它们的输入字段会进入默认写入逻辑。需要 `dryRun`、`notify` 等控制参数时，建议单独设计 envelope 或自定义业务 procedure。

#### 返回值

```typescript
// 返回增强的 tRPC router，带有 .procedures 属性
{
  // 标准 tRPC router（可直接嵌套到 appRouter）
  ...routerMethods,

  // 可 spread 的 procedures 对象（用于扩展自定义路由）
  procedures: {
    list: Procedure<ListInput, ListOutput>,
    get: Procedure<string | { id: string, ...extra }, TSelect>,
    create: Procedure<TInsert, TSelect>,
    update: Procedure<{ id: string, data: TUpdate }, TSelect>,
    delete: Procedure<string, TSelect>,
    deleteMany: Procedure<string[], { deleted: number }>,
    updateMany: Procedure<{ ids: string[], data: TUpdate }, { updated: number }>,
    upsert: Procedure<TInsert, { data: TSelect, isNew: boolean }>,
  }
}
```

---

## 🔐 权限控制

### 使用 procedure 配置

```typescript
import { createCrudRouter } from '@wordrhyme/auto-crud-server';
import { protectedProcedure, adminProcedure, publicProcedure } from '../trpc';

export const tasksRouter = createCrudRouter({
  table: tasks,
  // 按操作指定不同的 procedure
  procedure: {
    list: publicProcedure, // 公开读
    get: publicProcedure,
    create: protectedProcedure, // 需要登录
    update: protectedProcedure,
    delete: adminProcedure, // 需要管理员
    default: protectedProcedure,
  },
});
```

### 使用 guard（操作级守卫）

```typescript
export const tasksRouter = createCrudRouter({
  table: tasks,
  guard: (ctx, operation) => {
    // 删除操作需要管理员权限
    if (operation === 'delete') {
      return ctx.user.role === 'admin';
    }
    // 其他操作需要登录
    return !!ctx.user;
  },
});
```

### 使用 scope（行级过滤 RLS）

```typescript
import { eq } from 'drizzle-orm';

export const tasksRouter = createCrudRouter({
  table: tasks,
  // 自动注入到所有查询的 WHERE 子句
  scope: (ctx, table, operation) => {
    return eq(table.tenantId, ctx.user.tenantId);
  },
});
```

### 使用 authorize（资源级检查 ABAC）

```typescript
export const tasksRouter = createCrudRouter({
  table: tasks,
  // 在 get/update/delete 时，预取资源后调用
  authorize: (ctx, resource, operation) => {
    return resource.ownerId === ctx.user.id;
  },
});
```

### 使用 inject（强制注入字段）

```typescript
export const tasksRouter = createCrudRouter({
  table: tasks,
  // 写入时强制覆盖字段（防止伪造）
  inject: (ctx, operation) => ({
    tenantId: ctx.user.tenantId,
    ...(operation === 'create' ? { createdBy: ctx.user.id } : { updatedBy: ctx.user.id }),
  }),
});
```

---

## 🎨 自定义扩展

### 添加自定义路由（推荐方式）

使用 `.procedures` 属性 spread 出 CRUD 路由，然后添加自定义路由：

```typescript
import { createCrudRouter, router } from '@wordrhyme/auto-crud-server';
import { protectedProcedure } from '../trpc';
import { z } from 'zod';

// 创建基础 CRUD
const tasksCrud = createCrudRouter({
  table: tasks,
});

// 使用 .procedures spread 并添加自定义路由
export const tasksRouter = router({
  ...tasksCrud.procedures,

  // 自定义路由：归档
  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.db.update(tasks).set({ archived: true }).where(eq(tasks.id, input.id));
    }),

  // 自定义路由：取消归档
  unarchive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.db.update(tasks).set({ archived: false }).where(eq(tasks.id, input.id));
    }),
});
```

### 直接使用（不需要扩展时）

如果不需要添加自定义路由，可以直接使用返回的 router：

```typescript
const tasksCrud = createCrudRouter({
  table: tasks,
});

// 直接嵌套到 appRouter
export const appRouter = router({
  tasks: tasksCrud,
});
```

### 自定义过滤逻辑

```typescript
// 通过 middleware 调整输入，继续复用内置分页/排序/过滤/count/scope/guard
const tasksCrud = createCrudRouter({
  table: tasks,
  middleware: {
    list: async ({ input, next }) => {
      const filters = input.filters?.map((filter) => {
        if (filter.id === 'customField') {
          return { ...filter, operator: 'custom' };
        }
        return filter;
      });

      return next({ ...input, filters });
    },
  },
});
```

---

## 🔄 生命周期中间件

使用 `middleware` 配置在 CRUD 操作前后注入自定义逻辑，类似 tRPC middleware 模式。

### 完整控制模式

```typescript
import { createCrudRouter } from '@wordrhyme/auto-crud-server';

const tasksRouter = createCrudRouter({
  table: tasks,

  // 中间件：完全控制操作流程
  middleware: {
    // 创建：修改输入 + 执行副作用
    create: async ({ ctx, input, next }) => {
      // 1. 修改输入数据
      const data = { ...input, slug: slugify(input.title), createdBy: ctx.user.id };

      // 2. 执行核心操作
      const result = await next(data);

      // 3. 执行副作用
      await sendNotification(result);
      await logAudit(ctx.user, 'create', result);

      // 4. 返回结果（可修改）
      return result;
    },

    // 更新：可访问原记录
    update: async ({ ctx, id, data, existing, next }) => {
      // 检查权限
      if (existing.ownerId !== ctx.user.id) {
        throw new Error('Forbidden');
      }
      return next(data);
    },

    // 删除：条件拦截
    delete: async ({ ctx, id, existing, next }) => {
      if (existing.status === 'locked') {
        throw new Error('Cannot delete locked resource');
      }
      return next();
    },
  },
});
```

### 使用便捷工具函数

对于简单场景，使用工具函数简化代码：

```typescript
import {
  createCrudRouter,
  afterMiddleware,
  beforeMiddleware,
  afterCreate,
  beforeCreate,
} from '@wordrhyme/auto-crud-server';

const tasksRouter = createCrudRouter({
  table: tasks,

  middleware: {
    // 简单副作用：只在操作后执行
    create: afterMiddleware(async (ctx, result) => {
      await sendEmail(result);
      await logAudit(ctx.user, 'create', result);
    }),

    // 修改输入：只在操作前执行
    update: beforeMiddleware(async (ctx, data) => {
      return { ...data, updatedAt: new Date(), updatedBy: ctx.user.id };
    }),

    // 类型安全的便捷函数
    delete: afterDelete(async (ctx, deleted) => {
      await cleanupRelatedData(deleted.id);
    }),
  },
});
```

### 可用的工具函数

| 函数                           | 用途               | 示例                 |
| ------------------------------ | ------------------ | -------------------- |
| `afterMiddleware(fn)`          | 操作后执行副作用   | 日志、通知、审计     |
| `afterMiddlewareTransform(fn)` | 操作后修改返回值   | 添加计算字段         |
| `beforeMiddleware(fn)`         | 操作前修改输入     | 注入用户ID、生成slug |
| `composeMiddleware(...fns)`    | 组合多个中间件     | 复杂场景             |
| `afterList`, `beforeList`      | list 操作专用      | 分页后处理           |
| `afterCreate`, `beforeCreate`  | create 操作专用    | 创建通知             |
| `afterUpdate`, `afterDelete`   | update/delete 专用 | 更新/删除通知        |

---

## 🔌 与其他库集成

### 与 Drizzle ORM 集成

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });

// 在 createContext 中传递 db
export const createContext = () => ({ db });
```

### 与 Next.js 集成

```typescript
// app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => ({ db }),
  });

export { handler as GET, handler as POST };
```

### 与 Express 集成

```typescript
import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './server/routers';

const app = express();

app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext: () => ({ db }),
  }),
);

app.listen(3000);
```

---

## 🛠️ 配置选项

### 自定义 ID 字段

```typescript
export const usersRouter = createCrudRouter({
  table: users,
  idField: 'userId', // 使用自定义 ID 字段
});
```

### 自定义排除字段

```typescript
export const ordersRouter = createCrudRouter({
  table: orders,
  // 自动派生 schema 时额外排除这些字段；默认托管字段无需重复写
  omitFields: ['internalCode'],
});
```

### 软删除

```typescript
export const tasksRouter = createCrudRouter({
  table: tasks,
  // 方式 1：使用默认列名 'deletedAt'
  softDelete: true,

  // 方式 2：指定列名
  softDelete: 'deletedAt',

  // 方式 3：完整配置（用于布尔字段）
  softDelete: { column: 'isDeleted', value: () => true },
});
```

### 批量操作限制

```typescript
export const tasksRouter = createCrudRouter({
  table: tasks,
  maxBatchSize: 50, // 默认 100
});
```

### 列白名单

```typescript
export const tasksRouter = createCrudRouter({
  table: tasks,
  filterableColumns: ['title', 'status', 'priority'], // 只允许这些列过滤
  sortableColumns: ['title', 'createdAt', 'priority'], // 只允许这些列排序
});
```

普通字段不需要特殊配置，前端仍然传字段 id：

```typescript
filters: [{ id: 'title', value: 'bug', operator: 'iLike', variant: 'text', filterId: 'title' }],
sort: [{ id: 'createdAt', desc: true }],
```

jsonb/i18n 字段可以在对应字段配置里声明读取哪个 JSON field。服务端会显式生成
text expression，不会自动把所有 jsonb 字段都 cast 成 text：

```typescript
export const productsRouter = createCrudRouter({
  table: shopProducts,
  idField: 'spuId',
  filterableColumns: [
    { id: 'name', jsonField: ['zh-CN', 'en-US', 'en', 'zh'] },
    'status',
    'categoryId',
  ],
  sortableColumns: [
    { id: 'name', jsonField: ['zh-CN', 'en-US', 'en', 'zh'] },
    'createdAt',
  ],
});
```

上面的 `name` 过滤会生成类似 SQL：

```sql
case jsonb_typeof(name)
  when 'object' then coalesce(name ->> 'zh-CN', name ->> 'en-US', name ->> 'en', name ->> 'zh', '')
  when 'string' then name #>> '{}'
  else ''
end ilike '%关键词%'
```

复杂业务仍可用 `expression` 显式接管查询目标：

```typescript
import { sql } from 'drizzle-orm';

createCrudRouter({
  table: products,
  filterableColumns: [
    { id: 'displayName', expression: ({ table }) => sql<string>`lower(${table.name})` },
  ],
});
```

---

## 📦 导出的类型

```typescript
// 主要导出
export {
  baseExportInputSchema,
  baseGetInputSchema,
  baseListInputSchema,
  createCrudRouter,
} from './routers/_factory';
export type {
  CrudColumnConfig,
  CrudColumnExpression,
  CrudColumnRef,
  CrudRouterConfig,
  CrudMiddleware,
  GetInput,
  ListInput,
  ListResult,
  ExportInput,
  ExportResult,
} from './types/config';

// Middleware 工具函数
export {
  afterMiddleware,
  afterMiddlewareTransform,
  beforeMiddleware,
  composeMiddleware,
  afterList,
  beforeList,
  afterCreate,
  beforeCreate,
  afterUpdate,
  afterDelete,
} from './lib/middleware-helpers';

// tRPC 工具
export { router, publicProcedure } from './trpc';

// 示例路由（可选）
export { appRouter } from './routers';
export type { AppRouter } from './routers';
```

---

## 🐛 故障排除

### 问题 1: 模块找不到

**错误**: `Cannot find module '@wordrhyme/auto-crud-server'`

**解决方案**:

```bash
pnpm install @wordrhyme/auto-crud-server
```

### 问题 2: 类型错误

**错误**: `Type 'X' is not assignable to type 'Y'`

**解决方案**: 确保 Zod 版本一致

```bash
pnpm list zod
# 确保所有包使用相同的 Zod 版本
```

### 问题 3: 数据库连接失败

**错误**: `connect ECONNREFUSED`

**解决方案**: 检查数据库连接字符串

```typescript
// .env
DATABASE_URL = 'postgresql://user:password@localhost:5432/dbname';
```

---

## 🤝 贡献

欢迎贡献代码！请查看 [CONTRIBUTING.md](../../CONTRIBUTING.md)。

---

## 📄 许可证

MIT © [wordrhyme](https://github.com/pixpilot/shadcn-components)

---

## 🔗 相关链接

- [GitHub](https://github.com/pixpilot/shadcn-components)
- [文档](https://github.com/pixpilot/shadcn-components/tree/main/packages/auto-crud-server)
- [@wordrhyme/auto-crud](https://github.com/pixpilot/shadcn-components/tree/main/packages/auto-crud) - 前端组件库
- [Changelog](./CHANGELOG.md)

---

## 💡 灵感来源

- [tRPC](https://trpc.io/) - End-to-end typesafe APIs
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM
- [Prisma](https://www.prisma.io/) - Next-generation ORM
