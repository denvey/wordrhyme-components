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

describe('registered action array order', () => {
  const ownerActions: TestAction[] = [
    { type: 'view' },
    { type: 'edit' },
    { type: 'copy' },
    { type: 'delete' },
  ];

  afterEach(() => crudActions.clear());

  it.each(['toolbar', 'row', 'batch'] as const)(
    'uses array order in %s without removing unmentioned actions',
    (zone) => {
      crudActions.register({
        targetId: 'target',
        zone,
        ownerId: 'plugin',
        actions: [{ type: 'custom', label: 'Sync' }, { type: 'delete' }],
      });
      expect(crudActions.resolve('target', zone, ownerActions)).toEqual([
        ...ownerActions.slice(0, 3),
        { type: 'custom', label: 'Sync' },
        { type: 'delete' },
      ]);
    },
  );

  it('honors an explicit builtin and custom sequence instead of position or order', () => {
    crudActions.register({
      targetId: 'target',
      zone: 'row',
      ownerId: 'plugin',
      actions: [
        { type: 'delete', order: 30 },
        { type: 'custom', label: 'Sync', order: 10, position: 'start' },
        { type: 'view', order: 20 },
      ],
    });
    expect(crudActions.resolve('target', 'row', ownerActions)).toEqual([
      { type: 'edit' },
      { type: 'copy' },
      { type: 'delete' },
      { type: 'custom', label: 'Sync', position: 'start' },
      { type: 'view' },
    ]);
  });

  it('preserves builtin handlers and unmentioned owner custom actions', () => {
    const onClick = vi.fn();
    const ownerCustom = { type: 'custom', label: 'Owner' };
    crudActions.register({
      targetId: 'target',
      zone: 'row',
      ownerId: 'plugin',
      actions: [
        { type: 'edit', label: 'Change' },
        { type: 'custom', label: 'Sync' },
      ],
    });
    expect(
      crudActions.resolve('target', 'row', [
        { type: 'view' },
        ownerCustom,
        { type: 'edit', onClick },
        { type: 'delete' },
      ]),
    ).toEqual([
      { type: 'view' },
      ownerCustom,
      { type: 'edit', label: 'Change', onClick },
      { type: 'custom', label: 'Sync' },
      { type: 'delete' },
    ]);
  });

  it.each(['start', 'end'] as const)(
    'keeps %s fallback when all listed builtins are hidden by another plugin',
    (position) => {
      crudActions.register({
        targetId: 'target',
        zone: 'row',
        ownerId: 'plugin-a',
        actions: [{ type: 'custom', position }, { type: 'delete' }],
      });
      crudActions.register({
        targetId: 'target',
        zone: 'row',
        ownerId: 'plugin-b',
        actions: [{ type: 'delete', hidden: true }],
      });
      const visible = ownerActions.slice(0, 3);
      expect(crudActions.resolve('target', 'row', ownerActions)).toEqual(
        position === 'start'
          ? [{ type: 'custom', position }, ...visible]
          : [...visible, { type: 'custom', position }],
      );
    },
  );

  it('keeps custom-only start/end behavior and array order within each position', () => {
    crudActions.register({
      targetId: 'target',
      zone: 'row',
      ownerId: 'plugin',
      actions: [
        { type: 'custom', label: 'First', order: 30 },
        { type: 'custom', label: 'Start', position: 'start' },
        { type: 'custom', label: 'Last', order: 10 },
        { type: 'custom', label: 'Hidden', hidden: true },
      ],
    });
    expect(crudActions.resolve('target', 'row', ownerActions)).toEqual([
      { type: 'custom', label: 'Start', position: 'start' },
      ...ownerActions,
      { type: 'custom', label: 'First' },
      { type: 'custom', label: 'Last' },
    ]);
  });

  it.each([false, true])(
    'merges plugins deterministically (reverse registration: %s)',
    (reverse) => {
      const registrations = [
        {
          targetId: 'target',
          zone: 'row' as const,
          ownerId: 'plugin-a',
          actions: [{ type: 'custom', label: 'A' }, { type: 'delete' }, { type: 'view' }],
        },
        {
          targetId: 'target',
          zone: 'row' as const,
          ownerId: 'plugin-b',
          actions: [{ type: 'view' }, { type: 'custom', label: 'B' }, { type: 'delete' }],
        },
      ];
      for (const registration of reverse ? registrations.reverse() : registrations) {
        crudActions.register(registration);
      }
      const resolved = crudActions.resolve('target', 'row', ownerActions);
      expect(resolved.map((item) => item.label ?? item.type)).toEqual([
        'edit',
        'copy',
        'A',
        'view',
        'B',
        'delete',
      ]);
      crudActions.unregister('plugin-b');
      expect(
        crudActions
          .resolve('target', 'row', ownerActions)
          .map((item) => item.label ?? item.type),
      ).toEqual(['edit', 'copy', 'A', 'delete', 'view']);
    },
  );

  it('uses minimum order to prioritize groups without changing builtin override precedence', () => {
    crudActions.register({
      targetId: 'target',
      zone: 'row',
      ownerId: 'plugin-a',
      actions: [
        { type: 'delete', label: 'A', order: 300 },
        { type: 'view', order: 10 },
      ],
    });
    crudActions.register({
      targetId: 'target',
      zone: 'row',
      ownerId: 'plugin-b',
      actions: [
        { type: 'view', order: 200 },
        { type: 'delete', label: 'B', order: 200 },
      ],
    });
    expect(crudActions.resolve('target', 'row', ownerActions)).toEqual([
      { type: 'edit' },
      { type: 'copy' },
      { type: 'view' },
      { type: 'delete', label: 'A' },
    ]);
  });
});
