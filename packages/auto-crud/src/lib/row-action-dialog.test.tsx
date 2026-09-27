import type { RowActionDialogProps } from './row-action-dialog';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { useRowActionDialog } from './row-action-dialog';

afterEach(cleanup);

it('starts a fresh session on replacement and ignores the previous session dismissal', () => {
  let dismissPrevious: (() => void) | undefined;
  const release = vi.fn();
  function Form({ onDismiss }: RowActionDialogProps) {
    const [draft, setDraft] = React.useState('');
    React.useEffect(() => () => release(), []);
    return (
      <>
        <input
          aria-label="Draft"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          onClick={() => {
            dismissPrevious = onDismiss;
          }}
        >
          Remember dismissal
        </button>
      </>
    );
  }
  function Host() {
    const { openComponent, dialog } = useRowActionDialog();
    return (
      <>
        <button
          onClick={() => openComponent(<Form open={false} onOpenChange={() => {}} />)}
        >
          Open
        </button>
        {dialog}
      </>
    );
  }
  const { unmount } = render(<Host />);
  fireEvent.click(screen.getByText('Open'));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'old draft' } });
  fireEvent.click(screen.getByText('Remember dismissal'));
  fireEvent.click(screen.getByText('Open'));
  expect(screen.getByRole<HTMLInputElement>('textbox').value).toBe('');
  expect(release).toHaveBeenCalledOnce();
  dismissPrevious!();
  expect(screen.getByRole('textbox')).toBeTruthy();
  unmount();
  expect(release).toHaveBeenCalledTimes(2);
});
