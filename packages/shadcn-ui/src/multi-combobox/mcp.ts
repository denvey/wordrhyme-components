import type { ComponentMeta } from '@internal/mcp';
import type { MultiComboboxProps } from './MultiCombobox';

type DocumentedProps = keyof Pick<
  MultiComboboxProps,
  | 'options'
  | 'value'
  | 'onChange'
  | 'selectionMode'
  | 'onSearch'
  | 'onPopupScroll'
  | 'renderTrigger'
  | 'loading'
>;

export const meta: ComponentMeta<DocumentedProps> = {
  name: 'MultiCombobox',
  category: 'Forms',
  description:
    'Searchable single or multiple selection with custom triggers and paged options.',
  props: {
    options: 'Options with value, label, search text and disabled state.',
    value: 'Controlled selected values.',
    onChange: 'Called with the next selected values.',
    selectionMode: 'Single or multiple selection.',
    onSearch: 'Called when the search text changes.',
    onPopupScroll: 'Receives popup scroll events for loading more options.',
    renderTrigger: 'Custom trigger renderer.',
    loading: 'Shows the loading state.',
  },
  examples: [
    {
      title: 'Basic usage',
      code: '<MultiCombobox options={options} value={values} onChange={setValues} />',
    },
  ],
  keywords: ['multi-combobox', 'forms'],
};
