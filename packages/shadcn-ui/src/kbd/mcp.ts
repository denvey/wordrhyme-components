import type { ComponentMeta } from '@internal/mcp';

export const meta: ComponentMeta<never> = {
  name: 'Kbd',
  category: 'Display',
  description: 'A keyboard key label, composable with KbdGroup for shortcuts.',
  props: {},
  examples: [
    { title: 'Basic usage', code: '<KbdGroup><Kbd>Ctrl</Kbd><Kbd>K</Kbd></KbdGroup>' },
  ],
  keywords: ['kbd', 'display'],
};
