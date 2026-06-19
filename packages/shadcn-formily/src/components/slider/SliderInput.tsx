import { connect } from '@formily/react';

import { SliderInput as BaseSliderInput } from '@wordrhyme/shadcn-ui';
import { sliderMapProps } from './map-props';

export const SliderInput = connect(BaseSliderInput, sliderMapProps);
