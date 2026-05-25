'use client';

import type { Table } from '@tanstack/react-table';
import { Download, Trash2, X, ChevronDown } from 'lucide-react';
import * as React from 'react';
import {
  ActionBar,
  ActionBarClose,
  ActionBarGroup,
  ActionBarItem,
  ActionBarSelection,
  ActionBarSeparator,
} from '@/components/ui/action-bar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@pixpilot/shadcn';
import { Button } from '@pixpilot/shadcn';
import { exportTableToCSV } from '@/lib/export';

/** 批量更新字段配置 */
export interface BatchUpdateField {
  /** 字段名 */
  field: string;
  /** 显示标签 */
  label: string;
  /** 可选值 */
  options: Array<{ label: string; value: string }>;
}

export interface BatchActionContext<TData> {
  /** 选中的原始行数据 */
  rows: TData[];
  /** TanStack Table 实例 */
  table: Table<TData>;
  /** 清空当前选择 */
  clearSelection: () => void;
}

export type BatchBuiltinActionType = 'batchUpdate' | 'export' | 'delete';

export type BatchBuiltinActionItem<TData> = {
  type: BatchBuiltinActionType;
  /** 替代默认行为 */
  onClick?: (
    rows: TData[],
    context: BatchActionContext<TData>,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => void;
  /** 替代默认标签，仅对 export/delete 生效 */
  label?: string;
  /** 替代整个内置操作的渲染 */
  component?: React.ReactNode | ((context: BatchActionContext<TData>) => React.ReactNode);
};

export type BatchCustomActionItem<TData> = {
  type: 'custom';
  /** 操作文本。传 component 时可省略 */
  label?: string;
  /** 自定义点击行为。传 component 时可省略 */
  onClick?: (
    rows: TData[],
    context: BatchActionContext<TData>,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => void;
  /** 渲染自定义内容 */
  component?: React.ReactNode | ((context: BatchActionContext<TData>) => React.ReactNode);
  /** 仅在无内置项时生效：插入到首部还是尾部（默认 end） */
  position?: 'start' | 'end';
  variant?: 'default' | 'destructive';
};

export type BatchActionItem<TData> =
  | BatchBuiltinActionItem<TData>
  | BatchCustomActionItem<TData>;

export type BatchActionConfig<TData> =
  | BatchActionItem<TData>[]
  | ((defaults: BatchBuiltinActionItem<TData>[]) => BatchActionItem<TData>[]);

function isBatchCustomAction<TData>(
  action: BatchActionItem<TData>,
): action is BatchCustomActionItem<TData> {
  return action.type === 'custom';
}

interface AutoTableActionBarProps<TData> {
  table: Table<TData>;
  onDeleteSelected?: (rows: TData[]) => void;
  /** 批量更新回调 */
  onUpdateSelected?: (rows: TData[], data: Record<string, unknown>) => void;
  /** 批量更新字段配置 */
  batchUpdateFields?: BatchUpdateField[];
  /** 是否启用导出功能 */
  enableExport?: boolean;
  /** 未配置 actions / 只配置 custom actions 时，是否展示默认导出按钮 */
  showDefaultExport?: boolean;
  /** 是否启用删除功能 */
  enableDelete?: boolean;
  /** 额外的操作按钮 */
  extraActions?: React.ReactNode;
  /** 批量操作配置，支持和行操作/顶部工具栏一致的顺序接管语义 */
  actions?: BatchActionConfig<TData>;
}

export function AutoTableActionBar<TData>({
  table,
  onDeleteSelected,
  onUpdateSelected,
  batchUpdateFields,
  enableExport = true,
  showDefaultExport = true,
  enableDelete = true,
  extraActions,
  actions,
}: AutoTableActionBarProps<TData>) {
  const rows = table.getFilteredSelectedRowModel().rows;
  const selectedRows = React.useMemo(() => rows.map((row) => row.original), [rows]);

  const clearSelection = React.useCallback(() => {
    table.toggleAllRowsSelected(false);
  }, [table]);

  const actionContext = React.useMemo<BatchActionContext<TData>>(
    () => ({
      rows: selectedRows,
      table,
      clearSelection,
    }),
    [selectedRows, table, clearSelection],
  );

  const onOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        clearSelection();
      }
    },
    [clearSelection],
  );

  const onExport = React.useCallback(() => {
    exportTableToCSV(table, {
      excludeColumns: ['select', 'actions'],
      onlySelected: true,
    });
  }, [table]);

  const onDelete = React.useCallback(() => {
    if (onDeleteSelected) {
      onDeleteSelected(selectedRows);
    }
  }, [selectedRows, onDeleteSelected]);

  const handleBatchUpdate = React.useCallback(
    (field: string, value: string) => {
      if (onUpdateSelected) {
        onUpdateSelected(selectedRows, { [field]: value });
        clearSelection();
      }
    },
    [selectedRows, onUpdateSelected, clearSelection],
  );

  const renderComponent = React.useCallback(
    (
      component:
        | React.ReactNode
        | ((context: BatchActionContext<TData>) => React.ReactNode),
    ) => (typeof component === 'function' ? component(actionContext) : component),
    [actionContext],
  );

  const renderBatchUpdate = React.useCallback(
    (keyPrefix = 'batch-update') =>
      batchUpdateFields?.map((fieldConfig) => (
        <DropdownMenu key={`${keyPrefix}-${fieldConfig.field}`}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2">
              {fieldConfig.label}
              <ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {fieldConfig.options.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleBatchUpdate(fieldConfig.field, option.value)}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )),
    [batchUpdateFields, handleBatchUpdate],
  );

  const renderBuiltinAction = React.useCallback(
    (action: BatchBuiltinActionItem<TData>) => {
      const visible =
        action.type === 'batchUpdate'
          ? !!onUpdateSelected && !!batchUpdateFields?.length
          : action.type === 'export'
            ? enableExport
            : enableDelete && !!onDeleteSelected;

      if (!visible) return null;

      if (action.component) {
        return renderComponent(action.component);
      }

      if (action.type === 'batchUpdate') {
        return renderBatchUpdate(action.type);
      }

      if (action.type === 'export') {
        return (
          <ActionBarItem
            key="export"
            onClick={(event) =>
              action.onClick
                ? action.onClick(selectedRows, actionContext, event)
                : onExport()
            }
          >
            <Download />
            {action.label ?? 'Export'}
          </ActionBarItem>
        );
      }

      if (action.type === 'delete') {
        return (
          <ActionBarItem
            key="delete"
            variant="destructive"
            onClick={(event) =>
              action.onClick
                ? action.onClick(selectedRows, actionContext, event)
                : onDelete()
            }
          >
            <Trash2 />
            {action.label ?? 'Delete'}
          </ActionBarItem>
        );
      }

      return null;
    },
    [
      actionContext,
      batchUpdateFields?.length,
      enableDelete,
      enableExport,
      onDelete,
      onDeleteSelected,
      onUpdateSelected,
      onExport,
      renderBatchUpdate,
      renderComponent,
      selectedRows,
    ],
  );

  const renderCustomAction = React.useCallback(
    (action: BatchCustomActionItem<TData>, index: number) => {
      if (action.component) {
        return (
          <React.Fragment key={`custom-${index}`}>
            {renderComponent(action.component)}
          </React.Fragment>
        );
      }

      if (!action.label || !action.onClick) return null;

      return (
        <ActionBarItem
          key={`custom-${index}`}
          variant={action.variant === 'destructive' ? 'destructive' : 'secondary'}
          onClick={(event) => action.onClick?.(selectedRows, actionContext, event)}
        >
          {action.label}
        </ActionBarItem>
      );
    },
    [actionContext, renderComponent, selectedRows],
  );

  const renderedActions = React.useMemo(() => {
    const defaults: BatchBuiltinActionItem<TData>[] = [
      { type: 'batchUpdate' },
      { type: 'export' },
      { type: 'delete' },
    ];
    const resolvedActions = typeof actions === 'function' ? actions(defaults) : actions;

    if (!resolvedActions || resolvedActions.length === 0) {
      return (
        <>
          {renderBuiltinAction({ type: 'batchUpdate' })}
          {extraActions}
          {showDefaultExport && renderBuiltinAction({ type: 'export' })}
          {renderBuiltinAction({ type: 'delete' })}
        </>
      );
    }

    const hasBuiltin = resolvedActions.some((action) => action.type !== 'custom');

    if (!hasBuiltin) {
      const startNodes = resolvedActions
        .filter(isBatchCustomAction)
        .filter((action) => action.position === 'start')
        .map((action, index) => renderCustomAction(action, index));
      const endNodes = resolvedActions
        .filter(isBatchCustomAction)
        .filter((action) => action.position !== 'start')
        .map((action, index) => renderCustomAction(action, index));

      return (
        <>
          {startNodes}
          {renderBuiltinAction({ type: 'batchUpdate' })}
          {extraActions}
          {showDefaultExport && renderBuiltinAction({ type: 'export' })}
          {renderBuiltinAction({ type: 'delete' })}
          {endNodes}
        </>
      );
    }

    return resolvedActions.map((action, index) => {
      if (action.type === 'custom') {
        return renderCustomAction(action, index);
      }
      return (
        <React.Fragment key={action.type}>{renderBuiltinAction(action)}</React.Fragment>
      );
    });
  }, [actions, extraActions, renderBuiltinAction, renderCustomAction, showDefaultExport]);

  return (
    <ActionBar open={rows.length > 0} onOpenChange={onOpenChange}>
      <ActionBarSelection>
        <span className="font-medium">{rows.length}</span>
        <span>selected</span>
        <ActionBarSeparator />
        <ActionBarClose>
          <X />
        </ActionBarClose>
      </ActionBarSelection>
      <ActionBarSeparator />
      <ActionBarGroup>{renderedActions}</ActionBarGroup>
    </ActionBar>
  );
}
