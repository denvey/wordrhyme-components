"use client";

import type { Table } from "@tanstack/react-table";
import { Download, Trash2, X, ChevronDown } from "lucide-react";
import * as React from "react";
import {
  ActionBar,
  ActionBarClose,
  ActionBarGroup,
  ActionBarItem,
  ActionBarSelection,
  ActionBarSeparator,
} from "@/components/ui/action-bar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@pixpilot/shadcn";
import { Button } from "@pixpilot/shadcn";
import { exportTableToCSV } from "@/lib/export";

/** 批量更新字段配置 */
export interface BatchUpdateField {
  /** 字段名 */
  field: string;
  /** 显示标签 */
  label: string;
  /** 可选值 */
  options: Array<{ label: string; value: string }>;
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
  /** 是否启用删除功能 */
  enableDelete?: boolean;
  /** 额外的操作按钮 */
  extraActions?: React.ReactNode;
}

export function AutoTableActionBar<TData>({
  table,
  onDeleteSelected,
  onUpdateSelected,
  batchUpdateFields,
  enableExport = true,
  enableDelete = true,
  extraActions,
}: AutoTableActionBarProps<TData>) {
  const rows = table.getFilteredSelectedRowModel().rows;

  const onOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        table.toggleAllRowsSelected(false);
      }
    },
    [table]
  );

  const onExport = React.useCallback(() => {
    exportTableToCSV(table, {
      excludeColumns: ["select", "actions"],
      onlySelected: true,
    });
  }, [table]);

  const onDelete = React.useCallback(() => {
    if (onDeleteSelected) {
      onDeleteSelected(rows.map((row) => row.original));
    }
  }, [rows, onDeleteSelected]);

  const handleBatchUpdate = React.useCallback(
    (field: string, value: string) => {
      if (onUpdateSelected) {
        onUpdateSelected(rows.map((row) => row.original), { [field]: value });
        table.toggleAllRowsSelected(false);
      }
    },
    [rows, onUpdateSelected, table]
  );

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
      <ActionBarGroup>
        {/* 批量更新字段下拉菜单 */}
        {batchUpdateFields?.map((fieldConfig) => (
          <DropdownMenu key={fieldConfig.field}>
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
        ))}
        {extraActions}
        {enableExport && (
          <ActionBarItem onClick={onExport}>
            <Download />
            Export
          </ActionBarItem>
        )}
        {enableDelete && onDeleteSelected && (
          <ActionBarItem variant="destructive" onClick={onDelete}>
            <Trash2 />
            Delete
          </ActionBarItem>
        )}
      </ActionBarGroup>
    </ActionBar>
  );
}
