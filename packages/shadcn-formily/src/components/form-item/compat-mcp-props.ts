import type { ComponentPropDescriptions } from '@internal/mcp';
import type { FormItemProps } from './form-item-types';

type CompatibilityProps = keyof Pick<
  FormItemProps,
  | 'tooltip'
  | 'size'
  | 'layout'
  | 'addonAfter'
  | 'addonBefore'
  | 'bordered'
  | 'colon'
  | 'feedbackLayout'
  | 'fullness'
  | 'gridSpan'
  | 'inset'
  | 'labelAlign'
  | 'labelCol'
  | 'labelWidth'
  | 'labelWrap'
  | 'shallow'
  | 'tooltipLayout'
  | 'wrapperAlign'
  | 'wrapperCol'
  | 'wrapperWidth'
  | 'wrapperWrap'
>;

export const formItemCompatibilityProps: ComponentPropDescriptions<CompatibilityProps> = {
  tooltip: 'Fallback description shown as text or in a help popover.',
  size: 'Size forwarded to the field control.',
  layout: 'Vertical, horizontal or inline field layout.',
  addonAfter: 'Content rendered after the control.',
  addonBefore: 'Content rendered before the control.',
  bordered: 'Adds a border around the field container.',
  colon: 'Adds a colon after the field label.',
  feedbackLayout: 'Controls validation feedback; none hides it.',
  fullness: 'Makes the control fill the available width.',
  gridSpan: 'Number of grid columns occupied by the field.',
  inset: 'Adds horizontal padding to the field.',
  labelAlign: 'Aligns label content left or right.',
  labelCol: 'Label width as a fraction of a 24-column grid.',
  labelWidth: 'Explicit label width.',
  labelWrap: 'Whether label content can wrap.',
  shallow: 'Accepted Formily compatibility option.',
  tooltipLayout: 'Use icon to show the description in a help popover.',
  wrapperAlign: 'Aligns control wrapper content.',
  wrapperCol: 'Control width as a fraction of a 24-column grid.',
  wrapperWidth: 'Explicit control wrapper width.',
  wrapperWrap: 'Whether control wrapper content can wrap.',
};
