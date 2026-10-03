import type { ComponentMeta } from '@internal/mcp';
import type { FacetedProps } from './Faceted';

type DocumentedProps = keyof Pick<
  FacetedProps<boolean>,
  'value' | 'onValueChange' | 'multiple' | 'open' | 'onOpenChange'
>;

export const meta: ComponentMeta<DocumentedProps> = {
  name: 'Faceted',
  category: 'Forms',
  description: 'Composable searchable filters with single or multiple selection.',
  props: {
    value: 'Controlled selected value or values.',
    onValueChange: 'Called when selection changes.',
    multiple: 'Enables multiple selected values.',
    open: 'Controlled popover visibility.',
    onOpenChange: 'Called when visibility changes.',
  },
  examples: [
    {
      title: 'Basic usage',
      code: '<Faceted multiple value={values} onValueChange={setValues}><FacetedTrigger>Filter</FacetedTrigger><FacetedContent><FacetedList><FacetedItem value="active">Active</FacetedItem></FacetedList></FacetedContent></Faceted>',
    },
  ],
  keywords: ['faceted', 'forms'],
};
