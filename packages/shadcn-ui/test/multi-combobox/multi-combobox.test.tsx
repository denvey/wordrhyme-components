import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { MultiCombobox } from '../../src/multi-combobox';

Element.prototype.scrollIntoView ??= () => {};

describe('MultiCombobox', () => {
  it('renders its popover inside a sheet so modal scroll locking does not block options', async () => {
    const { container } = render(
      <div data-slot="sheet-content">
        <MultiCombobox options={[{ value: 'option-1', label: 'Option 1' }]} />
      </div>,
    );

    fireEvent.click(screen.getByRole('combobox'));

    const popover = await screen.findByRole('dialog');

    expect(popover.closest('[data-slot="sheet-content"]')).toBe(container.firstChild);
  });
});
