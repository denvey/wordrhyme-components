# @wordrhyme/auto-crud

## 1.0.3

### Patch Changes

- 83ed986: Fix AutoForm default to single column.

## 1.0.0

### Major Changes

- 1# Please enter a summary for your changes.

## 0.4.0

### Minor Changes

- feat: 新增权限控制系统
  - 新增 `permissions` prop 支持 AutoCrudTable 权限控制
  - 新增 `CrudPermissions` 和 `CrudOperationPermissions` 类型导出
  - 支持通过 `can.create/update/delete/export` 控制按钮显示
  - 支持通过 `deny` 字段列表隐藏敏感字段

## 0.3.0

### Minor Changes

- refactor: rename createColumns to createTableSchema for consistent naming

  BREAKING CHANGE:
  - `createColumns` → `createTableSchema`
  - `CreateColumnsOptions` → `CreateTableSchemaOptions`

  This provides consistent naming with `createFormSchema`.

## 0.2.2

### Patch Changes

- docs: add comprehensive documentation for tool functions, schema types, and base components
  - Add tool functions section (createColumns, createFormSchema, parseZodField, etc.)
  - Add custom column rendering examples with cell override
  - Add custom form rendering examples with x-component
  - Document three schema types support (Zod, JSON Schema, Simple Config)
  - Add SchemaAdapter usage documentation
  - Document base components for custom composition (DataTable, AutoTable, AutoForm, etc.)
  - Update exports list with all available APIs

## 0.2.1

### Patch Changes

- docs: update documentation to reflect new Fields API
  - Replace fieldOverrides with fields prop
  - Update Field type documentation
  - Add table.meta configuration examples
  - Document default filter mode as "simple"

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
