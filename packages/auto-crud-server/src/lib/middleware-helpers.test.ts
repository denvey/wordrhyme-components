import { describe, it, expect, vi } from "vitest";
import {
  afterMiddleware,
  beforeMiddleware,
  composeMiddleware,
} from "./middleware-helpers";

describe("middleware-helpers", () => {
  // ============================================================
  // afterMiddleware
  // ============================================================
  describe("afterMiddleware", () => {
    it("should execute callback after next() completes", async () => {
      const callOrder: string[] = [];
      const callback = vi.fn(async () => {
        callOrder.push("callback");
      });

      const middleware = afterMiddleware(callback);
      const next = vi.fn(async () => {
        callOrder.push("next");
        return { id: "1", name: "test" };
      });

      const result = await middleware({ ctx: { user: "admin" }, next });

      expect(callOrder).toEqual(["next", "callback"]);
      expect(result).toEqual({ id: "1", name: "test" });
      expect(callback).toHaveBeenCalledWith({ user: "admin" }, { id: "1", name: "test" });
    });

    it("should pass through the result unchanged", async () => {
      const middleware = afterMiddleware(async () => {
        // Side effect only, no return
      });
      const next = vi.fn(async () => ({ data: "original" }));

      const result = await middleware({ ctx: {}, next });

      expect(result).toEqual({ data: "original" });
    });

    it("should handle async callbacks", async () => {
      let sideEffect = "";
      const middleware = afterMiddleware(async (_ctx, result: { name: string }) => {
        await new Promise((r) => setTimeout(r, 10));
        sideEffect = result.name;
      });

      const next = vi.fn(async () => ({ name: "async-test" }));
      await middleware({ ctx: {}, next });

      expect(sideEffect).toBe("async-test");
    });
  });

  // ============================================================
  // beforeMiddleware
  // ============================================================
  describe("beforeMiddleware", () => {
    it("should modify input before passing to next()", async () => {
      const middleware = beforeMiddleware(async (_ctx, input: { title: string }) => ({
        ...input,
        slug: input.title.toLowerCase().replace(/\s+/g, "-"),
      }));

      const next = vi.fn(async (modifiedInput) => modifiedInput);

      const result = await middleware({
        ctx: {},
        input: { title: "Hello World" },
        next,
      });

      expect(result).toEqual({ title: "Hello World", slug: "hello-world" });
      expect(next).toHaveBeenCalledWith({ title: "Hello World", slug: "hello-world" });
    });

    it("should have access to context", async () => {
      const middleware = beforeMiddleware(async (ctx: { userId: string }, input: { data: string }) => ({
        ...input,
        createdBy: ctx.userId,
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const next = vi.fn(async (modifiedInput: any) => modifiedInput);

      const result = await middleware({
        ctx: { userId: "user-123" },
        input: { data: "test" },
        next,
      } as any);

      expect(result).toEqual({ data: "test", createdBy: "user-123" });
    });

    it("should work with sync transform function", async () => {
      const middleware = beforeMiddleware((_ctx, input: { value: number }) => ({
        ...input,
        doubled: input.value * 2,
      }));

      const next = vi.fn(async (modifiedInput) => modifiedInput);

      const result = await middleware({
        ctx: {},
        input: { value: 5 },
        next,
      });

      expect(result).toEqual({ value: 5, doubled: 10 });
    });
  });

  // ============================================================
  // composeMiddleware
  // ============================================================
  describe("composeMiddleware", () => {
    it("should compose multiple middlewares in order", async () => {
      const callOrder: string[] = [];

      const middleware1 = async (params: { ctx: any; next: () => Promise<any> }) => {
        callOrder.push("m1-before");
        const result = await params.next();
        callOrder.push("m1-after");
        return result;
      };

      const middleware2 = async (params: { ctx: any; next: () => Promise<any> }) => {
        callOrder.push("m2-before");
        const result = await params.next();
        callOrder.push("m2-after");
        return result;
      };

      const composed = composeMiddleware(middleware1, middleware2);

      const next = vi.fn(async () => {
        callOrder.push("core");
        return { result: "done" };
      });

      await composed({ ctx: {}, next });

      expect(callOrder).toEqual([
        "m1-before",
        "m2-before",
        "core",
        "m2-after",
        "m1-after",
      ]);
    });

    it("should compose beforeMiddleware and afterMiddleware", async () => {
      const logs: string[] = [];

      const before = beforeMiddleware(async (_ctx, input: { name: string }) => {
        logs.push("before");
        return { ...input, processed: true };
      });

      const after = afterMiddleware(async (_ctx, _result) => {
        logs.push("after");
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const composed = composeMiddleware(before as any, after as any);

      const next = vi.fn(async (input) => {
        logs.push("core");
        return { ...input, created: true };
      });

      const result = await composed({
        ctx: {},
        input: { name: "test" },
        next,
      });

      expect(logs).toEqual(["before", "core", "after"]);
      // Note: The composed middleware passes modified input through the chain
      // The final result depends on how next() uses the input
      expect(result).toHaveProperty("created", true);
    });

    it("should handle empty middleware array", async () => {
      const composed = composeMiddleware();
      const next = vi.fn(async () => ({ data: "passthrough" }));

      const result = await composed({ ctx: {}, next });

      expect(result).toEqual({ data: "passthrough" });
      expect(next).toHaveBeenCalled();
    });

    it("should handle single middleware", async () => {
      const single = afterMiddleware(async () => {
        /* side effect */
      });
      const composed = composeMiddleware(single);
      const next = vi.fn(async () => ({ single: true }));

      const result = await composed({ ctx: {}, next });

      expect(result).toEqual({ single: true });
    });
  });
});
