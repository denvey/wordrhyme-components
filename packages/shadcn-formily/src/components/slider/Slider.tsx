import { connect } from '@formily/react';

import { Slider as ShadcnSlider } from '@wordrhyme/shadcn-ui';
import { sliderMapProps } from './map-props';

/**
 * Formily-connected Slider component
 * Range input for selecting numeric values
 */
export const Slider = connect(ShadcnSlider, sliderMapProps);
