"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@pixpilot/shadcn";
import { Button } from "@pixpilot/shadcn";
import { parseImportFile, generateCSVTemplate, type ParsedImportData } from "@/lib/import";
import type { ImportResult } from "@/hooks/use-auto-crud-resource";
import type { AutoCrudLocale } from "@/i18n/locale";
import { zhCN } from "@/i18n/locale";

type ImportStep = "upload" | "preview" | "importing" | "result";

export interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 执行导入的回调 */
  onImport: (rows: Record<string, unknown>[]) => Promise<ImportResult>;
  /** 可用列名（用于生成模板） */
  columns?: string[];
  /** 对话框标题（优先于 locale.title） */
  title?: string;
  /** 语言包，默认 zh-CN */
  locale?: AutoCrudLocale["importDialog"];
}

export function ImportDialog({
  open,
  onOpenChange,
  onImport,
  columns = [],
  title,
  locale = zhCN.importDialog,
}: ImportDialogProps) {
  const [step, setStep] = React.useState<ImportStep>("upload");
  const [parsedData, setParsedData] = React.useState<ParsedImportData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const reset = React.useCallback(() => {
    setStep("upload");
    setParsedData(null);
    setError(null);
    setResult(null);
    setIsDragging(false);
  }, []);

  const handleOpenChange = React.useCallback(
    (value: boolean) => {
      if (!value) reset();
      onOpenChange(value);
    },
    [onOpenChange, reset]
  );

  const handleFile = React.useCallback(async (file: File) => {
    setError(null);
    try {
      const data = await parseImportFile(file);
      if (data.rows.length === 0) {
        setError(locale.errorNoData);
        return;
      }
      setParsedData(data);
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : locale.errorParseFailed);
    }
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleImport = React.useCallback(async () => {
    if (!parsedData) return;
    setStep("importing");
    try {
      const importResult = await onImport(parsedData.rows);
      setResult(importResult);
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : locale.errorImportFailed);
      setStep("preview");
    }
  }, [parsedData, onImport]);

  const handleDownloadTemplate = React.useCallback(() => {
    if (columns.length === 0) return;
    const csv = generateCSVTemplate(columns);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }, [columns]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title ?? locale.title}</DialogTitle>
          <DialogDescription>
            {step === "upload" && locale.uploadDescription}
            {step === "preview" && locale.previewDescription(parsedData?.rows.length ?? 0)}
            {step === "importing" && locale.importingDescription}
            {step === "result" && locale.doneDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 上传步骤 */}
          {step === "upload" && (
            <>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-2">
                  <svg
                    className="h-10 w-10 text-muted-foreground"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
                  </svg>
                  <p className="text-sm text-muted-foreground">
                    {locale.dragHint}
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    {locale.formatHint}
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>

              {columns.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleDownloadTemplate}
                >
                  {locale.downloadTemplate}
                </Button>
              )}
            </>
          )}

          {/* 预览步骤 */}
          {step === "preview" && parsedData && (
            <>
              <div className="rounded-md border">
                <div className="max-h-[300px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                        {parsedData.headers.slice(0, 6).map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">
                            {h}
                          </th>
                        ))}
                        {parsedData.headers.length > 6 && (
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            {locale.moreColumns(parsedData.headers.length - 6)}
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.rows.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                          {parsedData.headers.slice(0, 6).map((h) => (
                            <td key={h} className="px-3 py-2 max-w-[150px] truncate">
                              {String(row[h] ?? "")}
                            </td>
                          ))}
                          {parsedData.headers.length > 6 && (
                            <td className="px-3 py-2 text-muted-foreground">...</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                {locale.previewSummary(
                  parsedData.rows.length,
                  parsedData.headers.length,
                  parsedData.format,
                  parsedData.rows.length > 10 ? 10 : undefined,
                )}
              </p>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={reset}>
                  {locale.reselect}
                </Button>
                <Button onClick={handleImport}>
                  {locale.confirmImport}
                </Button>
              </div>
            </>
          )}

          {/* 导入中 */}
          {step === "importing" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">
                {locale.importingRows(parsedData?.rows.length ?? 0)}
              </p>
            </div>
          )}

          {/* 结果步骤 */}
          {step === "result" && result && (
            <>
              <div className="space-y-3">
                <div className="flex gap-4">
                  <div className="flex-1 rounded-lg bg-green-50 dark:bg-green-950/30 p-3 text-center">
                    <p className="text-2xl font-semibold text-green-600">{result.success}</p>
                    <p className="text-xs text-green-600/80">{locale.resultCreated}</p>
                  </div>
                  {(result.updated ?? 0) > 0 && (
                    <div className="flex-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 text-center">
                      <p className="text-2xl font-semibold text-blue-600">{result.updated}</p>
                      <p className="text-xs text-blue-600/80">{locale.resultUpdated}</p>
                    </div>
                  )}
                  {result.skipped > 0 && (
                    <div className="flex-1 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 p-3 text-center">
                      <p className="text-2xl font-semibold text-yellow-600">{result.skipped}</p>
                      <p className="text-xs text-yellow-600/80">{locale.resultSkipped}</p>
                    </div>
                  )}
                  {result.failed.length > 0 && (
                    <div className="flex-1 rounded-lg bg-red-50 dark:bg-red-950/30 p-3 text-center">
                      <p className="text-2xl font-semibold text-red-600">{result.failed.length}</p>
                      <p className="text-xs text-red-600/80">{locale.resultFailed}</p>
                    </div>
                  )}
                </div>

                {/* 失败详情 */}
                {result.failed.length > 0 && (
                  <div className="rounded-md border border-red-200 dark:border-red-900">
                    <div className="max-h-[200px] overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-red-50 dark:bg-red-950/30">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-red-600">{locale.failedRowHeader}</th>
                            <th className="px-3 py-2 text-left font-medium text-red-600">{locale.failedErrorHeader}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.failed.map((f) => (
                            <tr key={f.row} className="border-t border-red-100 dark:border-red-900">
                              <td className="px-3 py-2 text-red-600">{f.row + 1}</td>
                              <td className="px-3 py-2 text-red-600/80">
                                {f.errors.join("; ")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  {locale.close}
                </Button>
                <Button variant="outline" onClick={reset}>
                  {locale.continueImport}
                </Button>
              </div>
            </>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
