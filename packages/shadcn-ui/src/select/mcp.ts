import type { ComponentMeta, DocumentedProps } from '@internal/mcp';
import type { SelectProps } from './Select';
import { defineProps } from '@internal/mcp';

// Derive the documented prop set from the component's own props type so that a
// newly added prop is a compile error until it is documented here. `SelectProps`
// extends the trigger's (button) props, so native attributes are stripped; the
// native names the component redefines are re-added via the extra-props
// parameter.
type SelectDocumentedProps = DocumentedProps<
  SelectProps,
  'button',
  'id' | 'value' | 'onChange' | 'name' | 'disabled' | 'className'
>;

export const meta: ComponentMeta<SelectDocumentedProps> = {
  name: 'Select',
  category: 'Forms',
  htmlElement: 'button',
  description:
    'An options dropdown with simple and searchable modes, single or multiple selection, custom triggers and paged search results.',
  props: defineProps<SelectDocumentedProps>({
    mode: 'Use simple for the Radix dropdown or searchable for the search popup.',
    multiple: 'Enables multiple selected values in searchable mode.',
    label: 'Accessible label for the searchable command menu.',
    filter: 'Custom ranking function for searchable options.',
    shouldFilter: 'Whether the command menu filters options locally.',
    loop: 'Wraps keyboard navigation through searchable options.',
    disablePointerSelection: 'Disables pointer selection in the command menu.',
    vimBindings: 'Enables vim keyboard bindings in the command menu.',
    searchPlaceholder: 'Placeholder for the searchable mode input.',
    searchValue: 'Controlled search text.',
    defaultSearchValue: 'Initial search text when uncontrolled.',
    onSearch: 'Called when search text changes.',
    emptyText: 'Message shown when there are no matching options.',
    clearText: 'Label for clearing searchable selections.',
    hasMore: 'Indicates that more options can be loaded.',
    loadMoreText: 'Message shown when more options are available.',
    loading: 'Shows the loading state.',
    loadingText: 'Message shown while loading options.',
    onPopupScroll: 'Receives popup scroll events for loading more options.',
    selectedText: 'Text used in the selected count summary.',
    readOnly: 'Prevents changes to the searchable selection.',
    contentClassName: 'Classes applied to the searchable popup.',
    triggerClassName: 'Classes applied to the searchable trigger.',
    matchTriggerWidth: 'Matches the searchable popup width to its trigger.',
    renderTrigger: 'Custom searchable trigger renderer.',
    options:
      'Selectable options as `{ label, value }[]` where value is a string or number.',
    value: 'Controlled string value, or string array for searchable multiple selection.',
    onChange: 'Called with the selected string or string array when selection changes.',
    placeholder: 'Placeholder text shown before a value is selected.',
    contentProps: 'Props forwarded to the underlying select content popover.',
    keyboardMode: {
      description:
        'How arrow keys behave: "dropdown" opens the menu, "cycle" steps through options in place.',
      type: '"cycle" | "dropdown"',
      defaultValue: '"dropdown"',
    },
    position: {
      description: 'Dropdown positioning strategy.',
      type: '"item-aligned" | "popper"',
    },
    clearable: {
      description: 'Shows a clear button when a value is selected.',
      type: 'boolean',
      defaultValue: 'false',
    },
    disabled: 'Disables the select trigger.',
    name: 'Name used when the select participates in native form submission.',
    required: 'Marks the select as required.',
    id: 'Optional id attribute applied to the select trigger.',
    className: 'Additional CSS class applied to the select trigger.',
    open: {
      description: 'Controlled open state of the dropdown.',
      type: 'boolean',
    },
    onOpenChange: {
      description: 'Called when the dropdown opens or closes.',
      type: '(open: boolean) => void',
    },
    size: {
      description: 'Controls the trigger height.',
      type: '"sm" | "default"',
      defaultValue: '"default"',
    },
    asChild: {
      description:
        'Render the trigger behavior and styles through the child element instead of a native button.',
      type: 'boolean',
      defaultValue: 'false',
    },
  }),
  examples: [
    {
      title: 'Basic select',
      code: '<Select value={value} onChange={setValue} options={[{ label: "One", value: "1" }, { label: "Two", value: "2" }]} placeholder="Choose…" />',
    },
    {
      title: 'Clearable select',
      code: '<Select value={value} onChange={setValue} options={options} clearable />',
    },
  ],
  related: ['Combobox', 'ColorSelect'],
  keywords: ['select', 'dropdown', 'options', 'form'],
};
