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
import { pgTable, varchar, real, boolean, timestamp } from "drizzle-orm/pg-core";

export const tasks = pgTable("tasks", {
  id: varchar("id", { length: 30 }).primaryKey(),
  title: varchar("title", { length: 128 }).notNull(),
  status: varchar("status", {
    enum: ["todo", "in-progress", "done", "canceled"],
  }).notNull().default("todo"),
  priority: varchar("priority", {
    enum: ["low", "medium", "high"],
  }).notNull().default("low"),
  estimatedHours: real("estimated_hours").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### 步骤 2: 创建 CRUD 路由

```typescript
// src/server/routers/tasks.ts
import { createCrudRouter } from "@wordrhyme/auto-crud-server";
import { tasks } from "@/db/schema";
import { createSelectSchema } from "drizzle-zod";

// 从 Drizzle Schema 自动生成 Zod Schema
const selectTaskSchema = createSelectSchema(tasks);

// 创建输入 Schema
const insertTaskSchema = selectTaskSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const updateTaskSchema = insertTaskSchema.partial();

// 🚀 一行代码生成完整 CRUD 路由
export const tasksRouter = createCrudRouter({
  table: tasks,
  selectSchema: selectTaskSchema,
  insertSchema: insertTaskSchema,
  updateSchema: updateTaskSchema,
  idField: "id",  // 可选，默认为 "id"
});
```

### 步骤 3: 汇总路由

```typescript
// src/server/routers/index.ts
import { router } from "../trpc";
import { tasksRouter } from "./tasks";

export const appRouter = router({
  tasks: tasksRouter,
});

export type AppRouter = typeof appRouter;
```

### 步骤 4: 创建 API 路由处理器

```typescript
// src/app/api/trpc/[trpc]/route.ts (Next.js App Router)
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/routers";
import { db } from "@/db";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => ({ db }),
  });

export { handler as GET, handler as POST };
```

---

## 📖 自动生成的路由

`createCrudRouter` 会自动生成以下 6 个路由：

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
  sort: [{ id: "createdAt", desc: true }],
  filters: [
    { id: "status", value: "done", operator: "eq", variant: "select" },
    { id: "priority", value: "high", operator: "eq", variant: "select" },
  ],
  joinOperator: "and",
});
```

### 2. `get` - 单条查询

**输入**:
```typescript
{ id: string }
```

**输出**:
```typescript
Task
```

**示例**:
```typescript
const task = await trpc.tasks.get({ id: "123" });
```

### 3. `create` - 创建

**输入**:
```typescript
Omit<Task, "id" | "createdAt" | "updatedAt">
```

**输出**:
```typescript
Task
```

**示例**:
```typescript
const newTask = await trpc.tasks.create({
  title: "New Task",
  status: "todo",
  priority: "high",
});
```

### 4. `update` - 更新

**输入**:
```typescript
{
  id: string;
  data: Partial<Omit<Task, "id" | "createdAt" | "updatedAt">>;
}
```

**输出**:
```typescript
Task
```

**示例**:
```typescript
const updatedTask = await trpc.tasks.update({
  id: "123",
  data: { status: "done" },
});
```

### 5. `delete` - 删除

**输入**:
```typescript
{ id: string }
```

**输出**:
```typescript
void
```

**示例**:
```typescript
await trpc.tasks.delete({ id: "123" });
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
await trpc.tasks.deleteMany({ ids: ["1", "2", "3"] });
```

---

## 🎯 高级过滤

### 支持的操作符

| 操作符 | 说明 | 示例 |
|--------|------|------|
| `eq` | 等于 | `status = "done"` |
| `ne` | 不等于 | `status != "canceled"` |
| `gt` | 大于 | `estimatedHours > 5` |
| `gte` | 大于等于 | `estimatedHours >= 5` |
| `lt` | 小于 | `estimatedHours < 10` |
| `lte` | 小于等于 | `estimatedHours <= 10` |
| `like` | 包含 | `title LIKE "%bug%"` |
| `notLike` | 不包含 | `title NOT LIKE "%test%"` |
| `in` | 在列表中 | `status IN ["todo", "in-progress"]` |
| `notIn` | 不在列表中 | `status NOT IN ["canceled"]` |
| `between` | 范围 | `createdAt BETWEEN "2024-01-01" AND "2024-12-31"` |
| `isNull` | 为空 | `description IS NULL` |
| `isNotNull` | 不为空 | `description IS NOT NULL` |

### 过滤示例

#### 单条件过滤

```typescript
await trpc.tasks.list({
  page: 1,
  perPage: 10,
  filters: [
    { id: "status", value: "done", operator: "eq", variant: "select" },
  ],
});
```

#### 多条件 AND 过滤

```typescript
await trpc.tasks.list({
  page: 1,
  perPage: 10,
  filters: [
    { id: "status", value: "done", operator: "eq", variant: "select" },
    { id: "priority", value: "high", operator: "eq", variant: "select" },
  ],
  joinOperator: "and",  // status = "done" AND priority = "high"
});
```

#### 多条件 OR 过滤

```typescript
await trpc.tasks.list({
  page: 1,
  perPage: 10,
  filters: [
    { id: "status", value: "todo", operator: "eq", variant: "select" },
    { id: "status", value: "in-progress", operator: "eq", variant: "select" },
  ],
  joinOperator: "or",  // status = "todo" OR status = "in-progress"
});
```

#### 范围过滤

```typescript
await trpc.tasks.list({
  page: 1,
  perPage: 10,
  filters: [
    {
      id: "createdAt",
      value: ["2024-01-01", "2024-12-31"],
      operator: "between",
      variant: "dateRange",
    },
  ],
});
```

#### 模糊搜索

```typescript
await trpc.tasks.list({
  page: 1,
  perPage: 10,
  filters: [
    { id: "title", value: "bug", operator: "like", variant: "text" },
  ],
});
```

---

## 🔧 API 参考

### `createCrudRouter(config)`

创建 CRUD 路由。

#### 参数

```typescript
interface CrudRouterConfig<TTable, TSelect, TInsert, TUpdate> {
  table: TTable;                    // Drizzle 表定义
  selectSchema: z.ZodType<TSelect>; // 查询返回 Schema
  insertSchema: z.ZodType<TInsert>; // 创建输入 Schema
  updateSchema: z.ZodType<TUpdate>; // 更新输入 Schema
  idField?: string;                 // ID 字段名，默认 "id"
}
```

#### 返回值

```typescript
{
  list: Procedure<ListInput, ListOutput>,
  get: Procedure<{ id: string }, TSelect>,
  create: Procedure<TInsert, TSelect>,
  update: Procedure<{ id: string, data: TUpdate }, TSelect>,
  delete: Procedure<{ id: string }, void>,
  deleteMany: Procedure<{ ids: string[] }, void>,
}
```

#### 完整示例

```typescript
import { createCrudRouter } from "@wordrhyme/auto-crud-server";
import { users } from "@/db/schema";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

const selectUserSchema = createSelectSchema(users);

const insertUserSchema = selectUserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const updateUserSchema = insertUserSchema.partial();

export const usersRouter = createCrudRouter({
  table: users,
  selectSchema: selectUserSchema,
  insertSchema: insertUserSchema,
  updateSchema: updateUserSchema,
  idField: "id",
});
```

---

## 🔐 权限控制

### 使用 tRPC Middleware

```typescript
import { initTRPC, TRPCError } from "@trpc/server";

const t = initTRPC.context<Context>().create();

// 创建受保护的 procedure
const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// 在 createCrudRouter 中使用
export const tasksRouter = createCrudRouter({
  table: tasks,
  selectSchema: selectTaskSchema,
  insertSchema: insertTaskSchema,
  updateSchema: updateTaskSchema,
  // 注意：当前版本不支持直接传入 procedure
  // 需要在路由层面添加权限控制
});

// 包装路由添加权限
export const protectedTasksRouter = {
  list: protectedProcedure.query(async ({ input, ctx }) => {
    return tasksRouter.list(input, ctx);
  }),
  // ... 其他路由
};
```

### 行级权限控制

```typescript
// 在 createContext 中添加用户信息
export const createContext = async ({ req }: { req: Request }) => {
  const user = await getUserFromRequest(req);
  return { db, user };
};

// 在查询中添加过滤条件
const result = await db
  .select()
  .from(tasks)
  .where(eq(tasks.userId, ctx.user.id));  // 只查询当前用户的任务
```

---

## 🎨 自定义扩展

### 添加自定义路由

```typescript
import { createCrudRouter } from "@wordrhyme/auto-crud-server";
import { publicProcedure } from "../trpc";

const baseCrudRouter = createCrudRouter({
  table: tasks,
  selectSchema: selectTaskSchema,
  insertSchema: insertTaskSchema,
  updateSchema: updateTaskSchema,
});

export const tasksRouter = {
  ...baseCrudRouter,

  // 添加自定义路由
  archive: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.db
        .update(tasks)
        .set({ archived: true })
        .where(eq(tasks.id, input.id));
    }),

  unarchive: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.db
        .update(tasks)
        .set({ archived: false })
        .where(eq(tasks.id, input.id));
    }),
};
```

### 自定义过滤逻辑

```typescript
// 在 createCrudRouter 之前预处理过滤条件
const customList = publicProcedure
  .input(listInputSchema)
  .query(async ({ input, ctx }) => {
    // 自定义过滤逻辑
    const customFilters = input.filters?.map(filter => {
      if (filter.id === "customField") {
        // 自定义处理
        return { ...filter, operator: "custom" };
      }
      return filter;
    });

    return baseCrudRouter.list({
      ...input,
      filters: customFilters,
    }, ctx);
  });
```

---

## 🔌 与其他库集成

### 与 Drizzle ORM 集成

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });

// 在 createContext 中传递 db
export const createContext = () => ({ db });
```

### 与 Next.js 集成

```typescript
// app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/routers";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => ({ db }),
  });

export { handler as GET, handler as POST };
```

### 与 Express 集成

```typescript
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./server/routers";

const app = express();

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: () => ({ db }),
  })
);

app.listen(3000);
```

---

## 🛠️ 配置选项

### 自定义 ID 字段

```typescript
export const usersRouter = createCrudRouter({
  table: users,
  selectSchema: selectUserSchema,
  insertSchema: insertUserSchema,
  updateSchema: updateUserSchema,
  idField: "userId",  // 使用自定义 ID 字段
});
```

### 自定义过滤器配置

```typescript
// src/config/data-table.ts
export const filterVariants = {
  text: ["eq", "ne", "like", "notLike"],
  number: ["eq", "ne", "gt", "gte", "lt", "lte", "between"],
  select: ["eq", "ne", "in", "notIn"],
  date: ["eq", "ne", "gt", "gte", "lt", "lte", "between"],
  boolean: ["eq"],
};
```

---

## 📦 导出的类型

```typescript
// 主要导出
export { createCrudRouter } from "./routers/_factory";
export type { CrudRouterConfig } from "./routers/_factory";

// tRPC 工具
export { router, publicProcedure } from "./trpc";

// 示例路由（可选）
export { appRouter } from "./routers";
export type { AppRouter } from "./routers";
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
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
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
