import { useEffect, useState } from 'react';

const DEFAULT_DELAY = 0;

export interface UseDelayedVisibilityOptions {
  /**
   * Whether the target should be shown.
   */
  show: boolean;
  /**
   * Delay in milliseconds before showing.
   * @default 0
   */
  inDelay?: number;
  /**
   * Delay in milliseconds before hiding.
   * @default 0
   */
  outDelay?: number;
  /**
   * Time in milliseconds to keep mounted after hiding starts.
   * @default 0
   */
  fadeDuration?: number;
}

export interface UseDelayedVisibilityResult {
  /**
   * Whether the target should be rendered.
   */
  mounted: boolean;
  /**
   * Whether the target should be visually visible.
   */
  visible: boolean;
}

export function useDelayedVisibility(
  options: UseDelayedVisibilityOptions,
): UseDelayedVisibilityResult {
  const {
    show,
    inDelay = DEFAULT_DELAY,
    outDelay = DEFAULT_DELAY,
    fadeDuration = DEFAULT_DELAY,
  } = options;

  const hasInDelay = inDelay > 0;

  const [mounted, setMounted] = useState(() => !hasInDelay && show);
  const [visible, setVisible] = useState(() => !hasInDelay && show);

  useEffect(() => {
    const timeoutIds: Array<ReturnType<typeof setTimeout>> = [];
    const animationFrameIds: number[] = [];

    const scheduleTimeout = (callback: () => void, timeout: number) => {
      const timeoutId = setTimeout(callback, timeout);
      timeoutIds.push(timeoutId);
    };

    const scheduleAnimationFrame = (callback: FrameRequestCallback) => {
      const animationFrameId = requestAnimationFrame(callback);
      animationFrameIds.push(animationFrameId);
    };

    if (show) {
      /*
       * Always mount via setTimeout + double-RAF so subsequent show=true
       * toggles get a fade-in transition. When show=true on the first render
       * with no inDelay, the lazy state initializer already made this visible.
       */
      scheduleTimeout(() => {
        setMounted(true);
        scheduleAnimationFrame(() => {
          scheduleAnimationFrame(() => {
            setVisible(true);
          });
        });
      }, inDelay);
    } else {
      scheduleTimeout(
        () => {
          setVisible(false);

          scheduleTimeout(
            () => {
              setMounted(false);
            },
            mounted ? fadeDuration : DEFAULT_DELAY,
          );
        },
        mounted ? outDelay : DEFAULT_DELAY,
      );
    }

    return () => {
      timeoutIds.forEach((timeoutId) => clearTimeout(timeoutId));
      animationFrameIds.forEach((animationFrameId) => {
        cancelAnimationFrame(animationFrameId);
      });
    };
  }, [show, inDelay, outDelay, fadeDuration, mounted]);

  return {
    mounted,
    visible,
  };
}
