import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setSearchParams } from '@/hooks/use-url-state';
import { AutoTableSearch } from './auto-table-search';

describe('AutoTable global search debounce', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/orders');
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
  const type = (value: string) =>
    fireEvent.change(screen.getByRole('textbox'), { target: { value } });
  const search = () => new URLSearchParams(window.location.search).get('search');

  it('shows input immediately and submits only the final keyword after 300ms', () => {
    render(<AutoTableSearch />);
    type('2');
    advance(200);
    type('2022');
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('2022');
    advance(299);
    expect(search()).toBeNull();
    advance(1);
    expect(search()).toBe('2022');
  });

  it('commits search and the configured page atomically, preserving other state', () => {
    window.history.replaceState(
      null,
      '',
      '/orders?ordersPage=4&page=7&status=paid&sort=id.desc',
    );
    render(<AutoTableSearch pageKey="ordersPage" />);
    const snapshots: string[] = [];
    const observe = () => snapshots.push(window.location.search);
    window.addEventListener('urlchange', observe);
    try {
      type('2022');
      advance(300);
      expect(snapshots).toHaveLength(1);
      const params = new URLSearchParams(snapshots[0]);
      expect(params.get('search')).toBe('2022');
      expect(params.has('ordersPage')).toBe(false);
      expect(params.get('page')).toBe('7');
      expect(params.get('status')).toBe('paid');
      expect(params.get('sort')).toBe('id.desc');
    } finally {
      window.removeEventListener('urlchange', observe);
    }
  });

  it('clears immediately and cancels the pending keyword', () => {
    window.history.replaceState(null, '', '/orders?search=old&page=4');
    render(<AutoTableSearch />);
    type('2022');
    advance(100);
    type('');
    expect(search()).toBeNull();
    expect(new URLSearchParams(window.location.search).has('page')).toBe(false);
    advance(500);
    expect(search()).toBeNull();
  });

  it('supports immediate queries for consumers that configure zero delay', () => {
    render(<AutoTableSearch debounceMs={0} placeholder="Find orders" />);
    expect(screen.getByPlaceholderText('Find orders')).toBeTruthy();
    type('2022');
    expect(search()).toBe('2022');
  });

  it('supports a consumer-defined delay', () => {
    render(<AutoTableSearch debounceMs={500} />);
    type('2022');
    advance(499);
    expect(search()).toBeNull();
    advance(1);
    expect(search()).toBe('2022');
  });

  it('waits for IME composition to finish before starting the delay', () => {
    render(<AutoTableSearch />);
    type('pending');
    fireEvent.compositionStart(screen.getByRole('textbox'));
    type('dian');
    advance(600);
    expect(search()).toBeNull();
    type('店铺');
    fireEvent.compositionEnd(screen.getByRole('textbox'));
    advance(299);
    expect(search()).toBeNull();
    advance(1);
    expect(search()).toBe('店铺');
  });

  it.each(['popstate', 'urlchange'])(
    'restores URL state and cancels pending input on %s',
    (event) => {
      render(<AutoTableSearch />);
      type('2022');
      act(() => {
        window.history.replaceState(null, '', '/orders?search=restored&page=3');
        window.dispatchEvent(new Event(event));
      });
      expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('restored');
      advance(500);
      expect(search()).toBe('restored');
      expect(new URLSearchParams(window.location.search).get('page')).toBe('3');
    },
  );

  it('cancels pending input when navigation leaves the committed keyword unchanged', () => {
    window.history.replaceState(null, '', '/orders?search=old');
    render(<AutoTableSearch />);
    type('2022');
    act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    advance(500);
    expect(search()).toBe('old');
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('old');
  });

  it('preserves updates made by other controls instead of overwriting their URL state', () => {
    render(<AutoTableSearch />);
    type('2022');
    act(() => setSearchParams(new URLSearchParams('status=paid&page=2')));
    advance(500);
    expect(search()).toBeNull();
    expect(new URLSearchParams(window.location.search).get('status')).toBe('paid');
    expect(new URLSearchParams(window.location.search).get('page')).toBe('2');
  });

  it('cancels pending input on unmount', () => {
    const { unmount } = render(<AutoTableSearch />);
    type('2022');
    unmount();
    advance(500);
    expect(search()).toBeNull();
  });

  it('cancels pending input when the delay changes', () => {
    const { rerender } = render(<AutoTableSearch />);
    type('2022');
    rerender(<AutoTableSearch debounceMs={500} />);
    advance(600);
    expect(search()).toBeNull();
    type('2244');
    advance(500);
    expect(search()).toBe('2244');
  });
});
