import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseImportFile } from '@/lib/import';
import { zhCN } from '@/i18n/locale';
import { ImportDialog } from './import-dialog';

vi.mock('@/lib/import', () => ({
  parseImportFile: vi.fn(),
  generateCSVTemplate: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('import dialog layout', () => {
  it('keeps template actions outside the upload body', () => {
    render(
      <ImportDialog open columns={['name']} onOpenChange={() => {}} onImport={vi.fn()} />,
    );
    const dialog = screen.getByRole('dialog');
    const button = screen.getByRole('button', {
      name: zhCN.importDialog.downloadTemplate,
    });
    expect(button.closest('[data-slot="dialog-footer"]')?.parentElement).toBe(dialog);
  });

  it('keeps actions outside wide previews and long error lists while preserving the import flow', async () => {
    const headers = Array.from({ length: 40 }, (_, index) => `Column ${index}`);
    const rows = Array.from({ length: 12 }, () =>
      Object.fromEntries(headers.map((name) => [name, 'Example'])),
    );
    vi.mocked(parseImportFile).mockResolvedValue({ headers, rows, format: 'csv' });
    const result = {
      success: 0,
      skipped: 0,
      failed: rows.map((_, row) => ({ row, errors: ['Duplicate email'] })),
    };
    const onImport = vi.fn().mockResolvedValue(result);
    const onOpenChange = vi.fn();
    render(<ImportDialog open onOpenChange={onOpenChange} onImport={onImport} />);
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [new File(['example'], 'customers.csv')] },
    });

    const confirm = await screen.findByRole('button', {
      name: zhCN.importDialog.confirmImport,
    });
    const dialog = screen.getByRole('dialog');
    const footer = confirm.closest('[data-slot="dialog-footer"]')!;
    const body = footer.previousElementSibling!;
    expect(footer.parentElement).toBe(dialog);
    expect(body.contains(screen.getByRole('table'))).toBe(true);
    expect(body.contains(confirm)).toBe(false);
    expect(dialog.className).toContain('overflow-hidden');
    expect(body.className).toContain('overflow-auto');
    expect(screen.getAllByRole('columnheader')).toHaveLength(41);

    fireEvent.click(confirm);
    const close = await screen.findByRole('button', { name: zhCN.importDialog.close });
    expect(onImport).toHaveBeenCalledWith(rows);
    expect(close.closest('[data-slot="dialog-footer"]')?.parentElement).toBe(dialog);
    expect(body.contains(close)).toBe(false);
    expect(screen.getAllByText('Duplicate email')).toHaveLength(12);
    fireEvent.click(
      screen.getByRole('button', { name: zhCN.importDialog.continueImport }),
    );
    expect(screen.queryByRole('table')).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
