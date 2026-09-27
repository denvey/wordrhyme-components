import type {
  AutoCrudRowActionContext,
  AutoCrudRowOpenOptions,
} from '@/components/auto-crud/auto-crud-table';
import { expect, it, vi } from 'vitest';
import { resolveActions } from '@/components/auto-crud/auto-crud-table';

const row = { id: 'one' };
function setup(enabled = true) {
  const handlers = {
    openView: vi.fn(),
    openEdit: enabled ? vi.fn() : undefined,
    copyRow: enabled ? vi.fn() : undefined,
    openDelete: enabled ? vi.fn() : undefined,
  };
  const showDialog = vi.fn();
  const items = resolveActions<typeof row>(
    [{ type: 'custom', label: 'Action' }],
    handlers,
    { view: 'View', edit: 'Edit', copy: 'Copy', delete: 'Delete' },
    { crudId: 'test', idKey: 'id', showDialog },
  );
  return {
    context: items[0]!.getContext!(row) as AutoCrudRowActionContext<typeof row>,
    handlers,
    showDialog,
  };
}

it('dispatches built-in operations to the same handlers as the legacy methods', () => {
  const { context, handlers } = setup();
  const target = { id: 'two' };
  for (const [type, method] of [
    ['view', 'openView'],
    ['edit', 'openEdit'],
    ['copy', 'copyRow'],
    ['delete', 'openDelete'],
  ] as const) {
    context.open({ type, row: target });
    context[method]?.(target);
    expect(handlers[method]).toHaveBeenCalledTimes(2);
    expect(handlers[method]).toHaveBeenLastCalledWith(target);
  }
});

it('keeps unavailable operations disabled and legacy optional methods absent', () => {
  const { context, handlers, showDialog } = setup(false);
  for (const type of ['edit', 'copy', 'delete'] as const) context.open({ type, row });
  expect(context.openEdit).toBeUndefined();
  expect(context.copyRow).toBeUndefined();
  expect(context.openDelete).toBeUndefined();
  expect(handlers.openView).not.toHaveBeenCalled();
  expect(showDialog).not.toHaveBeenCalled();
});

it('delegates custom dialogs to the existing host and keeps showDialog compatible', () => {
  const { context, showDialog } = setup();
  const dialog = <div />;
  context.open({ type: 'custom', component: dialog });
  context.showDialog(dialog);
  expect(showDialog).toHaveBeenCalledTimes(2);
  expect(showDialog).toHaveBeenLastCalledWith(dialog);
});

// Compile-time coverage for the exported discriminated union.
const valid: AutoCrudRowOpenOptions<typeof row> = { type: 'edit', row };
// @ts-expect-error Built-in operations require a row.
const missingRow: AutoCrudRowOpenOptions<typeof row> = { type: 'edit' };
// @ts-expect-error Custom operations require a component, not a row.
const wrongPayload: AutoCrudRowOpenOptions<typeof row> = { type: 'custom', row };
// @ts-expect-error Unknown operation types are not supported.
const unknownType: AutoCrudRowOpenOptions<typeof row> = { type: 'unknown', row };
// eslint-disable-next-line no-void -- Reference compile-only fixtures without executing invalid actions.
void [valid, missingRow, wrongPayload, unknownType];
