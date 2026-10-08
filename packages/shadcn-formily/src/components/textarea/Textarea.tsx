import type { Field } from '@formily/core';
import type { ComponentProps, FC } from 'react';
import { connect, mapProps } from '@formily/react';
import { cn } from '@wordrhyme/shadcn';
import { Textarea as ShadcnTextarea } from '@wordrhyme/shadcn';
import * as React from 'react';

export type TextareaProps = ComponentProps<typeof ShadcnTextarea> & {
  autoSize?: boolean | { minRows?: number; maxRows?: number };
  bordered?: boolean;
  showCount?: boolean;
};

type CompatibleTextareaProps = TextareaProps;

function CompatibleTextarea({
  autoSize,
  bordered = true,
  className,
  maxLength,
  onChange,
  showCount,
  style,
  value,
  ...props
}: CompatibleTextareaProps) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const stringValue = value == null ? '' : String(value);

  React.useLayoutEffect(() => {
    if (!autoSize || !ref.current) return;

    const textarea = ref.current;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [autoSize, stringValue]);

  const textarea = (
    <ShadcnTextarea
      {...props}
      ref={ref}
      className={cn(
        bordered === false && 'border-transparent shadow-none focus-visible:ring-0',
        autoSize && 'resize-none overflow-hidden',
        className,
      )}
      maxLength={maxLength}
      onChange={onChange}
      style={style}
      value={value}
    />
  );

  if (!showCount) return textarea;

  return (
    <div className="space-y-1">
      {textarea}
      <div className="text-muted-foreground text-right text-xs">
        {stringValue.length}
        {maxLength != null ? ` / ${maxLength}` : null}
      </div>
    </div>
  );
}

/**
 * Formily-connected Textarea component
 */
export const Textarea: FC<TextareaProps> = connect(
  CompatibleTextarea,
  mapProps((props, field) => {
    return {
      ...props,
      // eslint-disable-next-line ts/no-unsafe-assignment
      value: (field as Field).value ?? '',
    };
  }),
);
