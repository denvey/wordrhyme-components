import { connect } from '@formily/react';
import { Separator as ShadcnSeparator } from '@pixpilot/shadcn';
import type * as React from 'react';

/**
 * Formily-connected Separator component
 * A visual divider for content sections
 */
export const Separator: React.ComponentType<
  React.ComponentProps<typeof ShadcnSeparator>
> = connect(ShadcnSeparator);
