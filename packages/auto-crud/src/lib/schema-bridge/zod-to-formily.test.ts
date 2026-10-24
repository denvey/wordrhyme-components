import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createEditFormSchema } from './zod-to-formily';

describe('createEditFormSchema', () => {
  it('excludes platform managed audit fields from generated forms', () => {
    const formSchema = createEditFormSchema(
      z.object({
        id: z.string(),
        name: z.string(),
        createdAt: z.date(),
        updatedAt: z.date(),
        createdBy: z.string().nullable(),
        createdByType: z.enum(['user', 'system', 'plugin', 'api-token']),
        updatedBy: z.string().nullable(),
        updatedByType: z.enum(['user', 'system', 'plugin', 'api-token']),
      }),
    );

    expect(formSchema.properties).toHaveProperty('name');
    expect(formSchema.properties).not.toHaveProperty('id');
    expect(formSchema.properties).not.toHaveProperty('createdAt');
    expect(formSchema.properties).not.toHaveProperty('updatedAt');
    expect(formSchema.properties).not.toHaveProperty('createdBy');
    expect(formSchema.properties).not.toHaveProperty('createdByType');
    expect(formSchema.properties).not.toHaveProperty('updatedBy');
    expect(formSchema.properties).not.toHaveProperty('updatedByType');
  });

  it('uses overridden enum labels in both data sources and component options', () => {
    const options = [{ value: 'active', label: 'Active status' }];
    const formSchema = createEditFormSchema(z.object({ status: z.enum(['active']) }), {
      overrides: { status: { enum: options } },
    });
    expect(formSchema).toMatchObject({
      properties: {
        status: {
          enum: options,
          'x-component-props': { options },
        },
      },
    });
  });
});
