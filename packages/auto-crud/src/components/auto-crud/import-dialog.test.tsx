import { TextDecoder } from 'node:util';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseCSV } from '@/lib/import';
import { enUS, zhCN } from '@/i18n/locale';
import { ImportDialog } from './import-dialog';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function bytes(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

describe('import template download', () => {
  it.each([
    { columns: ['客户名称', '备注'], locale: zhCN.importDialog },
    { columns: ['Customer name', 'Note'], locale: enUS.importDialog },
    { columns: ['顧客名', '備考'], locale: enUS.importDialog },
    { columns: ['名称,别名', '备注"说明'], locale: zhCN.importDialog },
  ])('downloads UTF-8 with BOM and preserves $columns', async ({ columns, locale }) => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:template');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    render(
      <ImportDialog
        open
        onOpenChange={() => {}}
        onImport={vi.fn()}
        columns={columns}
        locale={locale}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: locale.downloadTemplate }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0]![0] as Blob;
    const content = await bytes(blob);
    expect(Array.from(content.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(blob.type).toBe('text/csv;charset=utf-8;');
    const parsed = parseCSV(new TextDecoder().decode(content));
    expect(parsed.headers).toEqual(columns);
    expect(parsed.rows).toEqual([]);
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe(
      'import-template.csv',
    );
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:template');
  });

  it('does not offer a template without columns', () => {
    render(<ImportDialog open onOpenChange={() => {}} onImport={vi.fn()} columns={[]} />);
    expect(
      screen.queryByRole('button', { name: zhCN.importDialog.downloadTemplate }),
    ).toBeNull();
  });
});
