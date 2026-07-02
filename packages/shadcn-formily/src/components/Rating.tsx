import type React from 'react';
import { connect, mapProps } from '@formily/react';
import { cn } from '@wordrhyme/shadcn';
import { Rating as BaseRating } from '@wordrhyme/shadcn-ui';

type CompatibleRatingProps = React.ComponentProps<typeof BaseRating> & {
  allowClear?: boolean;
  allowHalf?: boolean;
  count?: number;
  tooltips?: string[];
};

function CompatibleRating({
  allowClear = true,
  allowHalf: _allowHalf,
  className,
  count,
  max,
  onValueChange,
  options,
  tooltips,
  value,
  ...props
}: CompatibleRatingProps) {
  const resolvedOptions =
    options ??
    (Array.isArray(tooltips)
      ? tooltips.map((label, index) => ({
          label,
          value: index + 1,
        }))
      : undefined);

  return (
    <BaseRating
      {...props}
      className={cn('h-9 flex items-center', className)}
      max={count ?? max}
      onValueChange={(nextValue) => {
        onValueChange?.(allowClear && value === nextValue ? 0 : nextValue);
      }}
      options={resolvedOptions}
      value={value}
    />
  );
}

/**
 * Formily-connected Rating component
 * Automatically connects shadcn-ui Rating to Formily field state
 */
export const Rating = connect(
  CompatibleRating,
  mapProps({
    onInput: 'onValueChange',
  }),
);
