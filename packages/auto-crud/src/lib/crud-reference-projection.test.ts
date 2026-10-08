import { describe, expect, it } from 'vitest';
import { readCrudReferenceOption } from './crud-reference-projection';

describe('readCrudReferenceOption', () => {
  const row = {
    customer: 'customer-1',
    __crudExtensionProjection: {
      customer: { refId: 'customer-1', display: 'Customer One' },
    },
  };

  it('reads the existing reference label without changing its ID', () => {
    expect(readCrudReferenceOption(row, 'customer', row.customer)).toEqual({
      value: 'customer-1',
      label: 'Customer One',
    });
    expect(row.customer).toBe('customer-1');
  });

  it.each([undefined, null, '', 'customer-2'])(
    'does not reuse the initial label after the value becomes %j',
    (value) => {
      expect(readCrudReferenceOption(row, 'customer', value)).toBeUndefined();
    },
  );

  it.each([undefined, {}, { __crudExtensionProjection: { customer: null } }])(
    'ignores missing or invalid projection metadata: %j',
    (value) => {
      expect(readCrudReferenceOption(value, 'customer', 'customer-1')).toBeUndefined();
    },
  );
});
