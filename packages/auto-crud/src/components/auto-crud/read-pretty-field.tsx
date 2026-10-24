import { createContext, useContext } from 'react';
import { useField, useFieldSchema } from '@formily/react';
import type { Field } from '@formily/core';
import { Badge } from '@wordrhyme/shadcn';
import { formatDate, useDateFormatterVersion } from '@/lib/format';
import { zhCN } from '@/i18n/locale';

export const ReadPrettyBooleanLocale = createContext(zhCN.boolean);
export const ReadPrettyRenderers = createContext<Record<string, () => React.ReactNode>>(
  {},
);

interface ReadPrettyValueProps {
  value: unknown;
  options?: Array<{ value?: unknown; label?: React.ReactNode }>;
  date?: boolean;
}

export function ReadPrettyField({ options }: Pick<ReadPrettyValueProps, 'options'>) {
  const field = useField<Field>();
  const schema = useFieldSchema();
  const renderers = useContext(ReadPrettyRenderers);
  const renderCustomValue = renderers[field.path.toString()];

  return renderCustomValue ? (
    renderCustomValue()
  ) : (
    <ReadPrettyValue
      value={field.value}
      options={options?.length ? options : field.dataSource}
      date={schema['x-component'] === 'DatePicker'}
    />
  );
}

export function ReadPrettyValue({ value, options: choices, date }: ReadPrettyValueProps) {
  const booleanLocale = useContext(ReadPrettyBooleanLocale);
  useDateFormatterVersion();

  const renderValue = (item: unknown): React.ReactNode => {
    if (item == null || item === '')
      return <span className="text-muted-foreground">-</span>;
    const option = choices?.find((choice) => String(choice.value) === String(item));
    if (option) {
      return Array.isArray(value) ? (
        <Badge variant="secondary" className="font-normal">
          {option.label}
        </Badge>
      ) : (
        option.label
      );
    }
    if (typeof item === 'boolean') return item ? booleanLocale.true : booleanLocale.false;
    if (item instanceof Date || date) {
      return formatDate(item as Date | string | number);
    }
    if (typeof item === 'object') {
      return (
        <pre className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap break-words">
          {JSON.stringify(item, null, 2)}
        </pre>
      );
    }
    return String(item);
  };

  return (
    <div className="min-w-0 whitespace-pre-wrap break-words text-base leading-6 text-foreground">
      {Array.isArray(value) ? (
        value.length ? (
          <div className="flex flex-wrap gap-2">
            {value.map((item, index) => (
              <span key={index}>{renderValue(item)}</span>
            ))}
          </div>
        ) : (
          renderValue(null)
        )
      ) : (
        renderValue(value)
      )}
    </div>
  );
}
