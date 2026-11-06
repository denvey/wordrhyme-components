import type { BatchSearchIssue } from '@/lib/batch-search';

export interface BatchSearchLocale {
  title: string;
  description: string;
  hint: string;
  field: string;
  searchFields: string;
  emptyFields: string;
  exact: string;
  inputHint: string;
  placeholder: string;
  count: (count: number, max: number) => string;
  duplicates: (count: number) => string;
  issue: (issue: BatchSearchIssue) => string;
  clear: string;
  cancel: string;
  apply: (count: number) => string;
  edit: (label: string, count: number) => string;
  remove: string;
  session: string;
  combination: string;
}

export const enUSBatchSearch: BatchSearchLocale = {
  title: 'Batch search',
  description: 'Paste a list of values to find matching records.',
  hint: 'Double-click to batch search · Alt+Enter',
  field: 'Search field',
  searchFields: 'Search fields...',
  emptyFields: 'No matching fields.',
  exact: 'Exact match',
  inputHint: 'One value per line. Paste a single column from Excel.',
  placeholder: 'Enter one value per line',
  count: (count, max) => `${count} valid values / up to ${max.toLocaleString()}`,
  duplicates: (count) => `${count} duplicates removed`,
  issue: (issue) =>
    issue.type === 'limit'
      ? `Too many values. Enter at most ${issue.maxItems.toLocaleString()} unique values.`
      : `Line(s) ${issue.lines.slice(0, 5).join(', ')}: ${issue.type === 'columns' ? 'paste a single column only.' : 'enter valid values for this field.'}`,
  clear: 'Clear',
  cancel: 'Cancel',
  apply: (count) => (count ? `Search ${count} values` : 'Search'),
  edit: (label, count) => `${label} · ${count} values`,
  remove: 'Remove batch filter',
  session: 'This page only. Batch values are excluded from shared links and saved views.',
  combination: 'Uses the current AND / OR filter setting and preserves sorting.',
};

export const zhCNBatchSearch: BatchSearchLocale = {
  title: '批量查询',
  description: '粘贴一组查询值，快速找到对应记录。',
  hint: '双击批量查询 · Alt+Enter',
  field: '查询字段',
  searchFields: '搜索字段...',
  emptyFields: '没有匹配的字段。',
  exact: '精确匹配',
  inputHint: '每行一个值，支持从 Excel 复制单列内容。',
  placeholder: '请输入查询值，每行一个',
  count: (count, max) => `有效 ${count} 项 / 最多 ${max.toLocaleString()} 项`,
  duplicates: (count) => `已去重 ${count} 项`,
  issue: (issue) =>
    issue.type === 'limit'
      ? `最多支持 ${issue.maxItems.toLocaleString()} 个有效值，请减少后查询。`
      : `第 ${issue.lines.slice(0, 5).join('、')} 行${issue.type === 'columns' ? '包含多列内容，请只复制 Excel 中的一列。' : '不符合字段格式，请检查后重新输入。'}`,
  clear: '清空',
  cancel: '取消',
  apply: (count) => (count ? `查询 ${count} 项` : '查询'),
  edit: (label, count) => `${label} · ${count} 项`,
  remove: '移除批量筛选条件',
  session: '仅本次页面有效；批量值不会保存在分享链接或视图中。',
  combination: '沿用当前筛选的 AND / OR 组合方式，并保留表格排序。',
};
