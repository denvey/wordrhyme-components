/**
 * @see https://github.com/mantinedev/mantine/blob/master/packages/@mantine/hooks/src/use-debounced-callback/use-debounced-callback.ts
 */

import * as React from 'react';

import { useCallbackRef } from '@/hooks/use-callback-ref';

export function useDebouncedCallback<T extends (...args: never[]) => unknown>(
  callback: T,
  delay: number,
) {
  const handleCallback = useCallbackRef(callback);
  const debounceTimerRef = React.useRef(0);
  const cancel = React.useCallback(() => {
    window.clearTimeout(debounceTimerRef.current);
  }, []);
  React.useEffect(() => cancel, [cancel, delay]);

  const setValue = React.useCallback(
    (...args: Parameters<T>) => {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = window.setTimeout(() => handleCallback(...args), delay);
    },
    [handleCallback, delay],
  );

  return Object.assign(setValue, { cancel });
}
