import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDelayedVisibility } from '../../src/hooks/use-delayed-visibility';

const OUT_DELAY = 1000;
const FADE_DURATION = 300;
const BEFORE_OUT_DELAY_FINISHES = 999;

describe('useDelayedVisibility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  it('keeps mounted during outDelay and unmounts after fadeDuration', () => {
    const { result, rerender } = renderHook(
      ({ show }) =>
        useDelayedVisibility({
          show,
          outDelay: OUT_DELAY,
          fadeDuration: FADE_DURATION,
        }),
      {
        initialProps: {
          show: true,
        },
      },
    );

    expect(result.current).toEqual({
      mounted: true,
      visible: true,
    });

    rerender({
      show: false,
    });

    act(() => {
      vi.advanceTimersByTime(OUT_DELAY);
    });

    expect(result.current).toEqual({
      mounted: true,
      visible: false,
    });

    act(() => {
      vi.advanceTimersByTime(FADE_DURATION);
    });

    expect(result.current).toEqual({
      mounted: false,
      visible: false,
    });
  });

  it('does not unmount when show becomes true again before outDelay finishes', () => {
    const { result, rerender } = renderHook(
      ({ show }) =>
        useDelayedVisibility({
          show,
          outDelay: OUT_DELAY,
          fadeDuration: FADE_DURATION,
        }),
      {
        initialProps: {
          show: true,
        },
      },
    );

    rerender({
      show: false,
    });

    act(() => {
      vi.advanceTimersByTime(BEFORE_OUT_DELAY_FINISHES);
    });

    rerender({
      show: true,
    });

    act(() => {
      vi.advanceTimersByTime(OUT_DELAY + FADE_DURATION);
    });

    expect(result.current).toEqual({
      mounted: true,
      visible: true,
    });
  });
});
