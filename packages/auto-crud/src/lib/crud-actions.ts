export type CrudActionZone = 'toolbar' | 'row' | 'batch';

export type CrudActionBase = {
  type: string;
  id?: string;
  order?: number;
  hidden?: boolean;
  position?: 'start' | 'end';
};

export type CrudActionEntry<TAction extends CrudActionBase = CrudActionBase> = {
  targetId: string;
  zone: CrudActionZone;
  ownerId: string;
  action: TAction;
  order: number;
  seq: number;
};

export type CrudActionRegistration<TAction extends CrudActionBase = CrudActionBase> = {
  targetId: string;
  zone: CrudActionZone;
  ownerId: string;
  actions: readonly TAction[];
};

type RegistryListener = () => void;

const entries = new Map<string, CrudActionEntry>();
const index = new Map<string, Set<string>>();
const listeners = new Set<RegistryListener>();
let seq = 0;
let version = 0;
let notifyScheduled = false;

function actionKey(
  registration: Pick<CrudActionRegistration, 'targetId' | 'zone' | 'ownerId'>,
  action: CrudActionBase,
  index: number,
): string {
  return [
    registration.ownerId,
    registration.targetId,
    registration.zone,
    action.id ?? action.type,
    index,
  ].join(':');
}

function indexKey(targetId: string, zone: CrudActionZone): string {
  return `${targetId}:${zone}`;
}

function addToIndex(
  key: string,
  entry: Pick<CrudActionEntry, 'targetId' | 'zone'>,
): void {
  const bucketKey = indexKey(entry.targetId, entry.zone);
  const bucket = index.get(bucketKey) ?? new Set<string>();
  bucket.add(key);
  index.set(bucketKey, bucket);
}

function removeFromIndex(
  key: string,
  entry: Pick<CrudActionEntry, 'targetId' | 'zone'>,
): void {
  const bucketKey = indexKey(entry.targetId, entry.zone);
  const bucket = index.get(bucketKey);
  if (!bucket) return;

  bucket.delete(key);
  if (bucket.size === 0) {
    index.delete(bucketKey);
  }
}

function notify(): void {
  version += 1;

  if (notifyScheduled) return;
  notifyScheduled = true;

  queueMicrotask(() => {
    notifyScheduled = false;
    for (const listener of listeners) {
      listener();
    }
  });
}

function unregisterOwnerActions(
  ownerId: string,
  options: { targetId?: string; zone?: CrudActionZone } = {},
  shouldNotify = true,
): void {
  let changed = false;

  for (const [key, entry] of entries) {
    if (entry.ownerId !== ownerId) continue;
    if (options.targetId && entry.targetId !== options.targetId) continue;
    if (options.zone && entry.zone !== options.zone) continue;

    entries.delete(key);
    removeFromIndex(key, entry);
    changed = true;
  }

  if (changed && shouldNotify) {
    notify();
  }
}

function sortEntries<TAction extends CrudActionBase>(
  left: CrudActionEntry<TAction>,
  right: CrudActionEntry<TAction>,
): number {
  const orderDiff = left.order - right.order;
  if (orderDiff !== 0) return orderDiff;

  const ownerDiff = left.ownerId.localeCompare(right.ownerId);
  if (ownerDiff !== 0) return ownerDiff;

  return left.seq - right.seq;
}

function withoutRegistryMeta<TAction extends CrudActionBase>(action: TAction): TAction {
  const { id, order, ...rest } = action;
  return rest as TAction;
}

function isCustomAction(action: CrudActionBase): boolean {
  return action.type === 'custom';
}

function resolveActions<TAction extends CrudActionBase>(
  targetId: string | undefined,
  zone: CrudActionZone,
  ownerActions: readonly TAction[],
): TAction[] {
  const baseActions = ownerActions
    .filter((action) => !action.hidden)
    .map((action) => withoutRegistryMeta(action));

  if (!targetId) return baseActions;

  const registered = crudActions.get<TAction>(targetId, zone);
  if (registered.length === 0) return baseActions;

  const nextActions = [...baseActions];
  const startCustomActions: TAction[] = [];
  const endCustomActions: TAction[] = [];
  const groups = new Map<string, CrudActionEntry<TAction>[]>();

  for (const entry of registered) {
    const group = groups.get(entry.ownerId) ?? [];
    group.push(entry);
    groups.set(entry.ownerId, group);
    const action = entry.action;
    if (isCustomAction(action)) continue;

    const existingIndex = nextActions.findIndex((item) => item.type === action.type);
    if (action.hidden) {
      if (existingIndex >= 0) {
        nextActions.splice(existingIndex, 1);
      }
      continue;
    }

    const builtin = withoutRegistryMeta(action);
    if (existingIndex >= 0) {
      nextActions[existingIndex] = {
        ...nextActions[existingIndex],
        ...builtin,
      };
    } else {
      nextActions.push(builtin);
    }
  }

  // Keep existing override precedence, but use each owner's original array for
  // placement. Groups follow their first entry in the stable registry order.
  for (const group of groups.values()) {
    const items = group
      .sort((left, right) => left.seq - right.seq)
      .flatMap(({ action }) => {
        if (action.hidden) return [];
        if (isCustomAction(action)) return [withoutRegistryMeta(action)];
        const builtin = nextActions.find((item) => item.type === action.type);
        return builtin ? [builtin] : [];
      });
    const firstBuiltin = items.find((item) => !isCustomAction(item));
    if (firstBuiltin) {
      // Leave unmentioned items in place. Move a listed item only when needed to
      // follow the previous one; custom items occupy their declared array slot.
      let cursor = nextActions.indexOf(firstBuiltin);
      for (const item of items) {
        const existing = nextActions.indexOf(item);
        if (existing >= cursor) {
          cursor = existing + 1;
        } else {
          if (existing >= 0) {
            nextActions.splice(existing, 1);
            cursor -= 1;
          }
          nextActions.splice(cursor, 0, item);
          cursor += 1;
        }
      }
    } else {
      for (const custom of items) {
        (custom.position === 'start' ? startCustomActions : endCustomActions).push(
          custom,
        );
      }
    }
  }

  return [...startCustomActions, ...nextActions, ...endCustomActions];
}

export const crudActions = {
  register<TAction extends CrudActionBase>(
    registration: CrudActionRegistration<TAction>,
  ): void {
    unregisterOwnerActions(
      registration.ownerId,
      {
        targetId: registration.targetId,
        zone: registration.zone,
      },
      false,
    );

    registration.actions.forEach((action, index) => {
      const key = actionKey(registration, action, index);
      const entry = {
        targetId: registration.targetId,
        zone: registration.zone,
        ownerId: registration.ownerId,
        action,
        order: action.order ?? 100,
        seq: seq++,
      };
      entries.set(key, entry);
      addToIndex(key, entry);
    });

    notify();
  },

  unregister: unregisterOwnerActions,

  clear(): void {
    if (entries.size === 0) return;
    entries.clear();
    index.clear();
    notify();
  },

  get<TAction extends CrudActionBase>(
    targetId: string,
    zone: CrudActionZone,
  ): CrudActionEntry<TAction>[] {
    return Array.from(index.get(indexKey(targetId, zone)) ?? [])
      .flatMap((key) => {
        const entry = entries.get(key);
        return entry ? [entry] : [];
      })
      .sort(sortEntries) as CrudActionEntry<TAction>[];
  },

  resolve: resolveActions,

  subscribe(listener: RegistryListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): number {
    return version;
  },
};
