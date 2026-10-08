# @wordrhyme/auto-crud

## 1.8.1

### Patch Changes

- f564a13: Correct repository links in published package metadata and READMEs.
- Updated dependencies [f564a13]
  - @wordrhyme/shadcn@2.0.1
  - @wordrhyme/shadcn-ui@2.1.1
  - @wordrhyme/formily-shadcn@2.1.1

## 1.8.0

### Minor Changes

- b8045ed: Reuse DatePicker with Day.js valueFormat strings for parsing and serializing dates (empty string when cleared), retaining the default Date output when valueFormat is omitted and a deprecated DateOnlyPicker compatibility alias.
- 1081129: Add opt-in page jump and always-visible first/last buttons, configurable per table or registered public CRUD id. Optional responsive mode measures available container space and hides extra controls when they do not fit. Existing pagination defaults remain unchanged.

### Patch Changes

- 91102c1: Add field-level `format(value, { row, target })` for default table/detail text and CSV values. Returning `undefined` preserves existing formatting. Keep existing export columns, headers and permission exclusions, and add a UTF-8 BOM for CSV downloads.
- 82eb4a2: Preserve reference IDs and display labels in CRUD row projection metadata for list and edit presentation.
- Updated dependencies [b8045ed]
- Updated dependencies [d2b58fc]
  - @wordrhyme/shadcn-ui@2.1.0
  - @wordrhyme/formily-shadcn@2.1.0

## 1.7.1

### Patch Changes

- 5b729e2: Add an optional calendar date upper bound to simple and advanced date filters.

  Use the Host's configured time zone for both the today upper bound and the calendar's today marker so default focus and selectable dates stay consistent.

  Keep relative bounds and today markers current across Host midnight, time zone changes, and page resumes.

- 01d9112: Constrain import dialog height and use a balanced desktop width while retaining scrollable previews.
- 6948496: Use Host UI alert dialogs for deletion so row menus and confirmation dialogs share the same Radix interaction lock.
- Updated dependencies [4ba625e]
  - @wordrhyme/shadcn-ui@2.0.1
  - @wordrhyme/formily-shadcn@2.0.1

## 1.7.0

### Minor Changes

- 9c68dfb: 支持通过选项元数据配置状态徽标颜色和装饰圆点。
- fa1b134: 为自定义行操作提供所属菜单组件；插件操作按声明数组的相对顺序增量合并，保留未提及的操作和现有权限过滤。同一插件内原先依赖 order 排列显示顺序的调用方需改为按所需顺序声明数组。
- 6c83180: Allow custom row actions to open controlled dialogs hosted by AutoCrudTable. Dialogs survive menu dismissal, column updates, and source-row removal; closing releases the dialog, and each new opening starts a fresh session.

  Add a typed `open(options)` row-action entry point for built-in operations and custom dialogs while preserving all existing action methods.

### Patch Changes

- 81c9c3b: Allow column metadata to customize header and body cell classes and apply configured column sizes.

  Use fixed column tracks for tables with a finite maxSize so browser auto layout cannot stretch capped columns. Tables without a width cap keep their automatic layout.

  Keep column tracks in pinned rendering order, contain overflowing cell content in fixed layouts, and let default text inherit configured cell wrapping.

  Group column classes under `fields.xxx.table.classNames`, with `th` applied to headers and `td` to body cells. Add global `table.classNames` for `table`, `thead`, `tbody`, `tr`, `th`, and `td`, shared by AutoTable and DataTable. Merge cell classes in default, global, then column order.

- d96982b: Resolve custom action overrides by ID within each CRUD target and zone, preserving anonymous append behavior and owner action positions. Hidden IDs mask matching actions.
- 4d8f1b1: Align shared Radix UI and date-fns dependency ranges with the existing workspace versions so dependency installation passes workspace validation.

  Document the inherited Radix outside-pointer deferral option in Drawer metadata.

- 5d8fea8: Allow registered hidden custom actions to mask matching action IDs within their target and zone.
- e7926b3: 保留字段配置显式关闭的筛选项，不让查询能力白名单重新启用它。
- 4e1b38b: Use the shared @wordrhyme/ui entry for extensible row action menus. Consumers
  must provide the new @wordrhyme/ui peer dependency and use its menu items for
  custom actions, including Host resource permission entries.

  Requires @wordrhyme/ui ^0.1.0-alpha.20 at runtime, including its CommonJS root
  export. Publish the UI provider first; alpha.19 is only a development fixture.

- 492c940: Publish the transitive Tailwind CSS source entries across the complete component dependency chain.

  Generate both CSS entries in `dist` during the package build, keeping the public import paths unchanged. Component packages share one CSS build function; no per-package source stylesheet needs to be maintained.

  Release all four packages together so workspace dependencies resolve to newly published versions that export `./tailwind.css`, rather than older registry packages without that entry. The Tailwind entries contain source declarations only and do not inject theme or reset rules.

  Also publish an opt-in `./styles.css` entry for applications without a Tailwind build. Each package builds a self-contained stylesheet covering its own components and the transitive component dependencies, including the shared default theme, dark mode, and animation utilities. It does not include global Preflight or page background rules. CSS imports are marked as side effects so production bundlers preserve them.

- Updated dependencies [4d8f1b1]
- Updated dependencies [4b2ca4b]
- Updated dependencies
- Updated dependencies [492c940]
  - @wordrhyme/shadcn-ui@2.0.0
  - @wordrhyme/formily-shadcn@2.0.0
  - @wordrhyme/shadcn@2.0.0

## 1.6.0

### Minor Changes

- 827d0ac: Share field labels, option resolution and date/status formatting with detail views by default. Details preserve full text and arrays, resolve the selected record independently of list visibility, and support detail-only label, cell, order and visibility overrides. Shared hidden fields and denied fields remain excluded. Custom list cells can be reused explicitly with a separate single-row table context.

### Patch Changes

- 0cf6f23: Allow the host date formatter registration to carry calendar locale and time-zone policy. Keep calendar selections as YYYY-MM-DD values and update mounted date filters when the host policy changes.

  Accept strict calendar-date strings in the default server date-filter fallback while retaining timestamp input support.

  Preserve selected-date labels from existing formatter-only registrations until the host explicitly opts into calendar locale presentation.

## 1.5.7

### Patch Changes

- c07aea5: Reset pagination to the first page when clear-all or remove-filter operations change the active readable filters.

## 1.5.6

### Patch Changes

- 28c74b8: Merge table data-source labels with explicit static labels, giving static labels precedence for matching values, and render empty arrays as the standard empty placeholder.

## 1.5.5

### Patch Changes

- ccb5651: Allow host metadata to override owner field visibility, provide table-only value labels, and select declarative text, badge, date, or date-time cell presentation.

## 1.5.4

### Patch Changes

- 20c85a3: Show the total number of rows matching the current search and filters in the table footer.

## 1.5.3

### Patch Changes

- Updated dependencies [d227d42]
  - @wordrhyme/shadcn@1.3.4
  - @wordrhyme/formily-shadcn@1.13.4
  - @wordrhyme/shadcn-ui@1.32.9

## 1.5.2

### Patch Changes

- Updated dependencies [f6ad223]
  - @wordrhyme/shadcn@1.3.3
  - @wordrhyme/formily-shadcn@1.13.3
  - @wordrhyme/shadcn-ui@1.32.8

## 1.5.1

### Patch Changes

- 0360609: Refresh mounted DataTable cells when the host date formatter changes while preserving safe out-of-order formatter cleanup.

## 1.5.0

### Minor Changes

- 72da093: Allow hosts to resolve date filters into UTC half-open ranges through an optional request-context adapter while preserving the existing server-local behavior when no adapter is provided.

  Treat non-empty host ranges as authoritative and reject invalid, reversed, or incomplete boundaries instead of silently widening a query or falling back to server-local parsing.

  Allow hosts to provide AutoCrud's process-wide date formatter so shared tables follow the host's locale and timezone policy without making AutoCrud select a timezone. Formatter registrations can be disposed safely even when cleanup occurs out of order.

## 1.4.4

### Patch Changes

- Updated dependencies [f68b210]
  - @wordrhyme/shadcn-ui@1.32.7
  - @wordrhyme/formily-shadcn@1.13.2

## 1.4.3

### Patch Changes

- f28e217: Add an interactive AutoCrud dialog regression story that verifies searchable
  multi-select option lists remain portal-contained and scrollable.

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
