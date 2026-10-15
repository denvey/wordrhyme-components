export interface WorkbookSheet {
  name: string;
  headers: string[];
  /** Excel formats by header index; applied only to numeric cells. */
  numberFormats?: (string | undefined)[];
  rows: (string | number | null | undefined)[][];
}

const MAX_ROWS = 1_048_576;
const MAX_COLUMNS = 16_384;
const MAX_CELL_LENGTH = 32_767;
const MAX_LINE_FEEDS = 253;

function validateCell(value: string | number | null | undefined): void {
  if (typeof value === 'string') {
    if (value.length > MAX_CELL_LENGTH) {
      throw new RangeError(`Excel cells cannot exceed ${MAX_CELL_LENGTH} characters.`);
    }
    if ((value.match(/\n/g)?.length ?? 0) > MAX_LINE_FEEDS) {
      throw new RangeError(`Excel cells cannot exceed ${MAX_LINE_FEEDS} line feeds.`);
    }
  } else if (value != null && (typeof value !== 'number' || !Number.isFinite(value))) {
    throw new TypeError('Workbook cells must contain text, finite numbers, or null.');
  }
}

function validateSheets(sheets: WorkbookSheet[]): void {
  if (sheets.length === 0) throw new Error('A workbook needs at least one sheet.');
  const names = new Set<string>();
  for (const sheet of sheets) {
    // ExcelJS truncates long names; reject instead of silently changing caller data.
    if (
      !sheet.name ||
      sheet.name.length > 31 ||
      /[*?:\\/\[\]]/.test(sheet.name) ||
      sheet.name.startsWith("'") ||
      sheet.name.endsWith("'")
    ) {
      throw new Error('Worksheet names must be valid Excel names of 1–31 characters.');
    }
    const name = sheet.name.toLowerCase();
    if (names.has(name)) throw new Error('Worksheet names must be unique.');
    names.add(name);
    // The header occupies the first worksheet row.
    if (sheet.rows.length + 1 > MAX_ROWS) {
      throw new RangeError(
        `Excel worksheets cannot exceed ${MAX_ROWS} rows including headers.`,
      );
    }
    if (sheet.headers.length > MAX_COLUMNS) {
      throw new RangeError(`Excel worksheets cannot exceed ${MAX_COLUMNS} columns.`);
    }
    sheet.headers.forEach(validateCell);
    for (const row of sheet.rows) {
      if (row.length > MAX_COLUMNS) {
        throw new RangeError(`Excel worksheets cannot exceed ${MAX_COLUMNS} columns.`);
      }
      row.forEach(validateCell);
    }
  }
}

/** Internal byte builder, exported from this module for real workbook roundtrip tests. */
export async function buildWorkbookBytes(sheets: WorkbookSheet[]): Promise<ArrayBuffer> {
  validateSheets(sheets);
  // Resolve ExcelJS's documented browser mapping in consumer bundlers, only on demand.
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);
    const append = (values: (string | number | null | undefined)[]) => {
      const row = worksheet.addRow(values.map((value) => value ?? null));
      row.eachCell((cell, column) => {
        const numberFormat = sheet.numberFormats?.[column - 1];
        if (typeof cell.value === 'number' && numberFormat !== undefined) {
          cell.numFmt = numberFormat;
        }
        if (typeof cell.value === 'string' && /[\r\n]/.test(cell.value)) {
          cell.alignment = { wrapText: true };
        }
      });
    };
    append(sheet.headers);
    sheet.rows.forEach(append);
  }
  return new Uint8Array(await workbook.xlsx.writeBuffer()).buffer;
}

/** Download a real XLSX workbook. Errors reject; no CSV or raw-value fallback. */
export async function exportWorkbook(
  sheets: WorkbookSheet[],
  { filename }: { filename: string },
): Promise<void> {
  const bytes = await buildWorkbookBytes(sheets);
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  try {
    link.href = url;
    link.download = /\.xlsx$/i.test(filename) ? filename : `${filename}.xlsx`;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    // Give the browser a task to consume the URL before releasing its Blob.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
