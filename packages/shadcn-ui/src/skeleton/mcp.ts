import type { ComponentMeta } from '@internal/mcp';

export const meta: ComponentMeta<never> = {
  name: 'Skeleton',
  category: 'Feedback',
  description: 'An animated placeholder for content that is loading.',
  props: {},
  examples: [{ title: 'Basic usage', code: '<Skeleton className="h-10 w-full" />' }],
  keywords: ['skeleton', 'feedback'],
};
