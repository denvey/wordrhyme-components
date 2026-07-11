import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, waitFor, within } from '@storybook/test';
import { Button } from '@wordrhyme/shadcn';
import { useState } from 'react';
import { z } from 'zod';
import { AutoForm, CrudFormModal } from '../src';

const storeFormSchema = z.object({
  name: z.string().min(1),
});

interface AutoFormStoryProps {
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
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

const regionFormSchema = z.object({
  regions: z.array(z.string()).min(1),
});

const regionOptions = Array.from({ length: 32 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');

  return {
    value: `region-${number}`,
    label: `Region ${number}`,
    searchText: [`Region ${number}`, `Area ${number}`],
  };
});

function MultiComboboxDialogStory({ onSubmit }: AutoFormStoryProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Open multi-select dialog
      </Button>
      <CrudFormModal
        open={open}
        onOpenChange={setOpen}
        mode="create"
        title="Assign regions"
        schema={regionFormSchema}
        onSubmit={onSubmit}
        overrides={{
          regions: {
            title: 'Regions',
            'x-component': 'MultiCombobox',
            'x-component-props': {
              placeholder: 'Select regions',
              searchPlaceholder: 'Search regions',
              emptyText: 'No regions found',
              options: regionOptions,
            },
          },
        }}
      />
    </>
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

export const MultiComboboxInDialog: Story = {
  render: (args) => <MultiComboboxDialogStory {...args} />,
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);

    await step('open the AutoCrud dialog and multi-select', async () => {
      await userEvent.click(
        canvas.getByRole('button', { name: 'Open multi-select dialog' }),
      );

      const dialog = await page.findByRole('dialog', { name: 'Assign regions' });
      await userEvent.click(within(dialog).getByRole('combobox'));
      await expect(
        await page.findByPlaceholderText('Search regions'),
      ).toBeInTheDocument();
    });

    await step('keep the option viewport inside the dialog and scrollable', async () => {
      const dialog = page.getByRole('dialog', { name: 'Assign regions' });
      const popover = dialog.querySelector<HTMLElement>('[data-slot="popover-content"]');
      const viewport = dialog.querySelector<HTMLElement>(
        '[data-multi-combobox-viewport]',
      );

      if (!popover || !viewport) {
        throw new Error('Expected the multi-select popover inside the dialog.');
      }

      const styles = canvasElement.ownerDocument.defaultView?.getComputedStyle(viewport);
      if (!styles) {
        throw new Error('Expected computed styles for the multi-select viewport.');
      }

      await expect(popover).toBeInTheDocument();
      await expect(styles.maxHeight).toBe('360px');
      await expect(styles.overflowY).toBe('auto');
      await expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);

      viewport.scrollTop = viewport.scrollHeight;
      viewport.dispatchEvent(new Event('scroll', { bubbles: true }));
      await expect(viewport.scrollTop).toBeGreaterThan(0);
    });

    await step('select an option after scrolling and submit', async () => {
      const dialog = page.getByRole('dialog', { name: 'Assign regions' });
      await userEvent.click(page.getByText('Region 32'));
      await userEvent.click(within(dialog).getByRole('button', { name: '创建' }));

      await waitFor(async () => {
        await expect(args.onSubmit).toHaveBeenCalledWith({
          regions: ['region-32'],
        });
      });
    });
  },
};
