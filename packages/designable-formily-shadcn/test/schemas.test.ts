import { describe, expect, it } from 'vitest';

import { Checkbox, Rating, Select } from '../src/schemas/schemas';

describe('designable shadcn schemas', () => {
  it('exposes shadcn-compatible Checkbox size settings', () => {
    const properties = Checkbox.properties as Record<string, unknown>;

    expect(properties.size).toMatchObject({
      type: 'string',
      enum: ['large', 'small', 'default', null],
      'x-decorator': 'FormItem',
      'x-component': 'Select',
    });
  });

  it('does not expose unsupported runtime compatibility settings', () => {
    const selectProperties = Select.properties as Record<string, unknown>;
    const ratingProperties = Rating.properties as Record<string, unknown>;

    expect(selectProperties.labelInValue).toBeUndefined();
    expect(selectProperties.maxTagCount).toBeUndefined();
    expect(selectProperties.virtual).toBeUndefined();
    expect(ratingProperties.allowHalf).toBeUndefined();
  });
});
