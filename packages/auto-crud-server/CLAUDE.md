[根目录](../../../CLAUDE.md) > [shadcn-components](../../CLAUDE.md) > [packages](../) > **auto-crud-server**

# @wordrhyme/auto-crud-server

> tRPC server utilities for auto-crud - automatic CRUD routers for Drizzle ORM

## 模块职责

为 Drizzle ORM 表自动生成 tRPC CRUD 路由，支持分页、排序、高级过滤。

### 核心功能

- **自动 CRUD 路由**: 从 Drizzle 表 Schema 自动生成 list/get/create/update/delete 路由
- **高级过滤**: 支持多条件、多操作符（等于、包含、范围等）过滤
- **排序分页**: 内置分页和多字段排序支持
- **类型安全**: 完整的 TypeScript 类型推断

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

# 类型检查
pnpm typecheck
```

---

## 对外接口

```typescript
// 主要导出
export { createCrudRouter } from './routers/_factory';
export type { CrudRouterConfig } from './routers/_factory';

// tRPC 工具
export { router, publicProcedure } from './trpc';

// 示例路由（可选）
export { appRouter } from './routers';
export type { AppRouter } from './routers';
```

---

## 使用示例

### 基础用法

```typescript
import { createCrudRouter } from '@wordrhyme/auto-crud-server';
import { tasks } from './db/schema'; // Drizzle table
import { insertTaskSchema, updateTaskSchema } from './db/validations';

const tasksRouter = createCrudRouter({
  table: tasks,
  insertSchema: insertTaskSchema,
  updateSchema: updateTaskSchema,
  idField: 'id', // 默认为 "id"
});

// 使用路由
const appRouter = router({
  tasks: tasksRouter,
});
```

### 生成的路由

```typescript
tasksRouter.list({
  page: 1,
  perPage: 10,
  sort: [{ id: 'createdAt', desc: true }],
  filters: [
    {
      id: 'status',
      value: 'done',
      operator: 'eq',
      variant: 'select',
    },
  ],
});

tasksRouter.get({ id: '123' });
tasksRouter.create({ title: 'New task', status: 'todo' });
tasksRouter.update({ id: '123', data: { status: 'done' } });
tasksRouter.delete({ id: '123' });
tasksRouter.deleteMany({ ids: ['1', '2', '3'] });
```

### 高级过滤示例

```typescript
// 范围过滤
filters: [
  {
    id: "createdAt",
    value: ["2024-01-01", "2024-12-31"],
    operator: "between",
    variant: "range",
  }
]

// 多条件过滤（AND/OR）
filters: [
  { id: "status", value: "todo", operator: "eq" },
  { id: "priority", value: "high", operator: "eq" },
],
joinOperator: "and"  // 或 "or"
```

---

## 关键依赖与配置

### Peer Dependencies

```json
{
  "@trpc/server": "^11.0.0",
  "drizzle-orm": "^0.40.0",
  "zod": "^3.0.0 || ^4.0.0"
}
```

### 运行时依赖

**零依赖** ✅ - 所有依赖都是 peer dependencies

---

## API 参考

### `createCrudRouter(config)`

创建 CRUD 路由。

**参数:**

```typescript
interface CrudRouterConfig {
  table: PgTable; // Drizzle 表定义
  selectSchema: z.ZodType; // 查询返回 Schema（可选）
  insertSchema: z.ZodType; // 创建输入 Schema
  updateSchema: z.ZodType; // 更新输入 Schema
  idField?: string; // ID 字段名，默认 "id"
}
```

**返回:**

```typescript
{
  list: Procedure<ListInput, ListOutput>,
  get: Procedure<{ id: string }, Item>,
  create: Procedure<InsertData, Item>,
  update: Procedure<{ id: string, data: UpdateData }, Item>,
  delete: Procedure<{ id: string }, void>,
  deleteMany: Procedure<{ ids: string[] }, void>,
}
```

---

## 目录结构

```
src/
├── routers/
│   ├── _factory.ts         # createCrudRouter 实现
│   ├── index.ts            # 路由汇总
│   └── tasks.ts            # 示例路由
├── config/
│   └── data-table.ts       # 过滤器配置（variant, operator）
├── lib/
│   └── filter-columns.ts   # Drizzle 过滤条件构建器
├── trpc.ts                 # tRPC 初始化
└── index.ts                # 主入口
```

---

## 测试与质量

```bash
pnpm test           # 运行测试
pnpm typecheck      # 类型检查
pnpm lint           # 代码检查
```

---

## 常见问题 (FAQ)

### Q: 如何自定义过滤器？

修改 `config/data-table.ts` 中的 `filterVariants` 和 `operators`。

### Q: 如何添加权限控制？

使用 tRPC 的 middleware：

```typescript
const protectedProcedure = publicProcedure.use(authMiddleware);

// 在 createCrudRouter 中替换 publicProcedure
```

### Q: 支持 MySQL 或 SQLite 吗？

目前只支持 PostgreSQL (`PgTable`)，但可以扩展支持其他数据库。

---

## 相关文件清单

| 类别 | 关键文件                    |
| ---- | --------------------------- |
| 入口 | `src/index.ts`              |
| 核心 | `src/routers/_factory.ts`   |
| 配置 | `src/config/data-table.ts`  |
| 工具 | `src/lib/filter-columns.ts` |

---

## 变更记录 (Changelog)

### 2026-01-26

- 从 tablecn 项目提取并独立为包
- 采用 peer dependencies 策略（零运行时依赖）
- 支持高级过滤、排序、分页

详细变更历史请查看 [CHANGELOG.md](./CHANGELOG.md)
