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

  it('allows an extension to mask a custom owner action by id', () => {
    const ownerActions: TestAction[] = [
      { type: 'view' },
      { type: 'custom', id: 'crm.customer.delete-permanently', label: '永久删除' },
    ];

    expect(crudActions.resolve<TestAction>('target', 'row', ownerActions)).toEqual([
      { type: 'view' },
      { type: 'custom', label: '永久删除' },
    ]);

    crudActions.register({
      targetId: 'target',
      zone: 'row',
      ownerId: 'com.wordrhyme.omnids',
      actions: [{ type: 'custom', id: 'crm.customer.delete-permanently', hidden: true }],
    });

    expect(crudActions.resolve<TestAction>('target', 'row', ownerActions)).toEqual([
      { type: 'view' },
    ]);
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

  it.each(['toolbar', 'row', 'batch'] as const)(
    'places extensions around owner action IDs in %s',
    (zone) => {
      crudActions.register({
        targetId: 'target',
        zone,
        ownerId: 'plugin',
        actions: [
          {
            type: 'custom',
            label: 'Last',
            order: 30,
            position: { anchor: 'preview', side: 'after' },
          },
          {
            type: 'custom',
            label: 'First',
            order: 10,
            position: { anchor: 'preview', side: 'after' },
          },
          {
            type: 'custom',
            label: 'Before delete',
            position: { anchor: 'delete', side: 'before' },
          },
        ],
      });
      const owner = [
        { type: 'custom', id: 'preview', label: 'Preview' },
        { type: 'delete' },
      ];
      expect(
        crudActions
          .resolve('target', zone, owner)
          .map((item) => ('label' in item ? item.label : item.type)),
      ).toEqual(['Preview', 'First', 'Last', 'Before delete', 'delete']);
      crudActions.unregister('plugin');
      expect(crudActions.resolve('target', zone, owner)).toEqual([
        { type: 'custom', label: 'Preview' },
        { type: 'delete' },
      ]);
    },
  );
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
  it.each(['row', 'toolbar', 'batch'] as const)(
    'replaces named actions in place in %s',
    (zone) => {
      const owner: TestAction[] = [
        { type: 'custom', id: 'detail', label: 'Detail' },
        { type: 'custom', id: 'refresh', label: 'Refresh' },
        { type: 'delete' },
      ];
      crudActions.register({
        targetId: 'target',
        zone,
        ownerId: 'plugin',
        actions: [{ type: 'custom', id: 'refresh', label: 'Replacement' }],
      });
      expect(crudActions.resolve('target', zone, owner)).toEqual([
        { type: 'custom', label: 'Detail' },
        { type: 'custom', label: 'Replacement' },
        { type: 'delete' },
      ]);
      expect(crudActions.resolve('other', zone, owner)[1]).toEqual({
        type: 'custom',
        label: 'Refresh',
      });
      crudActions.unregister('plugin');
      expect(crudActions.resolve('target', zone, owner)[1]).toEqual({
        type: 'custom',
        label: 'Refresh',
      });
    },
  );

  it('deduplicates registered IDs with stable precedence and preserves anonymous actions', () => {
    for (const ownerId of ['plugin-b', 'plugin-a']) {
      crudActions.register({
        targetId: 'target',
        zone: 'row',
        ownerId,
        actions: [
          { type: 'custom', id: 'shared', label: ownerId },
          { type: 'custom', label: 'Anonymous' },
        ],
      });
    }
    expect(crudActions.resolve('target', 'row', [])).toEqual([
      { type: 'custom', label: 'Anonymous' },
      { type: 'custom', label: 'plugin-b' },
      { type: 'custom', label: 'Anonymous' },
    ]);
    crudActions.register({
      targetId: 'target',
      zone: 'row',
      ownerId: 'mask',
      actions: [{ type: 'custom', id: 'shared', hidden: true }],
    });
    expect(crudActions.resolve('target', 'row', [])).toEqual([
      { type: 'custom', label: 'Anonymous' },
      { type: 'custom', label: 'Anonymous' },
    ]);
    expect(
      crudActions.resolve('target', 'toolbar', [{ type: 'custom', id: 'shared' }]),
    ).toEqual([{ type: 'custom' }]);
  });
  it.each(['row', 'toolbar', 'batch'] as const)(
    'deduplicates a shared object in %s',
    (zone) => {
      const shared: TestAction = { type: 'custom', id: 'shared', label: 'Shared' };
      for (const ownerId of ['plugin-b', 'plugin-a']) {
        crudActions.register({
          targetId: 'target',
          zone,
          ownerId,
          actions: [shared, shared],
        });
      }
      expect(crudActions.resolve('target', zone, [])).toEqual([
        { type: 'custom', label: 'Shared' },
      ]);
      crudActions.unregister('plugin-b');
      expect(crudActions.resolve('target', zone, [])).toEqual([
        { type: 'custom', label: 'Shared' },
      ]);
      crudActions.unregister('plugin-a');
      expect(crudActions.resolve('target', zone, [])).toEqual([]);
    },
  );
});

it('deduplicates and masks named before actions before positioning', () => {
  crudActions.clear();
  for (const ownerId of ['plugin-b', 'plugin-a']) {
    crudActions.register({
      targetId: 'target',
      zone: 'row',
      ownerId,
      actions: [{ type: 'custom', id: 'sync', before: 'delete', label: ownerId }],
    });
  }
  const owner: TestAction[] = [{ type: 'view' }, { type: 'delete' }];
  const labels = (actions: TestAction[]) =>
    actions.map((item) => item.label ?? item.type);
  expect(labels(crudActions.resolve('target', 'row', owner))).toEqual([
    'view',
    'plugin-b',
    'delete',
  ]);
  const ownerWithSync: TestAction[] = [
    { type: 'custom', id: 'sync', label: 'Owner' },
    ...owner,
  ];
  expect(labels(crudActions.resolve('target', 'row', ownerWithSync))).toEqual([
    'view',
    'plugin-b',
    'delete',
  ]);
  crudActions.register({
    targetId: 'target',
    zone: 'row',
    ownerId: 'mask',
    actions: [{ type: 'custom', id: 'sync', hidden: true }],
  });
  expect(labels(crudActions.resolve('target', 'row', owner))).toEqual(['view', 'delete']);
  expect(labels(crudActions.resolve('target', 'row', ownerWithSync))).toEqual([
    'view',
    'delete',
  ]);
  crudActions.clear();
});

it.each(['start', 'end'] as const)(
  'keeps the %s fallback when another builtin is listed',
  (position) => {
    crudActions.clear();
    crudActions.register({
      targetId: 'target',
      zone: 'row',
      ownerId: 'plugin',
      actions: [{ type: 'custom', before: 'delete', position }, { type: 'view' }],
    });
    const result = crudActions
      .resolve('target', 'row', [{ type: 'view' }, { type: 'edit' }])
      .map((item) => item.type);
    expect(result).toEqual(
      position === 'start' ? ['custom', 'view', 'edit'] : ['view', 'edit', 'custom'],
    );
    crudActions.clear();
  },
);

it.each(['start', 'end'] as const)(
  'falls back to %s when a later entry hides the anchor',
  (position) => {
    crudActions.clear();
    crudActions.register({
      targetId: 'target',
      zone: 'row',
      ownerId: 'plugin',
      actions: [
        { type: 'custom', before: 'delete', position, order: 10 },
        { type: 'delete', hidden: true, order: 20 },
      ],
    });
    const result = crudActions
      .resolve('target', 'row', [{ type: 'view' }, { type: 'delete' }, { type: 'edit' }])
      .map((item) => item.type);
    expect(result).toEqual(
      position === 'start' ? ['custom', 'view', 'edit'] : ['view', 'edit', 'custom'],
    );
    crudActions.clear();
  },
);

it('inserts a custom row action before delete and falls back when delete is absent', () => {
  crudActions.clear();
  crudActions.register({
    targetId: 'example.products',
    zone: 'row',
    ownerId: 'example.sync',
    actions: [{ type: 'custom', before: 'delete', label: 'Sync' }],
  });
  expect(
    crudActions
      .resolve('example.products', 'row', [
        { type: 'view' },
        { type: 'edit' },
        { type: 'delete' },
      ])
      .map((item) => item.type),
  ).toEqual(['view', 'edit', 'custom', 'delete']);
  expect(
    crudActions
      .resolve('example.products', 'row', [{ type: 'view' }])
      .map((item) => item.type),
  ).toEqual(['view', 'custom']);
  crudActions.clear();
});
