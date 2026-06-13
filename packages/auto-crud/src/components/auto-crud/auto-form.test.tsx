import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AutoForm } from './auto-form';

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  cleanup();
});

const schema = z.object({
  country: z.string().optional(),
});

const multiSchema = z.object({
  countries: z.array(z.string()).optional(),
});

function renderComboboxForm(onSubmit = vi.fn()) {
  return render(
    <AutoForm
      schema={schema}
      onSubmit={onSubmit}
      overrides={{
        country: {
          title: 'Country',
          'x-component': 'Combobox',
          'x-component-props': {
            placeholder: 'Select country',
            searchPlaceholder: 'Search country',
            emptyText: 'No country found',
            options: [
              { value: 'CN', label: '中国', searchText: ['China', 'zhongguo'] },
              { value: 'US', label: '美国', searchText: ['United States'] },
            ],
          },
        },
      }}
    />,
  );
}

function renderMultiComboboxForm(onSubmit = vi.fn()) {
  return render(
    <AutoForm
      schema={multiSchema}
      onSubmit={onSubmit}
      overrides={{
        countries: {
          title: 'Countries',
          'x-component': 'MultiCombobox',
          'x-component-props': {
            placeholder: 'Select countries',
            searchPlaceholder: 'Search countries',
            emptyText: 'No countries found',
            options: [
              { value: 'CN', label: '中国', searchText: ['China', 'zhongguo'] },
              { value: 'US', label: '美国', searchText: ['United States'] },
              { value: 'JP', label: '日本', searchText: ['Japan'] },
            ],
          },
        },
      }}
    />,
  );
}

describe('AutoForm Combobox', () => {
  it('matches options by label while preserving the option value', async () => {
    const onSubmit = vi.fn();
    renderComboboxForm(onSubmit);

    fireEvent.click(
      screen.getByText('Select country').closest('button') as HTMLButtonElement,
    );
    fireEvent.change(screen.getByPlaceholderText('Search country'), {
      target: { value: '中' },
    });

    await waitFor(() => {
      expect(screen.getByText('中国')).toBeTruthy();
      expect(screen.queryByText('美国')).toBeNull();
    });

    fireEvent.click(screen.getByText('中国'));

    expect(screen.getByText('中国')).toBeTruthy();

    fireEvent.click(screen.getByText('创建'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ country: 'CN' });
    });
  });

  it('matches options by searchText', async () => {
    renderComboboxForm();

    fireEvent.click(
      screen.getByText('Select country').closest('button') as HTMLButtonElement,
    );
    fireEvent.change(screen.getByPlaceholderText('Search country'), {
      target: { value: 'China' },
    });

    await waitFor(() => {
      expect(screen.getByText('中国')).toBeTruthy();
      expect(screen.queryByText('美国')).toBeNull();
    });
  });

  it('keeps the option list scrollable', () => {
    renderComboboxForm();

    fireEvent.click(
      screen.getByText('Select country').closest('button') as HTMLButtonElement,
    );

    const command = document.querySelector('[data-slot="command"]');
    const group = document.querySelector('[cmdk-group]') as HTMLElement | null;

    expect(command?.className).toContain('[&_[cmdk-list]]:max-h-[360px]');
    expect(command?.className).toContain('[&_[cmdk-list]]:overflow-y-auto');
    expect(group?.style.maxHeight).toBe('300px');
    expect(group?.style.overflowY).toBe('auto');
  });
});

describe('AutoForm MultiCombobox', () => {
  it('submits multiple selected values', async () => {
    const onSubmit = vi.fn();
    renderMultiComboboxForm(onSubmit);

    fireEvent.click(
      screen.getByText('Select countries').closest('button') as HTMLButtonElement,
    );
    fireEvent.change(screen.getByPlaceholderText('Search countries'), {
      target: { value: 'China' },
    });

    await waitFor(() => {
      expect(screen.getByText('中国')).toBeTruthy();
      expect(screen.queryByText('美国')).toBeNull();
    });

    fireEvent.click(screen.getByText('中国'));
    fireEvent.change(screen.getByPlaceholderText('Search countries'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByText('美国'));

    fireEvent.click(screen.getByText('创建'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ countries: ['CN', 'US'] });
    });
  });

  it('keeps the multi-select option list scrollable', () => {
    renderMultiComboboxForm();

    fireEvent.click(
      screen.getByText('Select countries').closest('button') as HTMLButtonElement,
    );

    const group = document.querySelector('[cmdk-group]') as HTMLElement | null;

    expect(group?.style.maxHeight).toBe('300px');
    expect(group?.style.overflowY).toBe('auto');
  });
});
