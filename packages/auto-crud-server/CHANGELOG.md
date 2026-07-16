# @wordrhyme/auto-crud-server

## 1.3.0

### Minor Changes

- 72da093: Allow hosts to resolve date filters into UTC half-open ranges through an optional request-context adapter while preserving the existing server-local behavior when no adapter is provided.

  Treat non-empty host ranges as authoritative and reject invalid, reversed, or incomplete boundaries instead of silently widening a query or falling back to server-local parsing.

  Allow hosts to provide AutoCrud's process-wide date formatter so shared tables follow the host's locale and timezone policy without making AutoCrud select a timezone. Formatter registrations can be disposed safely even when cleanup occurs out of order.

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
