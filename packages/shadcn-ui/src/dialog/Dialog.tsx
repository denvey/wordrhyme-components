import {
  DialogClose as BaseDialogClose,
  DialogContent as BaseDialogContent,
  cn,
} from '@pixpilot/shadcn';
import * as React from 'react';

export interface DialogContentProps extends React.ComponentPropsWithoutRef<
  typeof BaseDialogContent
> {
  fullscreen?: boolean;
}

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof BaseDialogContent>,
  DialogContentProps
>(({ className, fullscreen = false, ...props }, ref) => (
  <BaseDialogContent
    ref={ref}
    className={cn(
      'max-h-[calc(100%-2rem)] sm:max-h-[calc(100%-2rem)] w-fit max-w-[calc(100%-2rem)] sm:max-w-[calc(100%-2rem)] flex min-h-0 flex-col gap-4 px-6 py-5',
      fullscreen && 'h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-none sm:max-w-none',
      className,
    )}
    {...props}
  />
));

DialogContent.displayName = 'DialogContent';

// DialogHeader.tsx
export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="header"
      className={cn('flex shrink-0 flex-col gap-2.5', className)}
      {...props}
    />
  );
}

// DialogBody.tsx
export function DialogBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="body"
      className={cn('min-h-0 flex-1 overflow-auto -mx-6 px-6', className)}
      {...props}
    />
  );
}

// DialogFooter.tsx
export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="footer"
      className={cn('flex shrink-0 justify-end space-x-2', className)}
      {...props}
    />
  );
}

export function DialogClose({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseDialogClose>) {
  return <BaseDialogClose className={cn(className)} {...props} />;
}
