import { z } from 'zod';

export const actionPositionSchema = z.union([
  z.enum(['start', 'end']),
  z.object({
    anchor: z.string().min(1),
    side: z.enum(['before', 'after']),
  }),
]);

export type ActionPosition = z.infer<typeof actionPositionSchema>;

export function matchesPosition(
  position?: ActionPosition,
  point?: ActionPosition,
): boolean {
  if (typeof position !== 'object' || typeof point !== 'object') {
    return position === point;
  }
  return position.anchor === point.anchor && position.side === point.side;
}

export function compareOrder(
  left: { order?: number },
  right: { order?: number },
): number {
  return (left.order ?? 100) - (right.order ?? 100);
}

/** Resolve relative positions after owner ordering and overrides, before removing IDs. */
export function positionActions<
  T extends {
    id?: string;
    type: string;
    order?: number;
    position?: ActionPosition;
  },
>(items: readonly T[], fills: readonly T[] = []): T[] {
  const anchored = new Map<string, T[]>();
  const base: T[] = [];
  for (const item of [
    ...fills.filter((fill) => matchesPosition(fill.position, 'start')),
    ...items,
    ...fills.filter((fill) => !matchesPosition(fill.position, 'start')),
  ]) {
    if (item.position !== undefined) actionPositionSchema.parse(item.position);
    if (typeof item.position !== 'object') {
      base.push(item);
      continue;
    }
    const group = anchored.get(item.position.anchor) ?? [];
    group.push(item);
    anchored.set(item.position.anchor, group);
  }
  const result = base.flatMap((item) => {
    const anchor = item.id ?? (item.type === 'custom' ? undefined : item.type);
    if (!anchor) return [item];
    const group = anchored.get(anchor) ?? [];
    anchored.delete(anchor);
    group.sort(compareOrder);
    return [
      ...group.filter((action) =>
        matchesPosition(action.position, { anchor, side: 'before' }),
      ),
      item,
      ...group.filter((action) =>
        matchesPosition(action.position, { anchor, side: 'after' }),
      ),
    ];
  });
  // An unavailable anchor hides its fills, as with a conditionally rendered PluginSlot.
  for (const anchor of anchored.keys())
    console.warn(`[Actions] Unavailable anchor "${anchor}"`);
  return result;
}
