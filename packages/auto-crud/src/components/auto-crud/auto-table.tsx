'use client';

import { z } from 'zod';
import { useCallback, useEffect, useMemo } from 'react';
import { CommandIcon, FileSpreadsheetIcon, ListFilterIcon } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableFilterList } from '@/components/data-table/data-table-filter-list';
import { DataTableFilterMenu } from '@/components/data-table/data-table-filter-menu';
import { DataTableSortList } from '@/components/data-table/data-table-sort-list';
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options';
import { Button, Input } from '@wordrhyme/shadcn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@wordrhyme/shadcn';
import {
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryState,
  useUrlState,
} from '@/hooks/use-url-state';
import { AutoTableSimpleFilters } from './auto-table-simple-filters';
import {
  AutoTableActionBar,
  type BatchActionConfig,
  type BatchDeleteConfirmation,
  type BatchUpdateField,
} from './auto-table-action-bar';
import { useDataTable } from '@/hooks/use-data-table';
import {
  createTableSchema,
  createSelectColumn,
  createActionsColumn,
  type ActionsColumnConfig,
} from '@/lib/schema-bridge/zod-to-columns';
import type { ColumnOverrides } from '@/lib/schema-bridge/types';

/** 过滤模式类型 */
export type FilterMode = 'simple' | 'advanced' | 'command';

const DEFAULT_MODES: FilterMode[] = ['simple', 'advanced', 'command'];

/** 过滤模式配置 */
const filterModeConfig: Record<
  FilterMode,
  { label: string; icon: typeof ListFilterIcon; tooltip: string }
> = {
  simple: {
    label: 'Simple',
    icon: ListFilterIcon,
    tooltip: 'Simple column filters',
  },
  advanced: {
    label: 'Advanced',
    icon: FileSpreadsheetIcon,
    tooltip: 'Airtable-style advanced filters',
  },
  command: {
    label: 'Command',
    icon: CommandIcon,
    tooltip: 'Linear-style command filters',
  },
};

interface AutoTableProps<T extends z.ZodObject<z.ZodRawShape>> {
  schema: T;
  data: z.infer<T>[];
  pageCount?: number;
  overrides?: ColumnOverrides<z.infer<T>>;
  enableRowSelection?: boolean;
  exclude?: (keyof z.infer<T>)[];
  actions?: ActionsColumnConfig<z.infer<T>>;
  /** 自定义固定列配置 */
  pinnedColumns?: {
    left?: string[];
    right?: string[];
  };
  /**
   * 过滤模式配置
   * - 单个值: 只使用该模式，不显示切换按钮
   * - 数组: 第一个为默认值，显示切换按钮
   * 默认: ["simple", "advanced", "command"] (全部显示)
   */
  filterMode?: FilterMode | FilterMode[];
  /** 全局搜索框 */
  search?:
    | boolean
    | {
        placeholder?: string;
      };
  /** 批量删除回调 */
  onDeleteSelected?: (rows: z.infer<T>[]) => void;
  /** 批量更新回调 */
  onUpdateSelected?: (rows: z.infer<T>[], data: Record<string, unknown>) => void;
  /** 批量更新字段配置 */
  batchUpdateFields?: BatchUpdateField[];
  /** 批量操作栏额外按钮 */
  actionBarExtra?: React.ReactNode;
  /** 批量悬浮操作配置 */
  actionBarActions?: BatchActionConfig<z.infer<T>>;
  /** 批量删除二次确认文案 */
  deleteConfirmation?: BatchDeleteConfirmation;
  /** 初始排序 */
  initialSorting?: any[];
  /** 是否启用导出功能 (默认 true) */
  enableExport?: boolean;
  /** 未配置批量 actions / 只配置 custom actions 时，是否展示默认导出按钮 */
  showDefaultExport?: boolean;
  /** 选中行数变化回调（用于外层组件获知选中状态） */
  onSelectedCountChange?: (count: number) => void;
  /** 选中行数据变化回调（用于外层组件获知选中行身份变化） */
  onSelectedRowsChange?: (rows: z.infer<T>[]) => void;
  /** 获取选中行数据的回调（由外层组件调用） */
  getSelectedRows?: React.MutableRefObject<(() => z.infer<T>[]) | null>;
}

export function AutoTable<T extends z.ZodObject<z.ZodRawShape>>({
  schema,
  data,
  pageCount = 1,
  overrides,
  enableRowSelection = true,
  exclude,
  actions,
  pinnedColumns,
  filterMode = 'simple',
  search = false,
  onDeleteSelected,
  onUpdateSelected,
  batchUpdateFields,
  actionBarExtra,
  actionBarActions,
  deleteConfirmation,
  initialSorting,
  enableExport = true,
  showDefaultExport = true,
  onSelectedCountChange,
  onSelectedRowsChange,
  getSelectedRows,
}: AutoTableProps<T>) {
  // 解析过滤模式配置，默认显示全部 3 个模式
  const modes = filterMode
    ? Array.isArray(filterMode)
      ? filterMode
      : [filterMode]
    : DEFAULT_MODES;
  const [currentMode, setCurrentMode] = useQueryState(
    'filterMode',
    parseAsStringEnum<FilterMode>(modes).withDefault(modes[0] ?? 'simple'),
  );
  const showToggle = modes.length > 1;
  const [searchValue, setSearchValue] = useUrlState(
    'search',
    parseAsString.withDefault(''),
    {
      shallow: false,
      clearOnDefault: true,
    },
  );
  const [, setSearchPage] = useUrlState('page', parseAsInteger.withDefault(1), {
    shallow: false,
    clearOnDefault: true,
  });
  const searchConfig = search && typeof search === 'object' ? search : {};

  // 所有模式都使用高级过滤的数据流（filters 数组同步到 URL）
  // 区别只在于 UI 展示方式
  const enableAdvancedFilter = true;
  const columns = useMemo(() => {
    const dataColumns = createTableSchema(schema, { overrides, exclude });
    const result = enableRowSelection
      ? [createSelectColumn<z.infer<T>>(), ...dataColumns]
      : dataColumns;

    // 如果有 actions 配置，添加操作列到表格末尾
    if (actions) {
      result.push(createActionsColumn<z.infer<T>>(actions));
    }

    return result;
  }, [schema, overrides, enableRowSelection, exclude, actions]);

  const stableInitialState = useMemo(
    () => ({
      sorting: initialSorting,
      columnPinning: pinnedColumns ?? {
        left: enableRowSelection ? ['select'] : [],
        right: actions ? ['actions'] : [],
      },
    }),
    [initialSorting, pinnedColumns, enableRowSelection, actions],
  );

  const { table, shallow, debounceMs, throttleMs } = useDataTable({
    data,
    columns,
    pageCount,
    enableAdvancedFilter,
    initialState: stableInitialState,
    shallow: false,
    clearOnDefault: true,
  });

  const rowSelection = table.getState().rowSelection;
  const columnFilters = table.getState().columnFilters;
  const selectedRows = useMemo(
    () => table.getFilteredSelectedRowModel().rows.map((row) => row.original),
    [table, rowSelection, columnFilters, data],
  );

  // 暴露选中行数据给外层组件
  const getSelectedRowsFn = useCallback(() => selectedRows, [selectedRows]);

  useEffect(() => {
    if (getSelectedRows) {
      getSelectedRows.current = getSelectedRowsFn;
    }
    return () => {
      if (getSelectedRows) {
        getSelectedRows.current = null;
      }
    };
  }, [getSelectedRows, getSelectedRowsFn]);

  // 通知外层选中行数变化
  const selectedRowCount = selectedRows.length;
  useEffect(() => {
    onSelectedCountChange?.(selectedRowCount);
  }, [selectedRowCount, onSelectedCountChange]);

  useEffect(() => {
    onSelectedRowsChange?.(selectedRows);
  }, [selectedRows, onSelectedRowsChange]);

  // 过滤模式切换组件（放在 View 旁边）
  const FilterModeSelect = showToggle ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          aria-label={`Switch filter mode, current: ${filterModeConfig[currentMode].label}`}
        >
          {(() => {
            const Icon = filterModeConfig[currentMode].icon;
            return <Icon className="size-4 text-muted-foreground" />;
          })()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={currentMode}
          onValueChange={(v) => setCurrentMode(v as FilterMode)}
        >
          {modes.map((mode) => {
            const config = filterModeConfig[mode];
            return (
              <DropdownMenuRadioItem key={mode} value={mode}>
                <config.icon className="size-4" />
                {config.label}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  const searchInput = search ? (
    <Input
      value={searchValue}
      onChange={(event) => {
        setSearchValue(event.target.value);
        setSearchPage(1);
      }}
      placeholder={searchConfig.placeholder ?? '搜索'}
      className="h-8 w-48 shrink-0"
    />
  ) : null;

  // 渲染过滤器组件（memoized to avoid recreating on every render）
  const filtersContent = useMemo(() => {
    switch (currentMode) {
      case 'simple':
        return (
          <AutoTableSimpleFilters table={table} shallow={shallow} leading={searchInput} />
        );
      case 'command':
        return (
          <DataTableFilterMenu
            table={table}
            shallow={shallow}
            debounceMs={debounceMs}
            throttleMs={throttleMs}
          />
        );
      default:
        return (
          <DataTableFilterList
            table={table}
            shallow={shallow}
            debounceMs={debounceMs}
            throttleMs={throttleMs}
            align="start"
          />
        );
    }
  }, [currentMode, table, columns, shallow, searchInput, debounceMs, throttleMs]);

  return (
    <div className="space-y-4">
      <div className="flex w-full items-start justify-between gap-2 p-1">
        <div
          className="flex min-h-[40px] min-w-0 flex-1 items-start gap-2"
          data-filter-parent
        >
          {currentMode !== 'simple' && searchInput}
          {currentMode !== 'simple' && <DataTableSortList table={table} align="start" />}
          {filtersContent}
        </div>
        <div className="flex items-center gap-2">
          {currentMode === 'simple' && <DataTableSortList table={table} align="end" />}
          {FilterModeSelect}
          <DataTableViewOptions table={table} align="end" />
        </div>
      </div>
      <DataTable table={table} />
      {enableRowSelection && (
        <AutoTableActionBar
          table={table}
          onDeleteSelected={onDeleteSelected}
          onUpdateSelected={onUpdateSelected}
          batchUpdateFields={batchUpdateFields}
          enableDelete={!!onDeleteSelected}
          enableExport={enableExport}
          showDefaultExport={showDefaultExport}
          extraActions={actionBarExtra}
          actions={actionBarActions}
          deleteConfirmation={deleteConfirmation}
        />
      )}
    </div>
  );
}
