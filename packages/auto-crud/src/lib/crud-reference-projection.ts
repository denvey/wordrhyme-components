import type { AutoCrudOption } from './registries';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Read a label only while its ID still matches the field's current value. */
export function readCrudReferenceOption(
  row: unknown,
  field: string,
  value: unknown,
): AutoCrudOption | undefined {
  if (!isRecord(row)) return undefined;
  const { __crudExtensionProjection: projections } = row;
  if (!isRecord(projections)) return undefined;

  const projection = projections[field];
  if (!isRecord(projection)) return undefined;
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  if (typeof projection.refId !== 'string' && typeof projection.refId !== 'number') {
    return undefined;
  }
  if (
    String(value).length === 0 ||
    String(projection.refId) !== String(value) ||
    typeof projection.display !== 'string' ||
    projection.display.length === 0
  ) {
    return undefined;
  }

  return { value: String(value), label: projection.display };
}
