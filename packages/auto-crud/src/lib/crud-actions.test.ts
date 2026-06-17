import { afterEach, describe, expect, it, vi } from 'vitest';
import { crudActions, type CrudActionBase } from './crud-actions';

type TestAction = CrudActionBase & {
  label?: string;
};

describe('crudActions', () => {
  afterEach(() => {
    crudActions.clear();
  });

  it('registers, resolves, and unregisters actions by target and zone', () => {
    const ownerActions: TestAction[] = [{ type: 'export' }, { type: 'create' }];

    crudActions.register({
      targetId: 'com.wordrhyme.shop.stores',
      zone: 'toolbar',
      ownerId: 'com.wordrhyme.test-lab',
      actions: [
        { type: 'custom', id: 'open-lab', order: 80, position: 'start' },
        { type: 'export', hidden: true, order: 90 },
        { type: 'create', order: 100, label: 'Open create' },
      ],
    });

    expect(
      crudActions.resolve<TestAction>(
        'com.wordrhyme.shop.stores',
        'toolbar',
        ownerActions,
      ),
    ).toEqual([
      { type: 'custom', position: 'start' },
      { type: 'create', label: 'Open create' },
    ]);

    crudActions.unregister('com.wordrhyme.test-lab');

    expect(
      crudActions.resolve<TestAction>(
        'com.wordrhyme.shop.stores',
        'toolbar',
        ownerActions,
      ),
    ).toEqual(ownerActions);
  });

  it('uses stable order and lets the last builtin override win', () => {
    const ownerActions: TestAction[] = [{ type: 'create', label: 'Owner create' }];

    crudActions.register({
      targetId: 'target',
      zone: 'toolbar',
      ownerId: 'plugin-b',
      actions: [{ type: 'create', order: 100, label: 'Plugin B' }],
    });
    crudActions.register({
      targetId: 'target',
      zone: 'toolbar',
      ownerId: 'plugin-a',
      actions: [{ type: 'create', order: 100, label: 'Plugin A' }],
    });

    expect(crudActions.resolve<TestAction>('target', 'toolbar', ownerActions)).toEqual([
      { type: 'create', label: 'Plugin B' },
    ]);
  });

  it('keeps an explicitly hidden action set empty instead of restoring owner defaults', () => {
    const ownerActions: TestAction[] = [{ type: 'view' }, { type: 'delete' }];

    crudActions.register({
      targetId: 'target',
      zone: 'row',
      ownerId: 'plugin',
      actions: [
        { type: 'view', hidden: true },
        { type: 'delete', hidden: true },
      ],
    });

    expect(crudActions.resolve<TestAction>('target', 'row', ownerActions)).toEqual([]);
  });

  it('notifies subscribers with a version snapshot', async () => {
    const listener = vi.fn();
    const before = crudActions.getSnapshot();
    const unsubscribe = crudActions.subscribe(listener);

    crudActions.register({
      targetId: 'target',
      zone: 'row',
      ownerId: 'plugin',
      actions: [{ type: 'delete', hidden: true }],
    });

    expect(crudActions.getSnapshot()).toBeGreaterThan(before);
    expect(listener).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });
});
