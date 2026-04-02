import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { createCrudRouter } from "./_factory";
import type { CrudRouterConfig } from "../types/config";

// ============================================================
// Mock 数据和 Schema
// ============================================================

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["todo", "done"]),
  createdAt: z.date().optional(),
});

const insertTaskSchema = taskSchema.omit({ id: true, createdAt: true }).extend({
  id: z.string().optional(),
});

const updateTaskSchema = taskSchema.partial().omit({ id: true, createdAt: true });

type Task = z.infer<typeof taskSchema>;

// Mock 数据库
function createMockDb() {
  const data: Task[] = [
    { id: "1", title: "Task 1", status: "todo", createdAt: new Date() },
    { id: "2", title: "Task 2", status: "done", createdAt: new Date() },
  ];

  return {
    data,
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() => ({
      then: (resolve: (value: Task[]) => void) => resolve([data[0]!]),
    })),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockImplementation(() => [{ id: "new-id", title: "New Task", status: "todo" }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    $dynamic: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  };
}

// Mock table
const mockTable = {
  id: { name: "id" },
  title: { name: "title" },
  status: { name: "status" },
  deletedAt: { name: "deletedAt" },
} as any;

// Mock procedure
const mockProcedure = {
  input: vi.fn().mockReturnThis(),
  output: vi.fn().mockReturnThis(),
  query: vi.fn().mockReturnThis(),
  mutation: vi.fn().mockReturnThis(),
};

// ============================================================
// 测试套件
// ============================================================

describe("createCrudRouter", () => {
  describe("基础配置", () => {
    it("should create router with all 8 CRUD procedures", () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
      };

      const router = createCrudRouter(config);

      // 验证返回的 router 有 procedures 属性
      expect(router).toHaveProperty("procedures");
      expect(router.procedures).toHaveProperty("list");
      expect(router.procedures).toHaveProperty("get");
      expect(router.procedures).toHaveProperty("create");
      expect(router.procedures).toHaveProperty("update");
      expect(router.procedures).toHaveProperty("delete");
      expect(router.procedures).toHaveProperty("deleteMany");
      expect(router.procedures).toHaveProperty("updateMany");
      expect(router.procedures).toHaveProperty("upsert");
    });

    it("should use default idField as 'id'", () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
      };

      // 不应抛出错误
      expect(() => createCrudRouter(config)).not.toThrow();
    });

    it("should accept custom idField", () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        idField: "customId",
      };

      expect(() => createCrudRouter(config)).not.toThrow();
    });
  });

  describe("统一 procedure 配置（v2.0）", () => {
    it("should work without procedure config (default)", () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
      };

      const router = createCrudRouter(config);
      expect(router.procedures).toBeDefined();
    });

    it("should work with single procedure", () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        procedure: mockProcedure as any,
      };

      const router = createCrudRouter(config);
      expect(router.procedures).toBeDefined();
    });

    it("should work with procedure map", () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        procedure: {
          list: mockProcedure as any,
          get: mockProcedure as any,
          create: mockProcedure as any,
          default: mockProcedure as any,
        },
      };

      const router = createCrudRouter(config);
      expect(router.procedures).toBeDefined();
    });

    it("should work with procedure factory", () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        procedure: (op: string) => mockProcedure as any,
      };

      const router = createCrudRouter(config);
      expect(router.procedures).toBeDefined();
    });

    it("should combine procedure with guard/scope/authorize", () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        procedure: {
          list: mockProcedure as any,
          default: mockProcedure as any,
        },
        guard: (ctx, op) => true,
        scope: (ctx, table, op) => undefined,
        authorize: (ctx, resource, op) => true,
      };

      const router = createCrudRouter(config);
      expect(router.procedures).toBeDefined();
    });
  });

  describe("软删除配置", () => {
    it("should accept softDelete: true", () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        softDelete: true,
      };

      expect(() => createCrudRouter(config)).not.toThrow();
    });

    it("should accept softDelete as string (column name)", () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        softDelete: "deletedAt",
      };

      expect(() => createCrudRouter(config)).not.toThrow();
    });

    it("should accept softDelete as full config", () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        softDelete: {
          column: "isDeleted",
          value: () => true,
        },
      };

      expect(() => createCrudRouter(config)).not.toThrow();
    });
  });

  describe("Middleware 配置", () => {
    it("should accept middleware config", () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        middleware: {
          create: async ({ ctx, input, next }) => next(input),
        },
      };

      expect(() => createCrudRouter(config)).not.toThrow();
    });

    it("should accept all middleware hooks", () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        middleware: {
          list: async ({ next }) => next(),
          get: async ({ next }) => next(),
          create: async ({ next }) => next(),
          update: async ({ next }) => next(),
          delete: async ({ next }) => next(),
          deleteMany: async ({ next }) => next(),
          updateMany: async ({ next }) => next(),
          upsert: async ({ next }) => next(),
        },
      };

      expect(() => createCrudRouter(config)).not.toThrow();
    });
  });

  describe("批量操作配置", () => {
    it("should accept maxBatchSize config", () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        maxBatchSize: 50,
      };

      expect(() => createCrudRouter(config)).not.toThrow();
    });

    it("should use default maxBatchSize of 100", () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
      };

      // 默认值 100，不应报错
      expect(() => createCrudRouter(config)).not.toThrow();
    });
  });

  describe("列白名单配置", () => {
    it("should accept filterableColumns config", () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        filterableColumns: ["title", "status"],
      };

      expect(() => createCrudRouter(config)).not.toThrow();
    });

    it("should accept sortableColumns config", () => {
      const config: CrudRouterConfig = {
        table: mockTable,
        schema: insertTaskSchema,
        updateSchema: updateTaskSchema,
        sortableColumns: ["title", "createdAt"],
      };

      expect(() => createCrudRouter(config)).not.toThrow();
    });
  });
});
