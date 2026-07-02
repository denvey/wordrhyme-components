import type { JsonObject, JsonValue } from './types';

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function cloneJsonObject(value: JsonObject | undefined): JsonObject {
  if (!value) {
    return {};
  }

  return JSON.parse(JSON.stringify(value)) as JsonObject;
}

export function readPath(
  source: unknown,
  path: string | undefined,
): JsonValue | undefined {
  if (!path) {
    return source as JsonValue | undefined;
  }

  const parts = path
    .replace(/\[(\d+)\]/gu, '.$1')
    .split('.')
    .filter(Boolean);

  let cursor: unknown = source;

  for (const part of parts) {
    if (Array.isArray(cursor)) {
      const index = Number(part);
      cursor = Number.isInteger(index) ? cursor[index] : undefined;
      continue;
    }

    if (!isJsonObject(cursor)) {
      return undefined;
    }

    cursor = cursor[part];
  }

  return cursor as JsonValue | undefined;
}

export function setPath(target: JsonObject, path: string, value: JsonValue): JsonObject {
  const parts = path
    .replace(/\[(\d+)\]/gu, '.$1')
    .split('.')
    .filter(Boolean);

  if (parts.length === 0) {
    return target;
  }

  let cursor = target;

  for (const part of parts.slice(0, -1)) {
    const next = cursor[part];

    if (!isJsonObject(next)) {
      cursor[part] = {};
    }

    cursor = cursor[part] as JsonObject;
  }

  const leaf = parts.at(-1);

  if (!leaf) {
    return target;
  }

  cursor[leaf] = value;

  return target;
}
