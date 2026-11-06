'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@wordrhyme/shadcn';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { getUrlParams, setSearchParams } from '@/hooks/use-url-state';
import type { TableSearchConfig } from './auto-table';

interface AutoTableSearchProps extends TableSearchConfig {
  pageKey?: string;
}

export function AutoTableSearch({
  placeholder = '搜索',
  debounceMs = 200,
  pageKey = 'page',
  render,
}: AutoTableSearchProps) {
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

  if (render) {
    return render({
      value,
      onValueChange: change,
      onCompositionStart,
      onCompositionEnd,
      placeholder,
      resetPage: () => {
        cancel();
        commit(valueRef.current, true);
      },
    });
  }

  return (
    <Input
      value={value}
      onChange={(event) => change(event.target.value)}
      onCompositionStart={onCompositionStart}
      onCompositionEnd={onCompositionEnd}
      placeholder={placeholder}
      className="h-8 w-48 shrink-0"
    />
  );
}
