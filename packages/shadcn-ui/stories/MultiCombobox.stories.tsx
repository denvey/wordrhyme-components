import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@wordrhyme/shadcn';

import { MultiCombobox } from '../src/multi-combobox';

const options = Array.from({ length: 24 }, (_, index) => ({
  value: `country-${index + 1}`,
  label: `Country ${index + 1}`,
}));

const SCROLL_DISTANCE = 80;
const MIN_EXPECTED_SCROLL_DELTA = 70;
const POSITION_TOLERANCE = 2;
const DETACH_OFFSET = 20;

function NestedScrollableSheet() {
  return (
    <Sheet defaultOpen>
      <SheetContent
        side="right"
        className="w-[420px] max-w-none gap-0 overflow-hidden p-0 sm:max-w-none"
      >
        <SheetHeader className="h-14 shrink-0 border-b px-4 py-3">
          <SheetTitle>Product preview</SheetTitle>
          <SheetDescription className="sr-only">
            MultiCombobox inside a separately scrollable sheet body.
          </SheetDescription>
        </SheetHeader>

        <div data-testid="preview-body" className="min-h-0 flex-1 overflow-y-auto px-4">
          <div className="flex h-64 items-end pb-4 text-sm text-muted-foreground">
            Scrollable content before the field
          </div>
          <div data-testid="combobox-row" className="pb-4">
            <MultiCombobox
              options={options}
              placeholder="Select countries"
              searchPlaceholder="Search countries"
            />
          </div>
          <div className="h-[900px] pt-4 text-sm text-muted-foreground">
            Scrollable content after the field
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const meta = {
  title: 'shadcn-ui/MultiCombobox',
  component: MultiCombobox,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MultiCombobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InsideNestedScrollableSheet: Story = {
  render: () => <NestedScrollableSheet />,
  play: async ({ canvasElement, step }) => {
    const page = within(canvasElement.ownerDocument.body);

    const previewBody = await page.findByTestId('preview-body');
    const trigger = page.getByRole('combobox');

    await step('follow the trigger while the inner sheet body scrolls', async () => {
      await userEvent.click(trigger);

      await waitFor(async () => {
        await expect(
          canvasElement.ownerDocument.querySelector('[data-slot="popover-content"]'),
        ).toBeInTheDocument();
      });

      const popover = canvasElement.ownerDocument.querySelector<HTMLElement>(
        '[data-slot="popover-content"]',
      );
      if (!popover) {
        throw new Error('Expected the multi-select popover.');
      }
      const popperWrapper = popover.closest<HTMLElement>(
        '[data-radix-popper-content-wrapper]',
      );

      if (!popperWrapper) {
        throw new Error('Expected the Radix popper wrapper.');
      }

      const triggerTopBefore = trigger.getBoundingClientRect().top;
      const popoverTopBefore = popperWrapper.getBoundingClientRect().top;

      previewBody.scrollTop += SCROLL_DISTANCE;
      previewBody.dispatchEvent(new Event('scroll', { bubbles: true }));

      await waitFor(async () => {
        const triggerDelta = trigger.getBoundingClientRect().top - triggerTopBefore;
        const popoverDelta = popperWrapper.getBoundingClientRect().top - popoverTopBefore;

        await expect(triggerDelta).toBeLessThan(-MIN_EXPECTED_SCROLL_DELTA);
        await expect(Math.abs(popoverDelta - triggerDelta)).toBeLessThan(
          POSITION_TOLERANCE,
        );
      });
    });

    await step(
      'hide the popover after its trigger leaves the inner viewport',
      async () => {
        const popover = canvasElement.ownerDocument.querySelector<HTMLElement>(
          '[data-slot="popover-content"]',
        );
        if (!popover) {
          throw new Error('Expected the multi-select popover.');
        }
        const popperWrapper = popover.closest<HTMLElement>(
          '[data-radix-popper-content-wrapper]',
        );

        if (!popperWrapper) {
          throw new Error('Expected the Radix popper wrapper.');
        }

        const viewportTop = previewBody.getBoundingClientRect().top;
        const triggerBottom = trigger.getBoundingClientRect().bottom;
        previewBody.scrollTop += triggerBottom - viewportTop + DETACH_OFFSET;
        previewBody.dispatchEvent(new Event('scroll', { bubbles: true }));

        await waitFor(async () => {
          await expect(trigger.getBoundingClientRect().bottom).toBeLessThan(viewportTop);
          await expect(popperWrapper).toHaveStyle({
            pointerEvents: 'none',
            visibility: 'hidden',
          });
        });
      },
    );
  },
};
