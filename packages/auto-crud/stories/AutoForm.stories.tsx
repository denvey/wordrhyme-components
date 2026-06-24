import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, waitFor, within } from '@storybook/test';
import { z } from 'zod';
import { AutoForm } from '../src';

const storeFormSchema = z.object({
  name: z.string().min(1),
});

type StoreFormValues = z.output<typeof storeFormSchema>;

interface AutoFormStoryProps {
  onSubmit: (values: StoreFormValues) => void | Promise<void>;
}

function AutoFormStory({ onSubmit }: AutoFormStoryProps) {
  return (
    <AutoForm
      schema={storeFormSchema}
      onSubmit={onSubmit}
      fields={{
        name: {
          label: 'Name',
          form: {
            'x-component-props': {
              placeholder: 'Store name',
            },
          },
        },
      }}
    />
  );
}

const meta = {
  title: 'auto-crud/AutoForm',
  component: AutoFormStory,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    onSubmit: fn(),
  },
} satisfies Meta<typeof AutoFormStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Create: Story = {
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('fill required field', async () => {
      await userEvent.type(canvas.getByPlaceholderText('Store name'), 'North Store');
    });

    await step('submit form', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '创建' }));
    });

    await waitFor(async () => {
      await expect(args.onSubmit).toHaveBeenCalledWith({ name: 'North Store' });
    });
  },
};
