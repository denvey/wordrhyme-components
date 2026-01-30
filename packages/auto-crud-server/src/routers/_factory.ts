import { z } from "zod";
import { eq, sql, inArray, asc, desc } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { router, publicProcedure, type AnyProcedure } from "../trpc";
import { filterColumns } from "@/lib/filter-columns";
import { dataTableConfig } from "@/config/data-table";

/**
 * 授权回调类型
 * 返回 true 允许操作，返回 false 或抛出错误拒绝操作
 */
export type AuthorizeCallback = (ctx: {
  operation: "list" | "get" | "create" | "update" | "delete" | "deleteMany" | "updateMany";
  input?: unknown;
}) => boolean | Promise<boolean>;

/**
 * CRUD Router 配置
 */
export interface CrudRouterConfig {
  table: PgTable;
  selectSchema: z.ZodType;
  insertSchema: z.ZodType;
  updateSchema: z.ZodType;
  idField?: string;
  /**
   * 可过滤的列白名单
   * 未指定时默认允许所有列（不安全，仅用于开发）
   */
  filterableColumns?: string[];
  /**
   * 可排序的列白名单
   * 未指定时默认允许所有列（不安全，仅用于开发）
   */
  sortableColumns?: string[];
  /**
   * 批量操作的最大数量限制
   * 默认: 100
   */
  maxBatchSize?: number;
  /**
   * 自定义 procedure（用于注入授权中间件）
   * 默认使用 publicProcedure
   */
  procedure?: AnyProcedure;
  /**
   * 授权回调（简单场景下的快捷授权方式）
   * 如果需要更复杂的授权逻辑，建议使用 procedure 注入中间件
   */
  authorize?: AuthorizeCallback;
}

/**
 * 过滤器项 Schema
 */
const filterItemSchema = z.object({
  id: z.string(),
  value: z.union([z.string(), z.array(z.string())]),
  variant: z.enum(dataTableConfig.filterVariants),
  operator: z.enum(dataTableConfig.operators),
  filterId: z.string(),
});

/**
 * 列表查询输入 Schema
 */
const listInputSchema = z.object({
  page: z.number().min(1).default(1),
  perPage: z.number().min(1).max(100).default(10),
  sort: z
    .array(
      z.object({
        id: z.string(),
        desc: z.boolean(),
      })
    )
    .optional(),
  // 高级过滤器
  filters: z.array(filterItemSchema).optional(),
  joinOperator: z.enum(["and", "or"]).default("and"),
});

/**
 * 验证列是否在白名单中
 */
function validateColumn(columnId: string, allowedColumns: string[] | undefined, columnType: "filter" | "sort"): boolean {
  // 未配置白名单时允许所有列（开发模式，生产环境应配置白名单）
  if (!allowedColumns || allowedColumns.length === 0) {
    return true;
  }
  return allowedColumns.includes(columnId);
}

/**
 * 创建通用 CRUD Router
 */
export function createCrudRouter(config: CrudRouterConfig) {
  const {
    table,
    insertSchema,
    updateSchema,
    idField = "id",
    filterableColumns,
    sortableColumns,
    maxBatchSize = 100,
    procedure: baseProcedure = publicProcedure,
    authorize,
  } = config;

  // 获取 id 列
  const getIdColumn = () => (table as unknown as Record<string, unknown>)[idField];

  // 包装授权检查
  const withAuthorize = async (operation: Parameters<AuthorizeCallback>[0]["operation"], input?: unknown) => {
    if (authorize) {
      const allowed = await authorize({ operation, input });
      if (!allowed) {
        throw new Error(`Unauthorized: ${operation} operation not allowed`);
      }
    }
  };

  return router({
    // 列表查询（分页、排序、过滤）
    list: baseProcedure.input(listInputSchema).query(async ({ ctx, input }) => {
      await withAuthorize("list", input);

      const offset = (input.page - 1) * input.perPage;

      // 验证并过滤不在白名单中的过滤器
      const validatedFilters = input.filters?.filter((filter) =>
        validateColumn(filter.id, filterableColumns, "filter")
      );

      // 构建过滤条件
      const where = validatedFilters?.length
        ? filterColumns({
            table,
            filters: validatedFilters as any,
            joinOperator: input.joinOperator,
          })
        : undefined;

      // 基础查询
      let query = ctx.db.select().from(table).$dynamic();

      // 应用过滤条件
      if (where) {
        query = query.where(where);
      }

      // 排序（验证白名单）
      if (input.sort?.length) {
        const sortField = input.sort[0];
        if (sortField && validateColumn(sortField.id, sortableColumns, "sort")) {
          const column = (table as unknown as Record<string, unknown>)[sortField.id];
          if (column) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            query = query.orderBy(sortField.desc ? desc(column as any) : asc(column as any));
          }
        }
      }

      const data = await query.limit(input.perPage).offset(offset);

      // count 查询也需要应用过滤条件
      let countQuery = ctx.db.select({ count: sql<number>`count(*)::int` }).from(table).$dynamic();
      if (where) {
        countQuery = countQuery.where(where);
      }
      const countResult = await countQuery;
      const count = countResult[0]?.count ?? 0;

      return {
        data,
        total: count,
        page: input.page,
        perPage: input.perPage,
        pageCount: Math.ceil(count / input.perPage),
      };
    }),

    // 单条查询
    getById: baseProcedure.input(z.string()).query(async ({ ctx, input }) => {
      await withAuthorize("get", input);

      const column = getIdColumn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [item] = await ctx.db.select().from(table).where(eq(column as any, input));
      return item ?? null;
    }),

    // 创建
    create: baseProcedure
      .input(insertSchema)
      .mutation(async ({ ctx, input }) => {
        await withAuthorize("create", input);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [created] = await ctx.db.insert(table).values(input as any).returning();
        return created;
      }),

    // 更新
    update: baseProcedure
      .input(z.object({ id: z.string(), data: updateSchema }))
      .mutation(async ({ ctx, input }) => {
        await withAuthorize("update", input);

        const column = getIdColumn();
        const [updated] = await ctx.db
          .update(table)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .set(input.data as any)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .where(eq(column as any, input.id))
          .returning();
        return updated;
      }),

    // 删除
    delete: baseProcedure
      .input(z.string())
      .mutation(async ({ ctx, input }) => {
        await withAuthorize("delete", input);

        const column = getIdColumn();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [deleted] = await ctx.db.delete(table).where(eq(column as any, input)).returning();
        return deleted;
      }),

    // 批量删除
    deleteMany: baseProcedure
      .input(z.array(z.string()).max(maxBatchSize, `Maximum ${maxBatchSize} items allowed`))
      .mutation(async ({ ctx, input }) => {
        await withAuthorize("deleteMany", input);

        const column = getIdColumn();
        const deleted = await ctx.db
          .delete(table)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .where(inArray(column as any, input))
          .returning();
        return { deleted: deleted.length };
      }),

    // 批量更新
    updateMany: baseProcedure
      .input(z.object({
        ids: z.array(z.string()).max(maxBatchSize, `Maximum ${maxBatchSize} items allowed`),
        data: updateSchema,
      }))
      .mutation(async ({ ctx, input }) => {
        await withAuthorize("updateMany", input);

        const column = getIdColumn();
        const updated = await ctx.db
          .update(table)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .set(input.data as any)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .where(inArray(column as any, input.ids))
          .returning();
        return { updated: updated.length };
      }),
  });
}
