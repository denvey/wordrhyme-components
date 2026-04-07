/**
 * Hook 系统类型工具
 *
 * 提供 CrudHookEventMap 类型——从 Zod Schema / Drizzle Table 推导出
 * auto-crud 相关的所有 Hook 事件类型。
 *
 * 下游插件通过 module augmentation 合并到全局 HookEventMap：
 *
 * @example
 * ```typescript
 * import type { CrudHookEventMap } from "@wordrhyme/auto-crud-server";
 * import type { z } from "zod";
 * import type { InferSelectModel } from "drizzle-orm";
 *
 * declare module "@wordrhyme/plugin" {
 *   interface HookEventMap extends CrudHookEventMap<
 *     "crm",
 *     "customers",
 *     z.infer<typeof createCustomerSchema>,
 *     z.infer<typeof updateCustomerSchema>,
 *     InferSelectModel<typeof customerTable>
 *   > {}
 * }
 *
 * // 使用效果：
 * // ctx.hooks.emit('crm.customers.  ← IDE 自动补全所有 hook 名和 payload
 * ```
 */

// ============================================================
// CrudHookEventMap — 核心类型工具
// ============================================================

/**
 * 从 CRUD Schema 类型自动推导 Hook 事件映射
 *
 * 生成两类 hook:
 * 1. 生命周期 hook（beforeCreate / afterCreate 等）— 由 tRPC middleware 自动 emit
 * 2. Procedure hook（create / update / list 等）— 供 emit 自动映射 tRPC 路由使用
 *
 * @typeParam PluginId    - 插件标识（如 'crm', 'shop'）
 * @typeParam ResourceName - 资源名称（如 'customers', 'products'）
 * @typeParam TCreate     - 创建输入类型（z.infer<typeof createSchema>）
 * @typeParam TUpdate     - 更新输入类型（z.infer<typeof updateSchema>）
 * @typeParam TSelect     - 查询返回类型（InferSelectModel<typeof table>）
 */
export type CrudHookEventMap<
  PluginId extends string,
  ResourceName extends string,
  TCreate,
  TUpdate,
  TSelect,
> =
  // === 生命周期 Hooks（tRPC middleware 自动 emit） ===
  // before*: pipe 模式，允许修改数据或 throw 中止
  // after*: 并行模式，纯通知

  // Create
  & { [K in `${PluginId}.${ResourceName}.beforeCreate`]: TCreate }
  & { [K in `${PluginId}.${ResourceName}.afterCreate`]: TSelect }

  // Update
  & { [K in `${PluginId}.${ResourceName}.beforeUpdate`]: { id: string; data: TUpdate } }
  & { [K in `${PluginId}.${ResourceName}.afterUpdate`]: TSelect }

  // Delete
  & { [K in `${PluginId}.${ResourceName}.beforeDelete`]: { id: string } }
  & { [K in `${PluginId}.${ResourceName}.afterDelete`]: TSelect }

  // === tRPC Procedure Hooks（emit 自动映射 tRPC 路由） ===

  & { [K in `${PluginId}.${ResourceName}.create`]: TCreate }
  & { [K in `${PluginId}.${ResourceName}.update`]: { id: string; data: TUpdate } }
  & { [K in `${PluginId}.${ResourceName}.delete`]: string }
  & { [K in `${PluginId}.${ResourceName}.deleteMany`]: string[] }
  & { [K in `${PluginId}.${ResourceName}.updateMany`]: { ids: string[]; data: TUpdate } }
  & { [K in `${PluginId}.${ResourceName}.upsert`]: TCreate }
  & { [K in `${PluginId}.${ResourceName}.get`]: string }
  & { [K in `${PluginId}.${ResourceName}.list`]: {
    page: number;
    perPage: number;
    sort?: Array<{ id: string; desc: boolean }>;
    filters?: Array<{
      id: string;
      value: string | string[];
      variant: string;
      operator: string;
      filterId: string;
    }>;
    joinOperator: "and" | "or";
  } }
  & { [K in `${PluginId}.${ResourceName}.export`]: {
    sort?: Array<{ id: string; desc: boolean }>;
    filters?: Array<{
      id: string;
      value: string | string[];
      variant: string;
      operator: string;
      filterId: string;
    }>;
    joinOperator?: "and" | "or";
    limit?: number;
  } }
  & { [K in `${PluginId}.${ResourceName}.import`]: {
    rows: unknown[];
    onConflict?: "skip" | "upsert" | "error";
  } }
  & { [K in `${PluginId}.${ResourceName}.createMany`]: TCreate[] };
