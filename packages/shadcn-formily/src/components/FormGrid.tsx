import { cn } from '@wordrhyme/shadcn';
import React from 'react';

export interface IFormGridProps extends React.HTMLAttributes<HTMLDivElement> {}

export function FormGrid({ className, children, ...rest }: IFormGridProps) {
  return (
    <div {...rest} className={cn('grid gap-4', className)}>
      {children}
    </div>
  );
}
