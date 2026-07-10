# @wordrhyme/auto-crud-server

## 1.2.0

### Minor Changes

- Add query capability metadata for auto-crud search, filters, and sorting, and merge provider capabilities with base router capabilities.

### Patch Changes

- 3503ad2: Derive CRUD lifecycle hook ids from plugin context when extension target ids include the plugin id prefix.
- 996881c: Treat audit actor fields as platform-managed defaults in generated CRUD schemas and UI.
  Default list views to `createdAt` descending when that column is available.

## 0.2.0

### Minor Changes

- Initial public release of auto-crud packages:

  **@wordrhyme/auto-crud** - Schema-first CRUD components
  - AutoCrudTable: Complete CRUD interface with table and form modals
  - AutoTable: Data table with simple/advanced/command filter modes
  - AutoForm: Schema-driven form generation
  - Default filter mode changed to "simple"

  **@wordrhyme/auto-crud-server** - tRPC server utilities
  - createCrudRouter: Auto-generate CRUD routers for Drizzle ORM
  - Advanced filtering, sorting, and pagination support
