import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { MultiCombobox } from '../../src/multi-combobox';

Element.prototype.scrollIntoView ??= () => {};

describe('multi-combobox', () => {
  it.each(['sheet-content', 'dialog-content'])(
    'portals its popover directly into the nearest %s',
    async (contentSlot) => {
      const { container } = render(
        <div data-slot={contentSlot}>
          <MultiCombobox options={[{ value: 'option-1', label: 'Option 1' }]} />
        </div>,
      );

      fireEvent.click(screen.getByRole('combobox'));

      const popover = await screen.findByRole('dialog');
      const popperWrapper = popover.closest('[data-radix-popper-content-wrapper]');

      expect(popperWrapper?.parentElement).toBe(container.firstElementChild);
    },
  );
});
