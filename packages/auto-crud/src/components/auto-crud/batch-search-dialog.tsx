'use client';

import type { z } from 'zod';
import type { BatchSearchLocale } from '@/i18n/batch-search';
import type { BatchSearchField, BatchSearchFilter } from '@/lib/batch-search';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  RadioGroup,
  RadioGroupItem,
  Textarea,
} from '@wordrhyme/shadcn';
import { Select } from '@wordrhyme/shadcn-ui';
import { ChevronsUpDown, Info, ListFilter, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { BATCH_SEARCH_FILTER_ID, parseBatchSearchInput } from '@/lib/batch-search';
import { parseZodField } from '@/lib/schema-bridge/zod-to-columns';

interface BatchSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: BatchSearchField[];
  schema: z.ZodObject<z.ZodRawShape>;
  filter: BatchSearchFilter | null;
  maxItems: number;
  onApply: (filter: BatchSearchFilter) => void;
  onCloseAutoFocus: (event: Event) => void;
  locale: BatchSearchLocale;
}

export function BatchSearchDialog({
  open,
  onOpenChange,
  fields,
  schema,
  filter,
  maxItems,
  onApply,
  onCloseAutoFocus,
  locale,
}: BatchSearchDialogProps) {
  const id = useId();
  const [fieldId, setFieldId] = useState('');
  const [input, setInput] = useState('');
  const wasOpen = useRef(false);
  const lineNumbersRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (!open) {
      wasOpen.current = false;
      return;
    }
    if (wasOpen.current) return;
    wasOpen.current = true;
    setFieldId(filter?.id ?? fields[0]?.id ?? '');
    setInput(filter?.value.join('\n') ?? '');
  }, [open, filter, fields]);

  const field = fields.find((item) => item.id === fieldId);
  const fieldSchema = schema.shape[fieldId] as z.ZodType | undefined;
  const parsed = useMemo(
    () => (fieldSchema ? parseBatchSearchInput(input, fieldSchema, maxItems) : null),
    [input, fieldSchema, maxItems],
  );
  const error = parsed?.issue ? locale.issue(parsed.issue) : null;
  const canApply = Boolean(field) && Boolean(parsed?.values.length) && error === null;
  const apply = () => {
    if (!canApply || !parsed || !fieldSchema) return;
    onApply({
      id: fieldId,
      value: parsed.values,
      variant: parseZodField(fieldSchema).type === 'number' ? 'number' : 'text',
      operator: 'inArray',
      filterId: BATCH_SEARCH_FILTER_ID,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-[608px]"
        onCloseAutoFocus={onCloseAutoFocus}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            apply();
          }
        }}
      >
        <DialogHeader className="flex-row items-center gap-3 p-6 pr-12 text-left">
          <div className="bg-muted/40 flex size-11 shrink-0 items-center justify-center rounded-lg border">
            <ListFilter className="size-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <DialogTitle>{locale.title}</DialogTitle>
            <DialogDescription className="text-xs">
              {locale.description}
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="space-y-5 px-6 pb-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label id={`${id}-field`}>{locale.field}</Label>
              <span className="text-muted-foreground text-xs">{locale.exact}</span>
            </div>
            {fields.length <= 6 ? (
              <RadioGroup
                value={fieldId}
                onValueChange={setFieldId}
                aria-labelledby={`${id}-field`}
                className="grid grid-cols-2 gap-2 sm:grid-cols-3"
              >
                {fields.map((item, index) => (
                  <Label
                    key={item.id}
                    htmlFor={`${id}-field-${index}`}
                    className="has-[[data-state=checked]]:border-foreground has-[[data-state=checked]]:bg-muted/40 hover:bg-muted/40 flex min-w-0 cursor-pointer items-center gap-2 rounded-md border p-3 text-xs font-normal"
                  >
                    <RadioGroupItem id={`${id}-field-${index}`} value={item.id} />
                    <span className="break-words">{item.label}</span>
                  </Label>
                ))}
              </RadioGroup>
            ) : (
              <Select
                mode="searchable"
                value={fieldId}
                onChange={setFieldId}
                options={fields.map((item) => ({
                  value: item.id,
                  label: item.label,
                  searchText: item.id,
                }))}
                searchPlaceholder={locale.searchFields}
                emptyText={locale.emptyFields}
                matchTriggerWidth
                renderTrigger={({ open: pickerOpen }) => (
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-labelledby={`${id}-field`}
                    aria-expanded={pickerOpen}
                    className="w-full justify-between"
                  >
                    {field?.label ?? locale.field}
                    <ChevronsUpDown
                      className="text-muted-foreground size-4"
                      aria-hidden="true"
                    />
                  </Button>
                )}
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-values`}>{field?.label ?? locale.field}</Label>
            <p id={`${id}-hint`} className="text-muted-foreground text-xs">
              {locale.inputHint}
            </p>
            <div className="focus-within:ring-ring/30 flex overflow-hidden rounded-md border focus-within:ring-2">
              <pre
                ref={lineNumbersRef}
                aria-hidden="true"
                className="bg-muted/40 text-muted-foreground max-h-52 w-10 shrink-0 overflow-hidden border-r py-3 pr-2 text-right font-mono text-xs leading-6 select-none"
              >
                {Array.from(
                  { length: Math.min(input.split(/\r\n|\n|\r/u).length, 2100) },
                  (_, index) => index + 1,
                ).join('\n')}
              </pre>
              <Textarea
                id={`${id}-values`}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onScroll={(event) => {
                  if (lineNumbersRef.current)
                    lineNumbersRef.current.scrollTop = event.currentTarget.scrollTop;
                }}
                placeholder={locale.placeholder}
                spellCheck={false}
                aria-invalid={Boolean(error)}
                aria-describedby={`${id}-hint ${id}-status${error !== null ? ` ${id}-error` : ''}`}
                className="h-52 min-h-52 resize-none rounded-none border-0 px-3 py-3 font-mono text-xs leading-6 shadow-none focus-visible:ring-0"
              />
            </div>
            <div className="flex items-start justify-between gap-2 text-xs">
              <div
                id={`${id}-status`}
                className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1"
                aria-live="polite"
              >
                <span>{locale.count(parsed?.values.length ?? 0, maxItems)}</span>
                {parsed !== null && parsed.duplicates > 0 && (
                  <span>{locale.duplicates(parsed.duplicates)}</span>
                )}
              </div>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground shrink-0 underline-offset-4 hover:underline"
                disabled={!input}
                onClick={() => setInput('')}
              >
                {locale.clear}
              </button>
            </div>
            {error !== null && (
              <p
                id={`${id}-error`}
                role="alert"
                className="bg-destructive/10 text-destructive rounded-md p-2 text-xs"
              >
                {error}
              </p>
            )}
          </div>
          <p className="text-muted-foreground border-t pt-3 text-xs">
            {locale.combination}
          </p>
        </div>
        <DialogFooter className="bg-muted/30 flex-row flex-wrap items-center justify-between gap-3 border-t px-6 py-4 sm:justify-between">
          <p className="text-muted-foreground flex min-w-0 flex-1 items-start gap-1.5 text-xs">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {locale.session}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {locale.cancel}
            </Button>
            <Button type="button" disabled={!canApply} onClick={apply}>
              <Search className="size-4" aria-hidden="true" />
              {locale.apply(parsed?.values.length ?? 0)}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
