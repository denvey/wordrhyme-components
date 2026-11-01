import { z } from 'zod';
import type { ImportIssue } from '../types/config';

type ErrorMap = (
  issue: Record<string, unknown>,
  context?: { data: unknown; defaultError: string },
) => string | { message: string } | undefined;
const runtime = z as unknown as {
  config?: () => { localeError?: ErrorMap };
  defaultErrorMap?: ErrorMap;
};

// Only schema constraints cross the wire, never input, instances or nested errors.
const PARAMS = [
  'values',
  'options',
  'expected',
  'origin',
  'type',
  'minimum',
  'maximum',
  'inclusive',
  'exact',
  'format',
  'validation',
  'pattern',
  'prefix',
  'suffix',
  'includes',
  'divisor',
  'multipleOf',
  'keys',
] as const;

export function importIssue(issue: z.ZodIssue, row: unknown): ImportIssue | null {
  const detail = issue as unknown as Record<string, unknown>;
  // Zod 4 reportInput captures the value after coercion/preprocessing; never serialize it.
  const input = Object.hasOwn(detail, 'input')
    ? detail['input']
    : issue.path.reduce<unknown>(
        (value, key) =>
          value != null && typeof value === 'object'
            ? (value as Record<PropertyKey, unknown>)[key]
            : undefined,
        row,
      );
  const errorMap = runtime.config?.().localeError ?? runtime.defaultErrorMap;
  const defaultError = errorMap?.(
    { ...detail, input },
    { data: input, defaultError: '' },
  );
  const defaultMessage =
    typeof defaultError === 'string' ? defaultError : defaultError?.message;
  // Explicit schema/business messages remain authoritative, even for built-in codes.
  if (
    issue.code === 'custom' ||
    detail['exact'] === true ||
    issue.message !== defaultMessage
  )
    return null;
  const params = Object.fromEntries(
    PARAMS.filter((key) => detail[key] !== undefined).map((key) => [
      key,
      typeof detail[key] === 'bigint' ? String(detail[key]) : detail[key],
    ]),
  );
  if (issue.code === 'invalid_type') {
    params['received'] =
      typeof detail['received'] === 'string'
        ? detail['received']
        : input === null
          ? 'null'
          : Array.isArray(input)
            ? 'array'
            : typeof input === 'number' && Number.isNaN(input)
              ? 'nan'
              : typeof input;
  }
  // Normalize Zod 3 constraint names for the Zod 4 locale catalogs.
  let code: string = issue.code;
  if (code === 'invalid_enum_value') {
    code = 'invalid_value';
    params['values'] = params['options'];
  } else if (code === 'invalid_literal') {
    code = 'invalid_value';
    params['values'] = [params['expected']];
  } else if (code === 'invalid_string') {
    if (typeof params['validation'] !== 'string' || params['validation'] === 'regex')
      return null;
    code = 'invalid_format';
    params['format'] = params['validation'];
  }
  if (params['type'] !== undefined) params['origin'] = params['type'];
  if (params['multipleOf'] !== undefined) params['divisor'] = params['multipleOf'];
  return { code, path: issue.path.map(String), message: issue.message, params };
}
