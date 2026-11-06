'use client';

import type { z } from 'zod';
import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@wordrhyme/shadcn';
import { List, X } from 'lucide-react';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { getUrlParams, setSearchParams } from '@/hooks/use-url-state';
import type { TableBatchSearchConfig, TableSearchConfig } from './auto-table';
import { enUSBatchSearch } from '@/i18n/batch-search';
import { BatchSearchDialog } from './batch-search-dialog';

interface AutoTableSearchProps extends TableSearchConfig {
  pageKey?: string;
  schema?: z.ZodObject<z.ZodRawShape>;
  searchEnabled?: boolean;
  batchSearch?: TableBatchSearchConfig;
  openRef?: React.Ref<() => void>;
}

export function AutoTableSearch({
  placeholder = '搜索',
  debounceMs = 200,
  pageKey = 'page',
  render,
  prefix,
  schema,
  searchEnabled = true,
  batchSearch,
  openRef,
}: AutoTableSearchProps) {
  const hintId = useId();
  const [batchOpen, setBatchOpen] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(() => getUrlParams().get('search') ?? '');
  const valueRef = useRef(value);
  const composing = useRef(false);
  const commit = useCallback(
    (next: string, resetPage = false) => {
      const params = getUrlParams();
      if ((params.get('search') ?? '') === next && !resetPage) return;
      if (next) params.set('search', next);
      else params.delete('search');
      // Search and pagination must change together, so no request uses the old search.
      params.delete(pageKey);
      setSearchParams(params);
    },
    [pageKey],
  );
  const debouncedCommit = useDebouncedCallback(commit, debounceMs);
  const { cancel } = debouncedCommit;

  useEffect(() => {
    const sync = () => {
      cancel();
      valueRef.current = getUrlParams().get('search') ?? '';
      setValue(valueRef.current);
    };
    window.addEventListener('popstate', sync);
    window.addEventListener('urlchange', sync);
    return () => {
      cancel();
      window.removeEventListener('popstate', sync);
      window.removeEventListener('urlchange', sync);
    };
  }, [cancel, pageKey]);

  const change = (next: string) => {
    if (!searchEnabled) return;
    valueRef.current = next;
    setValue(next);
    cancel();
    if (composing.current) return;
    if (!next || debounceMs <= 0) commit(next);
    else debouncedCommit(next);
  };

  const onCompositionStart = () => {
    composing.current = true;
    cancel();
  };
  const onCompositionEnd = (event: React.CompositionEvent<HTMLInputElement>) => {
    composing.current = false;
    change(event.currentTarget.value);
  };

  const batchEnabled =
    schema !== undefined && batchSearch !== undefined && batchSearch.fields.length > 0;
  const batchLocale = batchSearch?.locale ?? enUSBatchSearch;
  const appliedField = batchSearch?.fields.find(
    (field) => field.id === batchSearch.filter?.id,
  );
  const batchHint = batchSearch?.filter
    ? `${batchLocale.edit(appliedField?.label ?? batchSearch.filter.id, batchSearch.filter.value.length)} · ${batchLocale.hint}`
    : batchLocale.hint;
  const maxItems = batchSearch?.maxItems ?? 2000;
  if (!Number.isSafeInteger(maxItems) || maxItems < 1) {
    throw new RangeError('batchSearch.maxItems must be a positive safe integer');
  }
  const openBatchSearch = () => {
    if (composing.current) return;
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancel();
    if (searchEnabled) commit(valueRef.current);
    setBatchOpen(true);
  };
  useImperativeHandle(openRef, () => openBatchSearch);
  const appliedBatch =
    batchEnabled && batchSearch.filter
      ? {
          label: batchLocale.edit(
            appliedField?.label ?? batchSearch.filter.id,
            batchSearch.filter.value.length,
          ),
          onRemove: () => {
            cancel();
            if (searchEnabled) commit(valueRef.current);
            batchSearch.onFilterChange(null);
          },
        }
      : undefined;
  const hasPrefix = prefix != null && prefix !== false;
  const grouped = batchEnabled || hasPrefix;
  const SearchInput = grouped ? InputGroupInput : Input;
  const searchControl = (
    <SearchInput
      ref={inputRef}
      value={value}
      onChange={(event) => change(event.target.value)}
      onCompositionStart={onCompositionStart}
      onCompositionEnd={onCompositionEnd}
      placeholder={searchEnabled ? placeholder : batchLocale.hint}
      readOnly={!searchEnabled}
      onDoubleClick={batchEnabled ? openBatchSearch : undefined}
      onKeyDown={(event) => {
        if (batchEnabled && event.altKey && event.key === 'Enter') {
          event.preventDefault();
          openBatchSearch();
        }
      }}
      aria-describedby={batchEnabled ? hintId : undefined}
      title={batchEnabled ? batchHint : undefined}
      aria-haspopup={batchEnabled ? 'dialog' : undefined}
      aria-keyshortcuts={batchEnabled ? 'Alt+Enter' : undefined}
      className={grouped ? 'h-8 min-w-16' : 'h-8 w-48 shrink-0'}
    />
  );
  const defaultInput = grouped ? (
    <InputGroup className={`h-8 max-w-full shrink-0 ${appliedBatch ? 'w-80' : 'w-48'}`}>
      {hasPrefix && (
        <InputGroupAddon align="inline-start" className="shrink-0 py-0">
          {prefix}
        </InputGroupAddon>
      )}
      {searchControl}
      {appliedBatch ? (
        <InputGroupAddon align="inline-end" className="shrink-0 gap-0 py-0 pr-1">
          <div className="bg-muted text-foreground flex items-center rounded-sm">
            <InputGroupButton
              size="xs"
              className="max-w-36 text-xs"
              title={appliedBatch.label}
              aria-haspopup="dialog"
              onClick={openBatchSearch}
            >
              <span className="truncate">{appliedBatch.label}</span>
            </InputGroupButton>
            <InputGroupButton
              size="icon-xs"
              aria-label={batchLocale.remove}
              onClick={(event) => {
                const searchElement = event.currentTarget
                  .closest('[data-slot="input-group"]')
                  ?.querySelector('input');
                appliedBatch.onRemove();
                searchElement?.focus();
              }}
            >
              <X aria-hidden="true" />
            </InputGroupButton>
          </div>
        </InputGroupAddon>
      ) : batchEnabled ? (
        <InputGroupAddon align="inline-end" className="shrink-0 py-0">
          <InputGroupButton
            size="icon-xs"
            aria-label={batchLocale.title}
            title={batchLocale.title}
            aria-haspopup="dialog"
            onClick={openBatchSearch}
          >
            <List aria-hidden="true" />
          </InputGroupButton>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  ) : (
    searchControl
  );
  const input = render
    ? render({
        value,
        onValueChange: change,
        onCompositionStart,
        onCompositionEnd,
        placeholder,
        resetPage: () => {
          cancel();
          commit(valueRef.current, true);
        },
        ...(batchEnabled
          ? { openBatchSearch, batchSearchHint: batchHint, batchSearch: appliedBatch }
          : {}),
      })
    : defaultInput;

  if (!batchEnabled) return input;
  return (
    <>
      {input}
      <span id={hintId} className="sr-only">
        {batchHint}
      </span>
      <BatchSearchDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        fields={batchSearch.fields}
        schema={schema}
        filter={batchSearch.filter}
        maxItems={maxItems}
        onApply={batchSearch.onFilterChange}
        locale={batchLocale}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
          else inputRef.current?.focus();
        }}
      />
    </>
  );
}
