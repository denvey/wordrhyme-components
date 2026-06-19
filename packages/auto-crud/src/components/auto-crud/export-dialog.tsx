"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@wordrhyme/shadcn";
import { Button } from "@wordrhyme/shadcn";
import { CheckCircle2, FileDown, Loader2 } from "lucide-react";

export type ExportMode = "selected" | "filtered";

export interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 当前选中的行数 */
  selectedCount: number;
  /** 执行导出 */
  onExport: (mode: ExportMode) => Promise<void>;
  /** 是否支持导出筛选结果（需要 exportFetcher） */
  canExportFiltered?: boolean;
}

export function ExportDialog({
  open,
  onOpenChange,
  selectedCount,
  onExport,
  canExportFiltered = false,
}: ExportDialogProps) {
  const [exporting, setExporting] = React.useState<ExportMode | null>(null);
  const [done, setDone] = React.useState(false);

  const reset = React.useCallback(() => {
    setExporting(null);
    setDone(false);
  }, []);

  const handleOpenChange = React.useCallback(
    (value: boolean) => {
      if (!value) reset();
      onOpenChange(value);
    },
    [onOpenChange, reset]
  );

  const handleExport = React.useCallback(
    async (mode: ExportMode) => {
      setExporting(mode);
      try {
        await onExport(mode);
        setDone(true);
        setTimeout(() => handleOpenChange(false), 800);
      } catch {
        setExporting(null);
      }
    },
    [onExport, handleOpenChange]
  );

  const hasSelected = selectedCount > 0;

  // 如果只有一个可用选项且该选项可直接执行，则不需要弹窗
  // 但为了一致的 UX 仍保留弹窗确认

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>导出数据</DialogTitle>
          <DialogDescription>
            选择导出范围
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="text-sm text-muted-foreground">导出成功</p>
          </div>
        ) : (
          <div className="grid gap-3 py-2">
            {/* 导出选中 */}
            <Button
              variant="outline"
              className="h-auto justify-start gap-3 px-4 py-3"
              disabled={!hasSelected || exporting !== null}
              onClick={() => handleExport("selected")}
            >
              {exporting === "selected" ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
              ) : (
                <FileDown className="h-5 w-5 shrink-0" />
              )}
              <div className="flex flex-col items-start">
                <span className="font-medium">
                  导出选中{hasSelected ? ` (${selectedCount} 条)` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {hasSelected
                    ? "导出当前勾选的数据行"
                    : "请先在表格中勾选数据行"}
                </span>
              </div>
            </Button>

            {/* 导出筛选结果 */}
            {canExportFiltered && (
              <Button
                variant="outline"
                className="h-auto justify-start gap-3 px-4 py-3"
                disabled={exporting !== null}
                onClick={() => handleExport("filtered")}
              >
                {exporting === "filtered" ? (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                ) : (
                  <FileDown className="h-5 w-5 shrink-0" />
                )}
                <div className="flex flex-col items-start">
                  <span className="font-medium">导出筛选结果</span>
                  <span className="text-xs text-muted-foreground">
                    导出当前筛选条件下的所有数据
                  </span>
                </div>
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
