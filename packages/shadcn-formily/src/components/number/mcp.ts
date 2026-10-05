import type { ComponentMeta, OwnProps } from '@internal/mcp';
import type { NumberInputProps } from './NumberInput';
import { defineProps } from '@internal/mcp';

type NumberInputOwnProps = OwnProps<NumberInputProps, 'input'>;

export const meta: ComponentMeta<NumberInputOwnProps> = {
  name: 'NumberInput',
  category: 'Formily Inputs',
  description:
    'A Formily-connected numeric input that maps form values through number input props.',
  htmlElement: 'input',
  props: defineProps<NumberInputOwnProps>({
    bordered: 'Whether the input has a visible border.',
    decimalSeparator: 'Separator used for decimal input.',
    formatter: 'Formats the displayed numeric value.',
    keyboard: 'Accepted keyboard compatibility option.',
    parser: 'Parses input into a numeric or string value.',
    precision: 'Number of decimal places.',
    stringMode: 'Keeps the field value as a string.',
    suffix: 'Forwarded to the underlying UI component.',
    groupClassName: 'Forwarded to the underlying UI component.',
    prefixClassName: 'Forwarded to the underlying UI component.',
    suffixClassName: 'Forwarded to the underlying UI component.',
  }),
  examples: [
    {
      title: 'Declarative schema field',
      code: `<SchemaField.Number name="quantity" title="Quantity" x-decorator="FormItem" x-component="NumberInput" />`,
    },
    {
      title: 'JSON schema for form renderer',
      code: `{
  type: 'object',
  properties: {
    quantity: {
      type: 'number',
      title: 'Quantity',
      'x-decorator': 'FormItem',
      'x-component': 'NumberInput',
    },
  },
}`,
    },
  ],
  keywords: ['formily', 'number', 'input'],
};
