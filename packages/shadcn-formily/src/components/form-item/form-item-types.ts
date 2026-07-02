import type React from 'react';
import type { DescriptionPlacement, SyncReactNode } from '../../types';

export type LabelPlacement = 'top' | 'bottom' | 'start' | 'end';

export type FormItemLabelProps = Omit<
  React.ComponentPropsWithoutRef<'label'>,
  'children' | 'htmlFor'
> & {
  placement?: LabelPlacement;
};

export interface FormItemSlots {
  label?: FormItemLabelProps;
  description?: React.HTMLAttributes<HTMLParagraphElement>;
  inputWrapper?: React.HTMLAttributes<HTMLDivElement>;
  container?: React.HTMLAttributes<HTMLDivElement>;
  error?: React.HTMLAttributes<HTMLParagraphElement>;
}

export type { DescriptionPlacement };

export type FormItemAlign = 'left' | 'right';

export type FormItemLayout = 'vertical' | 'horizontal' | 'inline';

export type FormItemSize = 'large' | 'small' | 'default' | 'middle' | null;

export interface FormItemProps extends React.ComponentProps<'div'> {
  label?: SyncReactNode;
  description?: SyncReactNode;
  slots?: FormItemSlots;
  /**
   * Controls where `description` is rendered relative to the input.
   * - `top`: above the input
   * - `bottom`: below the input
   * - `popover`: show a help icon before the label and render the description in a hover popover
   */
  descriptionPlacement?: DescriptionPlacement;
  asterisk?: boolean;
  addonAfter?: SyncReactNode;
  addonBefore?: SyncReactNode;
  bordered?: boolean;
  colon?: boolean;
  feedbackStatus?: 'error' | 'warning' | 'success';
  feedbackLayout?: 'loose' | 'terse' | 'popover' | 'none' | null;
  feedbackText?: SyncReactNode;
  fullness?: boolean;
  gridSpan?: number;
  inset?: boolean;
  labelAlign?: FormItemAlign | null;
  labelCol?: number;
  labelWidth?: number | string;
  labelWrap?: boolean;
  layout?: FormItemLayout | null;
  shallow?: boolean;
  size?: FormItemSize;
  tooltip?: SyncReactNode;
  tooltipLayout?: 'icon' | 'text' | null;
  wrapperAlign?: FormItemAlign | null;
  wrapperCol?: number;
  wrapperWidth?: number | string;
  wrapperWrap?: boolean;
}
