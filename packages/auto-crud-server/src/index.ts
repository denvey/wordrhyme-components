// Main exports
export { createCrudRouter } from "./routers/_factory";
export type { CrudRouterConfig, AuthorizeCallback } from "./routers/_factory";

// tRPC setup
export { router, publicProcedure } from "./trpc";
export type { AnyProcedure } from "./trpc";

// Re-export example routers (optional)
export { appRouter } from "./routers";
export type { AppRouter } from "./routers";
