# @wordrhyme/auto-crud

## 1.4.2

### Patch Changes

- Keep searchable multi-select option lists scrollable in dialog forms by emitting the
  AutoCrud viewport height and overflow constraints.
- Updated dependencies [18e82db]
  - @wordrhyme/shadcn-ui@1.32.6
  - @wordrhyme/formily-shadcn@1.13.1

## 1.4.1

### Patch Changes

- Updated dependencies [a88920b]
  - @wordrhyme/shadcn-ui@1.32.5
  - @wordrhyme/formily-shadcn@1.13.0

## 1.4.0

### Minor Changes

- Add query capability metadata for auto-crud search, filters, and sorting, and merge provider capabilities with base router capabilities.

### Patch Changes

- 996881c: Treat audit actor fields as platform-managed defaults in generated CRUD schemas and UI.
  Default list views to `createdAt` descending when that column is available.

## 1.3.5

### Patch Changes

- Release against @wordrhyme/shadcn-ui@1.32.4 so searchable single-select filters no longer show a multi-select checkbox indicator.
- Updated dependencies
  - @wordrhyme/shadcn-ui@1.32.4

## 1.3.4

### Patch Changes

- Fix published AutoCrud simple filters by releasing against @wordrhyme/shadcn-ui@1.32.3, which includes the searchable Select API used by filter triggers.
- Updated dependencies
  - @wordrhyme/shadcn-ui@1.32.3

## 1.3.3

### Patch Changes

- Render the default AutoCrudTable refresh action as an icon-only button while preserving its accessible label.

## 1.3.2

### Patch Changes

- Add a default AutoCrudTable refresh toolbar action that refetches the current list query, with optional resource handler compatibility for manually constructed resources.

## 1.3.1

### Patch Changes

- Fix auto-crud remote filter search pagination and publish matching Wordrhyme UI dependencies.
- Updated dependencies
  - @wordrhyme/formily-shadcn@1.12.9
  - @wordrhyme/shadcn-ui@1.32.2
  - @wordrhyme/shadcn@1.3.2

## 1.2.0

### Minor Changes

- Add a reusable searchable MultiCombobox inside AutoCrud and reuse it in table filters and generated forms. The option list stays scrollable inside dialogs by constraining the command group and handling wheel events inside the scroll container.

  Expose AutoCrud form component and data source registries from the package entry so plugins can register custom Formily components and dynamic option loaders.

### Patch Changes

- Move entity extension support into the AutoCrud packages: AutoCrud now discovers extension fields, merges schema/field config, renders extension columns/filters/search, hydrates list rows from projections, and submits extension form values through `ext`. AutoCrud Server now accepts an optional globally unique CRUD `id`, `search`, extension write payloads, and projection-backed extension filter/search matching. Also fixes AutoCrud form Combobox search by label/searchText/keywords while preserving submitted option values.
- 0653981: Fix readable filter URL synchronization when clearing the final active filter.

## 1.0.4

### Patch Changes

- Fix workspace dependency resolution to force @pixpilot/shadcn back to exactly 1.2.0 properly.

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
