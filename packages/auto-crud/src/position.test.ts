import { describe, expect, it, vi } from 'vitest';
import {
  actionPositionSchema,
  matchesPosition,
  positionActions,
  type ActionPosition,
} from './position';

describe('action positions', () => {
  it('merges fill arrays at the start, end and named anchors without moving owner actions', () => {
    const positioned = positionActions<{
      type: string;
      id: string;
      position?: ActionPosition;
    }>(
      [
        { type: 'custom', id: 'preview' },
        { type: 'custom', id: 'save' },
      ],
      [
        { type: 'custom', id: 'end', position: 'end' },
        {
          type: 'custom',
          id: 'after-preview',
          position: { anchor: 'preview', side: 'after' },
        },
        { type: 'custom', id: 'start', position: 'start' },
        { type: 'custom', id: 'default' },
      ],
    );
    expect(positioned.map((action) => action.id)).toEqual([
      'start',
      'preview',
      'after-preview',
      'save',
      'end',
      'default',
    ]);
  });

  it('shares start/end and relative position validation and matching', () => {
    for (const position of ['start', 'end', { anchor: 'save', side: 'before' }]) {
      expect(actionPositionSchema.safeParse(position).success).toBe(true);
    }
    expect(actionPositionSchema.safeParse({ anchor: '', side: 'after' }).success).toBe(
      false,
    );
    expect(
      actionPositionSchema.safeParse({ anchor: 'save', side: 'inside' }).success,
    ).toBe(false);
    expect(matchesPosition(undefined, undefined)).toBe(true);
    expect(matchesPosition(undefined, 'end')).toBe(false);
    expect(matchesPosition('start', 'end')).toBe(false);
    expect(
      matchesPosition(
        { anchor: 'save', side: 'before' },
        { anchor: 'save', side: 'before' },
      ),
    ).toBe(true);
    expect(
      matchesPosition(
        { anchor: 'save', side: 'after' },
        { anchor: 'save', side: 'before' },
      ),
    ).toBe(false);
  });

  it('orders fills by position and order while preserving owner array order', () => {
    const actions = positionActions([
      { type: 'custom', id: 'preview' },
      { type: 'save' },
      {
        type: 'custom',
        id: 'last',
        order: 30,
        position: { anchor: 'preview', side: 'after' } as const,
      },
      {
        type: 'custom',
        id: 'first',
        order: 10,
        position: { anchor: 'preview', side: 'after' } as const,
      },
      {
        type: 'custom',
        id: 'before-save',
        position: { anchor: 'save', side: 'before' } as const,
      },
    ]);
    expect(actions.map((action) => action.id ?? action.type)).toEqual([
      'preview',
      'first',
      'last',
      'before-save',
      'save',
    ]);
  });

  it('omits fills when their anchor is unavailable and rejects malformed positions', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      expect(
        positionActions([
          { type: 'custom', position: { anchor: 'hidden', side: 'after' } as const },
        ]),
      ).toEqual([]);
      expect(warn).toHaveBeenCalledWith('[Actions] Unavailable anchor "hidden"');
      expect(() =>
        positionActions([
          { type: 'custom', position: { anchor: '', side: 'after' } as const },
        ]),
      ).toThrow();
    } finally {
      warn.mockRestore();
    }
  });
});
