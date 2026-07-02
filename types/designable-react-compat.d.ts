import type { ReactElement, ReactNode } from 'react';

declare global {
  namespace React {
    interface FunctionComponent<P = {}> {
      (
        props: P & {
          children?: any;
        },
        context?: any,
      ): ReactNode | Promise<ReactNode>;
      defaultProps?: Partial<P>;
    }

    function useRef<T = undefined>(): RefObject<T | undefined>;

    type ReactChild = ReactElement | string | number;
  }

  namespace JSX {
    type Element = ReactElement;
  }
}
