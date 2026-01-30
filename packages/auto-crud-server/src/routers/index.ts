import { router } from "../trpc";

// 示例 appRouter - 消费者应该自己创建
export const appRouter = router({});

export type AppRouter = typeof appRouter;
