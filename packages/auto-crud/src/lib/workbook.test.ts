import ExcelJS from 'exceljs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildWorkbookBytes, exportWorkbook, type WorkbookSheet } from './workbook';

const sheet = (overrides: Partial<WorkbookSheet> = {}): WorkbookSheet => ({
  name: '订单',
  headers: ['编号'],
  rows: [['001']],
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('XLSX workbook bytes', () => {
  it('roundtrips two localized sheets with literal text, numeric cells, blanks and wrapped newlines', async () => {
    const text = [
      '0000123',
      '123456789012345678901234567890',
      '=SUM(A1:A2)',
      '+1',
      '-1',
      '@name',
    ];
    const bytes = await buildWorkbookBytes([
      sheet({
        name: '订单明细',
        headers: [
          '编号',
          '长编号',
          '公式文本',
          '加号',
          '减号',
          '引用文本',
          '数量',
          '空值',
          '缺失值',
          '多行',
        ],
        rows: [[...text, 123.5, null, undefined, '甲\n乙']],
      }),
      sheet({ name: '汇总', headers: ['合计'], rows: [[42]] }),
    ]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes);
    expect(workbook.worksheets.map((item) => item.name)).toEqual(['订单明细', '汇总']);
    const row = workbook.worksheets[0]!.getRow(2);
    text.forEach((value, index) => {
      expect(row.getCell(index + 1).value).toBe(value);
      expect(row.getCell(index + 1).type).toBe(ExcelJS.ValueType.String);
    });
    expect(row.getCell(7).value).toBe(123.5);
    expect(row.getCell(7).type).toBe(ExcelJS.ValueType.Number);
    expect(row.getCell(8).value).toBeNull();
    expect(row.getCell(9).value).toBeNull();
    expect(row.getCell(10).value).toBe('甲\n乙');
    expect(row.getCell(10).alignment.wrapText).toBe(true);
    expect(workbook.worksheets[1]!.getCell('A2').value).toBe(42);
  });

  it('applies column number formats only to numbers while preserving literal IDs and amount errors', async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      await buildWorkbookBytes([
        sheet({
          headers: ['编号', '金额', '数量'],
          numberFormats: ['0.00', '0.00', undefined],
          rows: [
            ['0000123', 12, 3],
            ['001', 'no amount/error', 0],
            ['002', null, undefined],
          ],
        }),
      ]),
    );
    const worksheet = workbook.worksheets[0]!;
    expect(worksheet.getCell('B2').value).toBe(12);
    expect(worksheet.getCell('B2').type).toBe(ExcelJS.ValueType.Number);
    expect(worksheet.getCell('B2').numFmt).toBe('0.00');
    expect(worksheet.getCell('A2').value).toBe('0000123');
    expect(worksheet.getCell('A2').type).toBe(ExcelJS.ValueType.String);
    expect(worksheet.getCell('A2').numFmt).toBeUndefined();
    expect(worksheet.getCell('B3').value).toBe('no amount/error');
    expect(worksheet.getCell('B3').type).toBe(ExcelJS.ValueType.String);
    expect(worksheet.getCell('B3').numFmt).toBeUndefined();
    expect(worksheet.getCell('B1').numFmt).toBeUndefined();
    expect(worksheet.getCell('B4').value).toBeNull();
    expect(worksheet.getCell('B4').numFmt).toBeUndefined();
    expect(worksheet.getCell('C2').value).toBe(3);
    expect(worksheet.getCell('C2').numFmt).toBeUndefined();
  });

  it('preserves exactly the supported cell length and line-feed limits', async () => {
    const values = ['x'.repeat(32_767), '\n'.repeat(253)];
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await buildWorkbookBytes([sheet({ rows: [values] })]));
    expect(workbook.worksheets[0]!.getCell('A2').value).toBe(values[0]);
    expect(workbook.worksheets[0]!.getCell('B2').value).toBe(values[1]);
  });

  it.each([
    ['data cell length', () => sheet({ rows: [['x'.repeat(32_768)]] }), /32767/],
    ['header cell length', () => sheet({ headers: ['x'.repeat(32_768)] }), /32767/],
    ['cell line feeds', () => sheet({ rows: [['\n'.repeat(254)]] }), /253/],
    ['rows including header', () => sheet({ rows: new Array(1_048_576) }), /1048576/],
    ['header columns', () => sheet({ headers: new Array(16_385) }), /16384/],
    ['data columns', () => sheet({ rows: [new Array(16_385)] }), /16384/],
    ['nonfinite numbers', () => sheet({ rows: [[Infinity]] }), /finite/],
    ['long sheet names', () => sheet({ name: 'x'.repeat(32) }), /names/],
  ] as const)(
    'rejects %s without truncating or writing',
    async (_name, create, message) => {
      const write = vi.spyOn(ExcelJS.Workbook.prototype, 'addWorksheet');
      await expect(buildWorkbookBytes([create()])).rejects.toThrow(message);
      expect(write).not.toHaveBeenCalled();
    },
  );

  it('rejects duplicate sheet names without renaming them', async () => {
    await expect(
      buildWorkbookBytes([sheet({ name: 'Report' }), sheet({ name: 'report' })]),
    ).rejects.toThrow('unique');
  });
});

describe('XLSX download', () => {
  function downloadMocks() {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:workbook');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = createObjectURL;
        static revokeObjectURL = revokeObjectURL;
      },
    );
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    return { createObjectURL, revokeObjectURL, click };
  }

  it('downloads a real XLSX Blob, removes the anchor and revokes only on the scheduled tick', async () => {
    const { createObjectURL, revokeObjectURL, click } = downloadMocks();
    let filename: string | undefined;
    click.mockImplementation(function (this: HTMLAnchorElement) {
      filename = this.download;
    });
    await exportWorkbook([sheet()], { filename: '订单.xlsx' });
    expect(filename).toBe('订单.xlsx');
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    const blob = createObjectURL.mock.calls[0]![0];
    expect(blob.type).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes);
    expect(workbook.worksheets[0]!.getCell('A2').value).toBe('001');
    await vi.waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:workbook'));
  });

  it('rejects failed generation without creating a download URL', async () => {
    const { createObjectURL, click } = downloadMocks();
    await expect(
      exportWorkbook([sheet({ rows: [['x'.repeat(32_768)]] })], { filename: 'bad' }),
    ).rejects.toThrow(/32767/);
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(click).not.toHaveBeenCalled();
  });

  it('propagates download errors and still schedules Blob cleanup', async () => {
    const { click, revokeObjectURL } = downloadMocks();
    click.mockImplementation(() => {
      throw new Error('Download failed');
    });
    await expect(exportWorkbook([sheet()], { filename: 'orders' })).rejects.toThrow(
      'Download failed',
    );
    expect(revokeObjectURL).not.toHaveBeenCalled();
    expect(document.querySelector('a[download]')).toBeNull();
    await vi.waitFor(() => expect(revokeObjectURL).toHaveBeenCalledOnce());
  });
});
