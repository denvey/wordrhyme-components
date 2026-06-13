// ============================================================
// Main exports
// ============================================================

// Factory
export {
  baseExportInputSchema,
  baseGetInputSchema,
  baseListInputSchema,
  createCrudRouter,
} from './routers/_factory';

// Types
export type {
  // Config types (v2.0 统一 API)
  CrudRouterConfig,
  ProcedureConfig,
  ProcedureMap,
  ProcedureFactory,
  CrudColumnConfig,
  CrudColumnExpression,
  CrudColumnRef,
  CrudExtensionFilter,
  CrudExtensionMetadata,
  CrudExtensionsConfig,
  CrudExtensionsProvider,
  CrudProcedures,
  // Operation types
  CrudOperation,
  WriteOperation,
  AnyProcedure,
  // Soft delete types
  SoftDeleteConfig,
  SoftDeleteOption,
  // Middleware types
  CrudMiddleware,
  ListMiddlewareParams,
  GetMiddlewareParams,
  CreateMiddlewareParams,
  UpdateMiddlewareParams,
  DeleteMiddlewareParams,
  DeleteManyMiddlewareParams,
  UpdateManyMiddlewareParams,
  UpsertMiddlewareParams,
  ExportMiddlewareParams,
  ImportMiddlewareParams,
  CreateManyMiddlewareParams,
  // Input/Output types
  GetInput,
  ListInput,
  ListResult,
  ExportInput,
  ExportResult,
  ImportInput,
  ImportResult,
  ImportFailedRow,
} from './types/config';

// Middleware helpers
export {
  afterMiddleware,
  beforeMiddleware,
  composeMiddleware,
} from './lib/middleware-helpers';

// tRPC setup
export { router, publicProcedure } from './trpc';

// Hook types
export type { CrudHookEventMap } from './types/hook-types';

// Re-export example routers (optional)
export { appRouter } from './routers';
export type { AppRouter } from './routers';
