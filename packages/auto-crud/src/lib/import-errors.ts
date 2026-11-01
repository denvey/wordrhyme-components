import { z } from 'zod';
import type { ImportIssue } from '@/hooks/use-auto-crud-resource';
import type { Fields } from './field-config';

// Zod 3 consumers keep their original messages. Zod 4 supplies its own locales.
type LocaleMap = Record<
  string,
  () => {
    localeError: (
      issue: Record<string, unknown>,
    ) => string | { message: string } | undefined;
  }
>;
const locales = (z as unknown as { locales?: LocaleMap }).locales;
const inputs: Record<string, unknown> = {
  string: '',
  number: 0,
  nan: NaN,
  boolean: false,
  object: {},
  array: [],
  null: null,
  undefined: undefined,
  bigint: BigInt(0),
  symbol: Symbol(),
  function: () => {},
};

export function importError(language: string) {
  const translate = locales?.[language]?.().localeError;
  return (issue: ImportIssue): string => {
    if (
      !translate ||
      ![
        'invalid_type',
        'invalid_value',
        'too_big',
        'too_small',
        'invalid_format',
        'not_multiple_of',
        'unrecognized_keys',
        'invalid_union',
        'invalid_key',
        'invalid_element',
      ].includes(issue.code)
    )
      return issue.message;
    const params = issue.params;
    const result = translate({
      ...params,
      code: issue.code,
      path: issue.path,
      input: inputs[String(params['received'])],
    });
    return typeof result === 'string' ? result : (result?.message ?? issue.message);
  };
}

export function formatImportError(
  issue: ImportIssue,
  fields: Fields,
  translate?: (issue: ImportIssue) => string,
): string {
  const field = fields[issue.path[0] ?? ''];
  const path = [field?.label ?? issue.path[0], ...issue.path.slice(1)]
    .filter(Boolean)
    .join('.');
  const options = field?.enum;
  const values = issue.params['values'];
  const params =
    Array.isArray(values) && options
      ? {
          ...issue.params,
          values: values.map((value) => {
            const label = options.find((option) => option.value === String(value))?.label;
            return label && label !== String(value)
              ? `${label} (${String(value)})`
              : value;
          }),
        }
      : issue.params;
  const message = translate?.({ ...issue, params }) ?? issue.message;
  return path ? `${path}: ${message}` : message;
}
