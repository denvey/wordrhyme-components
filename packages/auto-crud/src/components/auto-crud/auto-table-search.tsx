'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@wordrhyme/shadcn';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { getUrlParams, setSearchParams } from '@/hooks/use-url-state';

interface AutoTableSearchProps {
  placeholder?: string;
  debounceMs?: number;
  pageKey?: string;
}

export function AutoTableSearch({
  placeholder = '搜索',
  debounceMs = 300,
  pageKey = 'page',
}: AutoTableSearchProps) {
  const [value, setValue] = useState(() => getUrlParams().get('search') ?? '');
  const composing = useRef(false);
  const commit = useCallback(
    (next: string) => {
      const params = getUrlParams();
      if ((params.get('search') ?? '') === next) return;
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
      setValue(getUrlParams().get('search') ?? '');
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
    setValue(next);
    cancel();
    if (composing.current) return;
    if (!next || debounceMs <= 0) commit(next);
    else debouncedCommit(next);
  };

  return (
    <Input
      value={value}
      onChange={(event) => change(event.target.value)}
      onCompositionStart={() => {
        composing.current = true;
        cancel();
      }}
      onCompositionEnd={(event) => {
        composing.current = false;
        change(event.currentTarget.value);
      }}
      placeholder={placeholder}
      className="h-8 w-48 shrink-0"
    />
  );
}
