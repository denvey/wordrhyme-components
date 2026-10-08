import type { SliderProps } from '@wordrhyme/shadcn-ui';
import type { FC } from 'react';
import { connect } from '@formily/react';

import { Slider as ShadcnSlider } from '@wordrhyme/shadcn-ui';
import { sliderMapProps } from './map-props';

export type { SliderProps } from '@wordrhyme/shadcn-ui';

/**
 * Formily-connected Slider component
 * Range input for selecting numeric values
 */
export const Slider: FC<SliderProps> = connect(ShadcnSlider, sliderMapProps);
