import type { ComponentMeta } from '@internal/mcp';
import type { ActionBarProps } from './ActionBar';

type DocumentedProps = keyof Pick<
  ActionBarProps,
  'open' | 'onOpenChange' | 'portalContainer' | 'side' | 'orientation'
>;

export const meta: ComponentMeta<DocumentedProps> = {
  name: 'ActionBar',
  category: 'Actions',
  description: 'A floating toolbar for selection and batch actions.',
  props: {
    open: 'Whether the toolbar is visible.',
    onOpenChange: 'Called when the toolbar should open or close.',
    portalContainer: 'Element that hosts the toolbar portal.',
    side: 'Position above or below the viewport.',
    orientation: 'Horizontal or vertical keyboard navigation.',
  },
  examples: [
    {
      title: 'Basic usage',
      code: '<ActionBar open={selectedRows.length > 0} onOpenChange={setOpen}><ActionBarGroup><ActionBarItem onSelect={deleteSelected}>Delete</ActionBarItem></ActionBarGroup></ActionBar>',
    },
  ],
  keywords: ['action-bar', 'actions'],
};
