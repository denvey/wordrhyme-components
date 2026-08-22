import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { MultiCombobox } from '../../src/multi-combobox';

Element.prototype.scrollIntoView ??= () => {};

describe('multi-combobox', () => {
  it('uses compact horizontal padding for the default searchable trigger', () => {
    render(
      <MultiCombobox
        options={[{ value: 'editor', label: 'Editor' }]}
        selectionMode="single"
        value={['editor']}
      />,
    );

    const trigger = screen.getByRole('combobox');

    expect(trigger.className).toContain('justify-start');
    expect(trigger.className).toContain('px-1.5');
    expect(trigger.className).toContain('py-2');

    const [selectedContent, controls] = Array.from(trigger.children);
    expect(selectedContent?.className).not.toContain('flex-1');
    expect(controls?.className).toContain('ml-auto');
    expect(controls?.className).not.toContain('-mr-1');
  });

  it('matches selected trigger text size with the searchable options', () => {
    render(
      <MultiCombobox
        options={[{ value: 'frontend', label: 'Frontend' }]}
        selectionMode="single"
        value={['frontend']}
      />,
    );

    const badge = screen.getByText('Frontend').closest('[data-slot="badge"]');

    if (!badge) {
      throw new Error('Selected option badge was not rendered');
    }

    expect(badge.className).toContain('text-sm');
  });

  it('keeps only one option active while pointing in single-selection mode', () => {
    render(
      <MultiCombobox
        options={[
          { value: 'admin', label: 'Admin' },
          { value: 'editor', label: 'Editor' },
          { value: 'viewer', label: 'Viewer' },
        ]}
        selectionMode="single"
        value={['editor']}
      />,
    );

    fireEvent.click(screen.getByRole('combobox'));

    const adminOption = screen.getByRole('option', { name: 'Admin' });
    const editorOption = screen.getByRole('option', { name: 'Editor' });

    expect(adminOption.getAttribute('data-selected')).toBe('false');
    expect(editorOption.getAttribute('data-selected')).toBe('true');

    fireEvent.pointerMove(adminOption);

    expect(adminOption.getAttribute('data-selected')).toBe('true');
    expect(editorOption.getAttribute('data-selected')).toBe('false');
    expect(editorOption.className.split(/\s+/u)).not.toContain('bg-accent');
  });

  it('keeps full labels available for truncated selected and option values', () => {
    const label = 'Backend platform and infrastructure operations';

    render(
      <MultiCombobox
        options={[
          { value: 'frontend', label: 'Frontend' },
          { value: 'backend-platform', label },
        ]}
        value={['frontend', 'backend-platform']}
      />,
    );

    const shortBadge = screen.getByText('Frontend').closest('[data-slot="badge"]');
    const badge = screen.getByText(label).closest('[data-slot="badge"]');

    if (!shortBadge || !badge) {
      throw new Error('Selected option badge was not rendered');
    }

    expect(shortBadge.className.split(/\s+/u)).toContain('shrink-0');
    expect(badge.getAttribute('title')).toBe(label);
    expect(badge.className.split(/\s+/u)).toContain('shrink');
    expect(badge.className).toContain('min-w-0');

    fireEvent.click(screen.getByRole('combobox'));

    const option = screen.getByRole('option', { name: label });
    expect(option.getAttribute('title')).toBe(label);
  });

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
