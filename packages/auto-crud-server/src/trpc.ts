import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

/**
 * tRPC Context 类型
 * 消费者需要提供包含 db 的 context
 */
export interface Context {
  db: PostgresJsDatabase<Record<string, never>>;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// 导出 procedure 类型供外部使用
export type AnyProcedure = typeof t.procedure;
