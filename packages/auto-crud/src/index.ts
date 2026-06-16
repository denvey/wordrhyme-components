// Auto-CRUD Components
export { AutoCrudTable } from './components/auto-crud/auto-crud-table';
export type {
  Field,
  FieldOption,
  Fields,
  FilterConfig,
  AutoCrudTableProps,
  ActionItem,
  AutoCrudToolbarContext,
  AutoCrudToolbarResolver,
  ToolbarActionItem,
  ToolbarActionConfig,
  ToolbarBuiltinActionItem,
  ToolbarCustomActionItem,
} from './components/auto-crud/auto-crud-table';
export { setAutoCrudToolbarResolver } from './components/auto-crud/auto-crud-table';

// i18n
export { zhCN, enUS, jaJP, koKR, frFR, deDE, esES, resolveLocale } from './i18n/locale';
export type { AutoCrudLocale, LocaleProp } from './i18n/locale';
export { AutoForm } from './components/auto-crud/auto-form';
export { AutoTable } from './components/auto-crud/auto-table';
export { AutoTableActionBar } from './components/auto-crud/auto-table-action-bar';
export type {
  BatchActionConfig,
  BatchActionContext,
  BatchActionItem,
  BatchBuiltinActionItem,
  BatchBuiltinActionType,
  BatchCustomActionItem,
  BatchUpdateField,
} from './components/auto-crud/auto-table-action-bar';
export { AutoTableSimpleFilters } from './components/auto-crud/auto-table-simple-filters';
export { CrudFormModal } from './components/auto-crud/crud-form-modal';
export { ImportDialog } from './components/auto-crud/import-dialog';
export type { ImportDialogProps } from './components/auto-crud/import-dialog';
export { ExportDialog } from './components/auto-crud/export-dialog';
export type { ExportDialogProps, ExportMode } from './components/auto-crud/export-dialog';

// Data Table Components
export { DataTable } from './components/data-table/data-table';
export { DataTableAdvancedToolbar } from './components/data-table/data-table-advanced-toolbar';
export { DataTableColumnHeader } from './components/data-table/data-table-column-header';
export { DataTableFacetedFilter } from './components/data-table/data-table-faceted-filter';
export { DataTablePagination } from './components/data-table/data-table-pagination';
export { DataTableToolbar } from './components/data-table/data-table-toolbar';
export { DataTableViewOptions } from './components/data-table/data-table-view-options';
export { MultiCombobox } from './components/ui/multi-combobox';
export type {
  MultiComboboxOption,
  MultiComboboxProps,
  MultiComboboxTriggerRenderProps,
} from './components/ui/multi-combobox';

// AutoCrud registries
export {
  components,
  dataSources,
  formComponents,
  normalizeDataSourceConfig,
  normalizeOptions,
} from './lib/registries';
export type {
  AutoCrudDataSourceConfig,
  AutoCrudDataSourceContext,
  AutoCrudDataSourceEntry,
  AutoCrudDataSourceLoader,
  AutoCrudDataSourceRegistration,
  AutoCrudFormComponentConfig,
  AutoCrudOption,
} from './lib/registries';

// Hooks
export { useAutoCrudResource, noopToastAdapter } from './hooks/use-auto-crud-resource';
export type {
  ToastAdapter,
  CrudHooks,
  UseAutoCrudResourceOptions,
  UseAutoCrudResourceReturn,
  UseAutoCrudResourceParams,
  AutoQueryParams,
  ImportResult,
} from './hooks/use-auto-crud-resource';
export { useDataTable } from './hooks/use-data-table';
export { useReadableFilters } from './hooks/use-readable-filters';
export {
  useUrlState,
  useUrlStates,
  useQueryState,
  useQueryStates,
  getUrlParams,
  setSearchParams,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  parseAsArrayOf,
} from './hooks/use-url-state';
export type { Parser, UrlStateOptions } from './hooks/use-url-state';

// Schema Bridge - 核心工具和类型
export {
  parseZodField,
  createTableSchema,
  createSelectColumn,
  createActionsColumn,
} from './lib/schema-bridge/zod-to-columns';
export type { ActionsColumnConfig } from './lib/schema-bridge/zod-to-columns';
export {
  createFormSchema,
  createEditFormSchema,
} from './lib/schema-bridge/zod-to-formily';
export type {
  FieldType,
  FilterVariant,
  ParsedZodField,
  ColumnOverrides,
  FormSchemaOverrides,
  CreateTableSchemaOptions,
  CreateFormSchemaOptions,
  EnumOption,
} from './lib/schema-bridge/types';

// Schema Adapter (NEW)
export { SchemaAdapter } from './lib/schema-bridge/schema-adapter';
export type {
  UnifiedSchema,
  JSONSchema,
  JSONSchemaProperty,
  SimpleFieldsConfig,
  SimpleFieldConfig,
  UnifiedField,
} from './lib/schema-bridge/schema-adapter';

// Data Source (NEW)
export { createTRPCDataSource, createMemoryDataSource } from './lib/data-source';
export type { DataSource, ListParams, ListResult } from './lib/data-source';

// Utils
export { cn } from './lib/utils';
export { formatDate } from './lib/format';
export { humanize } from './lib/humanize';

// Import/Export Utils
export {
  parseCSV,
  parseJSON,
  parseImportFile,
  generateCSVTemplate,
  dataToCSV,
  coerceRowValues,
} from './lib/import';
export type { ParsedImportData } from './lib/import';
export { exportTableToCSV, exportAllToCSV, downloadCSVTemplate } from './lib/export';

// Types
export type * from './types/data-table';
export type { CrudPermissions, CrudOperationPermissions } from './types/permissions';
