import type { ComponentMeta } from '@internal/mcp';
import type { SortableRootProps } from './Sortable';

type DocumentedProps = keyof Pick<
  SortableRootProps<string>,
  'value' | 'onValueChange' | 'getItemValue' | 'orientation' | 'onMove'
>;

export const meta: ComponentMeta<DocumentedProps> = {
  name: 'Sortable',
  category: 'Layout',
  description: 'Composable sortable lists with pointer and keyboard drag-and-drop.',
  props: {
    value: 'Controlled ordered list.',
    onValueChange: 'Called with the reordered list.',
    getItemValue: 'Returns a stable item ID; required for object items.',
    orientation: 'Vertical, horizontal or mixed sorting.',
    onMove: 'Custom callback for a completed move.',
  },
  examples: [
    {
      title: 'Basic usage',
      code: '<Sortable value={items} onValueChange={setItems}><SortableContent>{items.map(item => <SortableItem key={item} value={item} asHandle>{item}</SortableItem>)}</SortableContent></Sortable>',
    },
  ],
  keywords: ['sortable', 'layout'],
};
