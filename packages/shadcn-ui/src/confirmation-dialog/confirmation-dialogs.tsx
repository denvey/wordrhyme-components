import type { ConfirmationDialogProps } from './ConfirmationDialog';
import NiceModal from '@ebay/nice-modal-react';
import ConfirmationDialog from './ConfirmationDialog';

interface ConfirmDialog extends ConfirmationDialogProps {}

export async function showConfirmDialog(props: ConfirmDialog): Promise<boolean> {
  const id = crypto.randomUUID();
  NiceModal.register(id, ConfirmationDialog);
  return NiceModal.show<boolean, ConfirmDialog>(id, props);
}

export const confirmDialog = {
  show: async (props: ConfirmDialog) => ConfirmationDialog.show<boolean>(props),
  hide: ConfirmationDialog.hide,
  remove: ConfirmationDialog.remove,
};
