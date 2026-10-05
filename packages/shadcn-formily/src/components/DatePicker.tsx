'use client';

import type { DatePickerProps } from '@wordrhyme/shadcn-ui';
import { connect, mapProps } from '@formily/react';
import { DatePicker as ShadcnDatePicker } from '@wordrhyme/shadcn-ui';

/** Keep value conversion and UI in the shared picker. */
function BaseDatePicker(props: DatePickerProps) {
  return <ShadcnDatePicker {...props} />;
}

export const DatePicker = connect(BaseDatePicker, mapProps());
