import { createForm } from '@formily/core';
import { createSchemaField, FormProvider } from '@formily/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  Checkbox,
  FormItem,
  Input,
  JsonSchemaForm,
  NumberInput,
  Rating,
  Select,
  Switch,
} from '../../src';

const SchemaField = createSchemaField({
  components: {
    Checkbox,
    FormItem,
    Input,
    NumberInput,
    Rating,
    Select,
    Switch,
  },
});

function renderSchema(schema: object, values: Record<string, unknown> = {}) {
  const form = createForm({ values });
  const result = render(
    <FormProvider form={form}>
      <SchemaField schema={schema} />
    </FormProvider>,
  );

  return { form, ...result };
}

describe('designable compatibility props', () => {
  it('maps Input addon, clear, border and size props', () => {
    renderSchema(
      {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            title: 'Name',
            'x-decorator': 'FormItem',
            'x-component': 'Input',
            'x-component-props': {
              addonBefore: 'SKU',
              addonAfter: 'CN',
              allowClear: true,
              bordered: false,
              placeholder: 'Product name',
              size: 'large',
            },
          },
        },
      },
      { name: 'Lamp' },
    );

    const input = screen.getByPlaceholderText('Product name');

    expect(screen.getByText('SKU')).toBeTruthy();
    expect(screen.getByText('CN')).toBeTruthy();
    expect(screen.getByLabelText('Clear input')).toBeTruthy();
    expect(input.className).toContain('h-10');
    expect(input.className).toContain('border-transparent');
  });

  it('renders Input.TextArea through the default JSON schema renderer', () => {
    const form = createForm({ values: { description: 'Studio description' } });

    render(
      <JsonSchemaForm
        form={form}
        schema={{
          type: 'object',
          properties: {
            description: {
              type: 'string',
              title: 'Description',
              'x-decorator': 'FormItem',
              'x-component': 'Input.TextArea',
              'x-component-props': {
                placeholder: 'Description',
              },
            },
          },
        }}
      />,
    );

    const textarea = screen.getByPlaceholderText('Description');

    expect(textarea.tagName).toBe('TEXTAREA');
    expect((textarea as HTMLTextAreaElement).value).toBe('Studio description');
  });

  it('maps FormItem layout, addon and tooltip props', () => {
    const { container } = renderSchema({
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: 'Name',
          'x-decorator': 'FormItem',
          'x-decorator-props': {
            addonBefore: '$',
            addonAfter: 'USD',
            colon: true,
            labelAlign: 'right',
            labelWidth: '120px',
            layout: 'horizontal',
            tooltip: 'Price shown to public buyers',
            tooltipLayout: 'icon',
            wrapperWidth: '240px',
          },
          'x-component': 'Input',
        },
      },
    });

    const label = container.querySelector('[data-slot="form-item-label"]');
    const inputWrapper = container.querySelector('[data-slot="form-item-input"]');

    expect(label?.textContent).toContain('Name:');
    expect((label as HTMLElement).style.width).toBe('120px');
    expect(label?.className).toContain('text-right');
    expect((inputWrapper as HTMLElement).style.width).toBe('240px');
    expect(screen.getByText('$')).toBeTruthy();
    expect(screen.getByText('USD')).toBeTruthy();
    expect(screen.getByLabelText('Show description')).toBeTruthy();
  });

  it('maps Select clear, border and list height props', () => {
    const { container } = renderSchema(
      {
        type: 'object',
        properties: {
          source: {
            type: 'string',
            title: 'Source',
            enum: [
              { label: 'Local', value: 'local' },
              { label: '1688', value: '1688' },
            ],
            'x-decorator': 'FormItem',
            'x-component': 'Select',
            'x-component-props': {
              allowClear: true,
              bordered: false,
              listHeight: 120,
            },
          },
        },
      },
      { source: 'local' },
    );

    const trigger = container.querySelector('[data-slot="select-trigger"]');

    expect(trigger?.className).toContain('border-transparent');
    expect(screen.getByLabelText('Clear selection')).toBeTruthy();
  });

  it('maps NumberInput formatting props without forwarding compatibility props', () => {
    const { form } = renderSchema(
      {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            title: 'Amount',
            'x-decorator': 'FormItem',
            'x-component': 'NumberInput',
            'x-component-props': {
              bordered: false,
              decimalSeparator: ',',
              placeholder: 'Amount',
              precision: 2,
              size: 'small',
              stringMode: true,
            },
          },
        },
      },
      { amount: '12.30' },
    );

    const input = screen.getByPlaceholderText('Amount') as HTMLInputElement;

    expect(input.type).toBe('text');
    expect(input.className).toContain('h-8');
    expect(input.className).toContain('border-transparent');
    expect(input.getAttribute('decimalSeparator')).toBeNull();

    fireEvent.change(input, { target: { value: '1,239' } });

    expect(form.values.amount).toBe('1.24');
  });

  it('maps Rating count, tooltip and clear props', () => {
    const { form } = renderSchema(
      {
        type: 'object',
        properties: {
          score: {
            type: 'number',
            title: 'Score',
            'x-decorator': 'FormItem',
            'x-component': 'Rating',
            'x-component-props': {
              allowClear: true,
              count: 3,
              tooltips: ['Low', 'Middle', 'High'],
            },
          },
        },
      },
      { score: 2 },
    );

    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByTitle('Middle')).toBeTruthy();

    fireEvent.click(screen.getByTitle('Middle'));

    expect(form.values.score).toBe(0);
  });

  it('maps Checkbox label and Switch size props', () => {
    const { container } = renderSchema(
      {
        type: 'object',
        properties: {
          accepted: {
            type: 'boolean',
            title: 'Accepted',
            'x-decorator': 'FormItem',
            'x-component': 'Checkbox',
            'x-component-props': {
              label: 'Published',
              size: 'small',
            },
          },
          enabled: {
            type: 'boolean',
            title: 'Enabled',
            'x-decorator': 'FormItem',
            'x-component': 'Switch',
            'x-component-props': {
              size: 'large',
            },
          },
        },
      },
      { accepted: true, enabled: true },
    );

    const checkbox = screen.getByRole('checkbox');
    const switchControl = container.querySelector('[role="switch"]');

    expect(screen.getByText('Published')).toBeTruthy();
    expect(checkbox.className).toContain('size-3.5');
    expect(switchControl?.className).toContain('scale-110');
  });
});
