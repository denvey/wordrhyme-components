'use client';

import * as React from 'react';

export interface RowActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss?: () => void;
}

export interface RowActionDialogHost {
  /** Opens a fresh dialog session. The host owns open, onOpenChange and onDismiss. */
  showDialog: <P extends RowActionDialogProps>(dialog: React.ReactElement<P>) => void;
}

/** Keep custom dialogs at table level, independently of the source row's lifetime. */
export function useRowActionDialog() {
  const [dialog, setDialog] = React.useState<React.ReactElement | null>(null);
  const session = React.useRef(0);
  const showDialog: RowActionDialogHost['showDialog'] = React.useCallback(
    (next: React.ReactElement<RowActionDialogProps>) => {
      const id = ++session.current;
      const dismiss = () => {
        // An old async action must not dismiss a newer dialog.
        if (session.current === id) setDialog(null);
      };
      setDialog(
        React.cloneElement(next, {
          key: id,
          open: true,
          onOpenChange: (open: boolean) => {
            if (!open) dismiss();
          },
          onDismiss: dismiss,
        }),
      );
    },
    [],
  );
  return { showDialog, dialog };
}
