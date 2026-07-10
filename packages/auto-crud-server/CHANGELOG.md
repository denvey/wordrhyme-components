# @wordrhyme/auto-crud-server

## 1.3.0

### Minor Changes

- update dependencies and add antd scope PostCSS plugin
- add designable editor packages
- treat audit actor fields as platform-managed defaults in CRUD schemas
- iconize table controls
- update version to 1.3.5 and enhance changelog for dependency updates and filter fixes
- add refresh functionality to AutoCrudTable and related hooks
- add bulk delete confirmation dialog and localization support
- refactor toolbar actions and add toolbar resolver for AutoCrudTable
- enhance data table filtering and add multi-combobox component
- 增加可过滤和可排序字段的配置支持，允许使用 jsonb 字段和自定义 SQL 表达式
- add createButton slot and onCreate callback to AutoCrudTable for custom creation behavior
- implement CrudHookEventMap type utility for automated hook event type inference
- support filter/table/form false shorthand and modes config
- add auto-crud packages with optimized API

### Patch Changes

- update package version to 1.1.1 and remove baseUrl from tsconfig
- resolve TypeScript errors, add a11y keyboard support, and fix cache safety

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
