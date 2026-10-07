/**
 * CSV/JSON 导入解析工具（零依赖实现）
 */

import { z } from 'zod';
import { parseZodField } from '@/lib/schema-bridge/zod-to-columns';

export interface ParsedImportData {
  headers: string[];
  rows: Record<string, unknown>[];
  format: 'csv' | 'json';
}

/**
 * 解析 CSV 字符串为对象数组
 * 支持：引号包裹、逗号转义、换行符、空值
 */
export function parseCSV(content: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const lines = parseCSVLines(content);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0]!;
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    // 跳过空行
    if (line.length === 1 && line[0] === '') continue;

    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j]!;
      row[header] = line[j] ?? '';
    }
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * 将 CSV 文本解析为二维数组（处理引号转义）
 */
function parseCSVLines(text: string): string[][] {
  const result: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i++; // 跳过转义引号
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(current);
        current = '';
      } else if (char === '\r' && next === '\n') {
        row.push(current);
        current = '';
        result.push(row);
        row = [];
        i++; // 跳过 \n
      } else if (char === '\n') {
        row.push(current);
        current = '';
        result.push(row);
        row = [];
      } else {
        current += char;
      }
    }
  }

  // 最后一行
  if (current !== '' || row.length > 0) {
    row.push(current);
    result.push(row);
  }

  return result;
}

/**
 * 解析 JSON 字符串为对象数组
 * 支持 JSON 数组或 { data: [...] } 格式
 */
export function parseJSON(content: string): Record<string, unknown>[] {
  const parsed = JSON.parse(content);

  if (Array.isArray(parsed)) {
    return parsed;
  }

  // 支持 { data: [...] } 格式
  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.data)) {
    return parsed.data;
  }

  throw new Error('Invalid JSON format: expected an array or { data: [...] } object');
}

/**
 * 统一解析入口：根据文件扩展名自动选择解析器
 */
export async function parseImportFile(file: File): Promise<ParsedImportData> {
  const content = await file.text();
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'json') {
    const rows = parseJSON(content);
    const headers = rows.length > 0 ? Object.keys(rows[0] as object) : [];
    return { headers, rows, format: 'json' };
  }

  // 默认当作 CSV
  const { headers, rows } = parseCSV(content);
  return { headers, rows, format: 'csv' };
}

/**
 * 生成 CSV 模板（仅包含表头，用于下载空模板）
 */
export function generateCSVTemplate(headers: string[]): string {
  return headers.map((h) => escapeCSVField(h)).join(',') + '\n';
}

/**
 * 将数据数组转换为 CSV 字符串
 */
export function dataToCSV<T extends Record<string, unknown>>(
  data: T[],
  opts: {
    headers?: string[];
    excludeColumns?: string[];
  } = {},
): string {
  if (data.length === 0) return '';

  const allHeaders = Object.keys(data[0] as object);
  const headers = (opts.headers ?? allHeaders).filter(
    (h) => !opts.excludeColumns?.includes(h),
  );

  const headerLine = headers.map((h) => escapeCSVField(h)).join(',');
  const rows = data.map((row) =>
    headers.map((h) => escapeCSVField(String(row[h] ?? ''))).join(','),
  );

  return [headerLine, ...rows].join('\n');
}

function escapeCSVField(field: string): string {
  if (
    field.includes(',') ||
    field.includes('"') ||
    field.includes('\n') ||
    field.includes('\r')
  ) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * 根据 Zod Schema 将 CSV 解析出的 string 值转换为正确类型
 *
 * CSV 解析后所有值都是 string，需要根据 schema 字段类型进行转换：
 * - number: parseFloat
 * - boolean: "true"/"1"/"yes" → true, 其他 → false
 * - date: new Date(value)
 * - 空字符串 → undefined（让 schema 默认值生效）
 */
export function coerceRowValues<T extends z.ZodObject<z.ZodRawShape>>(
  rows: Record<string, unknown>[],
  schema: T,
): Record<string, unknown>[] {
  const shape = schema.shape;

  // 预计算字段类型映射
  const fieldTypes = new Map<string, string>();
  for (const [key, fieldSchema] of Object.entries(shape)) {
    const parsed = parseZodField(fieldSchema as z.ZodType);
    fieldTypes.set(key, parsed.type);
  }

  return rows.map((row) => {
    const coerced: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      // 不在 schema 中的字段原样保留
      const type = fieldTypes.get(key);
      if (!type) {
        coerced[key] = value;
        continue;
      }

      // 空字符串 → undefined（让 schema 默认值生效，或被 optional 处理）
      if (value === '' || value === null || value === undefined) {
        coerced[key] = undefined;
        continue;
      }

      // 已经是正确类型则跳过转换
      if (typeof value !== 'string') {
        coerced[key] = value;
        continue;
      }

      switch (type) {
        case 'number': {
          const num = parseFloat(value);
          coerced[key] = isNaN(num) ? undefined : num;
          break;
        }
        case 'boolean': {
          const lower = value.toLowerCase().trim();
          coerced[key] = lower === 'true' || lower === '1' || lower === 'yes';
          break;
        }
        case 'date': {
          const date = new Date(value);
          coerced[key] = isNaN(date.getTime()) ? undefined : date;
          break;
        }
        default:
          coerced[key] = value;
      }
    }
    return coerced;
  });
}
