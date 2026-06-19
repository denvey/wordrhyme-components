import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import React, { useState } from 'react';
import { Select } from '../src/Select';

/**
 * A customizable select component with options.
 * Built on top of shadcn/ui Select component.
 */
type StoryArgs = Partial<
  ComponentProps<typeof Select> & {
    id?: string;
  }
>;

const meta: Meta<StoryArgs> = {
  title: 'shadcn-ui/Select',
  component: Select,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],

  argTypes: {
    options: {
      control: 'object',
      description: 'Array of options to display',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text when no value is selected',
    },
    clearable: {
      control: 'boolean',
      description: 'Whether to show a clear button when a value is selected',
    },
    mode: {
      control: { type: 'radio' },
      options: ['simple', 'searchable'],
      description: 'Select interaction mode.',
    },
    multiple: {
      control: 'boolean',
      description: 'Whether searchable mode should allow multiple values.',
    },
    keyboardMode: {
      control: { type: 'radio' },
      options: ['dropdown', 'cycle'],
      description:
        'Keyboard behavior: dropdown opens first (default) or ArrowUp/ArrowDown cycles selection when closed.',
    },
  },
  decorators: [
    (Story) => (
      <div id="select-div-1" style={{ width: 200 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default select with basic options
 */
export const Default: Story = {
  args: {
    options: [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' },
    ],
    placeholder: 'Select an option',
  },
  render: function DefaultSelect(args) {
    const [value, setValue] = useState<string>('');

    return <Select {...args} value={value} onChange={setValue} />;
  },
};

/**
 * Searchable select powered by the command/popover picker.
 */
export const Searchable: Story = {
  args: {
    mode: 'searchable',
    options: [
      { value: 'admin', label: 'Admin', keywords: ['owner', 'manager'] },
      { value: 'editor', label: 'Editor', keywords: ['writer'] },
      { value: 'viewer', label: 'Viewer', keywords: ['readonly'] },
    ],
    placeholder: 'Choose a role',
    searchPlaceholder: 'Search roles...',
  },
  render: function SearchableSelect(args) {
    const [value, setValue] = useState<string>('editor');

    return <Select {...args} mode="searchable" value={value} onChange={setValue} />;
  },
};

/**
 * Searchable select with multiple values.
 */
export const SearchableMultiple: Story = {
  args: {
    mode: 'searchable',
    multiple: true,
    options: [
      { value: 'design', label: 'Design' },
      { value: 'frontend', label: 'Frontend' },
      { value: 'backend', label: 'Backend' },
      { value: 'ops', label: 'Operations' },
    ],
    placeholder: 'Choose teams',
    searchPlaceholder: 'Search teams...',
  },
  render: function SearchableMultipleSelect(args) {
    const [value, setValue] = useState<string[]>(['frontend']);

    return (
      <Select {...args} mode="searchable" multiple value={value} onChange={setValue} />
    );
  },
};

/**
 * Select with pre-selected value
 */
export const WithValue: Story = {
  args: {
    options: [
      { value: 'apple', label: 'Apple' },
      { value: 'banana', label: 'Banana' },
      { value: 'cherry', label: 'Cherry' },
    ],
    placeholder: 'Choose a fruit',
  },
  render: function WithValueSelect(args) {
    const [value, setValue] = useState<string>('banana');

    return <Select {...args} value={value} onChange={setValue} />;
  },
};

/**
 * Select with numeric values
 */
export const NumericValues: Story = {
  args: {
    options: [
      { value: 1, label: 'One' },
      { value: 2, label: 'Two' },
      { value: 3, label: 'Three' },
    ],
    placeholder: 'Select a number',
  },
  render: function NumericSelect(args) {
    const [value, setValue] = useState<string>('');

    return <Select {...args} value={value} onChange={setValue} />;
  },
};

/**
 * Select with clear button enabled
 */
export const Clearable: Story = {
  args: {
    options: [
      { value: 'apple', label: 'Apple' },
      { value: 'banana', label: 'Banana' },
      { value: 'cherry', label: 'Cherry' },
    ],
    placeholder: 'Choose a fruit',
    clearable: true,
  },
  render: function ClearableSelect(args) {
    const [value, setValue] = useState<string>('banana');

    return <Select {...args} value={value} onChange={setValue} />;
  },
};
