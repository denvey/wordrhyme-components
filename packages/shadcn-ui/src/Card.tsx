import type { ReactNode } from 'react';

import {
  CardAction,
  CardDescription,
  CardFooter,
  cn,
  Card as OrgCard,
  CardContent as OrgCardContent,
  CardHeader as OrgCardHeader,
  CardTitle as OrgCardTitle,
} from '@pixpilot/shadcn';
import React from 'react';

interface SectionCardProps extends React.ComponentProps<typeof OrgCard> {
  title?: string;
  children: ReactNode;
  marginBottom?: boolean;
}

export function Card(props: SectionCardProps) {
  const { title, children, className, marginBottom, ...other } = props;

  return (
    <OrgCard
      className={cn('py-4 sm:py-5 gap-4', { 'mb-2 sm:mb-4': marginBottom }, className)}
      {...other}
    >
      {children}
    </OrgCard>
  );
}

export function CardContent(props: React.ComponentProps<typeof OrgCardContent>) {
  const { className, ...other } = props;

  return <OrgCardContent className={cn('px-4 sm:px-6', className)} {...other} />;
}

export function CardTitle({
  className,
  ...props
}: React.ComponentProps<typeof OrgCardTitle>) {
  return (
    <OrgCardTitle
      className={cn('text-lg font-semibold tracking-tight', className)}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.ComponentProps<typeof OrgCardHeader>) {
  return <OrgCardHeader className={cn('gap-1.5', className)} {...props} />;
}

export { CardAction, CardDescription, CardFooter };

Card.displayName = 'Card';
CardContent.displayName = 'CardContent';
CardTitle.displayName = 'CardTitle';
