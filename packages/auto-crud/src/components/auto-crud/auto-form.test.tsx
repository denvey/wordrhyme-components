import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Field } from '@formily/core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { dataSources } from '@/lib/registries';
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
  dataSources.unregister('test.dynamic-regions');
  cleanup();
});

const schema = z.object({
  country: z.string().optional(),
});

const multiSchema = z.object({
  countries: z.array(z.string()).optional(),
});

const dependentSchema = z.object({
  customer: z.string().optional(),
  region: z.string().optional(),
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
    const viewport = document.querySelector(
      '[data-multi-combobox-viewport]',
    ) as HTMLElement | null;

    expect(command?.className).toContain(
      '[&_[data-multi-combobox-viewport]]:max-h-[360px]',
    );
    expect(command?.className).toContain(
      '[&_[data-multi-combobox-viewport]]:overflow-y-auto',
    );
    expect(viewport?.className).toContain('max-h-[300px]');
    expect(viewport?.className).toContain('overflow-y-auto');
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

    const command = document.querySelector('[data-slot="command"]');
    const viewport = document.querySelector(
      '[data-multi-combobox-viewport]',
    ) as HTMLElement | null;

    expect(command?.className).toContain(
      '[&_[data-multi-combobox-viewport]]:max-h-[360px]',
    );
    expect(command?.className).toContain(
      '[&_[data-multi-combobox-viewport]]:overflow-y-auto',
    );
    expect(viewport?.className).toContain('max-h-[300px]');
    expect(viewport?.className).toContain('overflow-y-auto');
  });
});

describe('AutoForm dynamic dataSource', () => {
  it('uses fields config for labels, form props, and dynamic dataSource', async () => {
    const loader = vi.fn(({ values }) => [
      {
        value: 'region-fields',
        label: `Fields Region ${String(values?.['customer'] ?? '')}`,
      },
    ]);

    dataSources.register('test.dynamic-regions', {
      dependencies: ['customer'],
      load: loader,
    });

    render(
      <AutoForm
        schema={dependentSchema}
        initialValues={{ customer: 'acme' }}
        onSubmit={vi.fn()}
        fields={{
          customer: {
            label: 'Customer',
          },
          region: {
            label: 'Region',
            dataSource: 'test.dynamic-regions',
            form: {
              'x-component': 'Combobox',
              'x-component-props': {
                placeholder: 'Select region',
                searchPlaceholder: 'Search region',
              },
            },
          },
        }}
      />,
    );

    await waitFor(() => {
      expect(loader).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'region',
          type: 'form',
          values: { customer: 'acme' },
        }),
      );
    });

    fireEvent.click(
      screen.getByText('Select region').closest('button') as HTMLButtonElement,
    );
    await screen.findByText('Fields Region acme');
  });

  it('loads initial options for MultiCombobox fields from dynamic dataSource', async () => {
    const loader = vi.fn(({ page, pageSize }) => {
      const options = [
        { value: 'CN', label: '中国' },
        { value: 'US', label: '美国' },
      ];

      return {
        hasMore: false,
        options: options.slice(0, pageSize ?? options.length),
      };
    });

    dataSources.register('test.dynamic-regions', {
      loadMore: true,
      pageSize: 2,
      load: loader,
    });

    render(
      <AutoForm
        schema={multiSchema}
        onSubmit={vi.fn()}
        fields={{
          countries: {
            label: 'Countries',
            dataSource: 'test.dynamic-regions',
            form: {
              'x-component': 'MultiCombobox',
              'x-component-props': {
                placeholder: 'Select countries',
                searchPlaceholder: 'Search countries',
                emptyText: 'No countries found',
              },
            },
          },
        }}
      />,
    );

    await waitFor(() => {
      expect(loader).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'countries',
          page: 1,
          pageSize: 2,
        }),
      );
    });

    fireEvent.click(
      screen.getByText('Select countries').closest('button') as HTMLButtonElement,
    );
    await screen.findByText('中国');
    await screen.findByText('美国');
  });

  it('passes search text to searchable MultiCombobox dataSource loaders', async () => {
    const loader = vi.fn(({ query, search }) => {
      expect(query).toBe(search);

      if (search === 'Sweden') {
        return {
          hasMore: false,
          options: [{ value: 'SE', label: '瑞典', searchText: ['Sweden'] }],
        };
      }

      return {
        hasMore: true,
        options: [
          { value: 'CN', label: '中国', searchText: ['China'] },
          { value: 'US', label: '美国', searchText: ['United States'] },
        ],
      };
    });

    dataSources.register('test.dynamic-regions', {
      search: true,
      loadMore: true,
      debounceMs: 0,
      pageSize: 2,
      load: loader,
    });

    render(
      <AutoForm
        schema={multiSchema}
        onSubmit={vi.fn()}
        fields={{
          countries: {
            label: 'Countries',
            dataSource: 'test.dynamic-regions',
            form: {
              'x-component': 'MultiCombobox',
              'x-component-props': {
                placeholder: 'Select countries',
                searchPlaceholder: 'Search countries',
                emptyText: 'No countries found',
              },
            },
          },
        }}
      />,
    );

    await waitFor(() => {
      expect(loader).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'countries',
          type: 'form',
          query: '',
          search: '',
        }),
      );
    });

    fireEvent.click(
      screen.getByText('Select countries').closest('button') as HTMLButtonElement,
    );
    await screen.findByText('中国');
    expect(screen.queryByText('瑞典')).toBeNull();

    fireEvent.change(screen.getByPlaceholderText('Search countries'), {
      target: { value: 'Sweden' },
    });

    await waitFor(() => {
      expect(loader).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'countries',
          page: 1,
          pageSize: 2,
          query: 'Sweden',
          search: 'Sweden',
        }),
      );
    });
    await screen.findByText('瑞典');
  });

  it('supports Formily scope reactions in fields form config', async () => {
    const loadRegions = vi.fn((field: Field) => {
      field.setDataSource([
        {
          value: 'region-scope',
          label: 'Scope Region',
        },
      ]);
    });

    render(
      <AutoForm
        schema={dependentSchema}
        onSubmit={vi.fn()}
        fields={{
          region: {
            label: 'Region',
            form: {
              'x-component': 'Combobox',
              'x-reactions': '{{$loadRegions}}',
              'x-component-props': {
                placeholder: 'Select region',
                searchPlaceholder: 'Search region',
              },
            },
          },
        }}
        scope={{
          $loadRegions: loadRegions,
        }}
      />,
    );

    await waitFor(() => {
      expect(loadRegions).toHaveBeenCalled();
    });

    fireEvent.click(
      screen.getByText('Select region').closest('button') as HTMLButtonElement,
    );
    await screen.findByText('Scope Region');
  });

  it('passes combobox search text to searchable dataSource loaders', async () => {
    const loader = vi.fn(({ query, search }) => {
      expect(query).toBe(search);

      return [
        {
          value: `region-${search || 'initial'}`,
          label: `Region ${search || 'initial'}`,
        },
      ];
    });

    dataSources.register('test.dynamic-regions', {
      search: true,
      debounceMs: 0,
      load: loader,
    });

    render(
      <AutoForm
        schema={dependentSchema}
        onSubmit={vi.fn()}
        fields={{
          region: {
            label: 'Region',
            dataSource: 'test.dynamic-regions',
            form: {
              'x-component': 'Combobox',
              'x-component-props': {
                placeholder: 'Select region',
                searchPlaceholder: 'Search region',
              },
            },
          },
        }}
      />,
    );

    await waitFor(() => {
      expect(loader).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'region',
          query: '',
          search: '',
        }),
      );
    });

    fireEvent.click(
      screen.getByText('Select region').closest('button') as HTMLButtonElement,
    );
    fireEvent.change(screen.getByPlaceholderText('Search region'), {
      target: { value: 'beta' },
    });

    await waitFor(() => {
      expect(loader).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'region',
          query: 'beta',
          search: 'beta',
        }),
      );
    });
    await screen.findByText('Region beta');
  });

  it('loads additional combobox options from paginated dataSource loaders', async () => {
    const loader = vi.fn(({ page, pageSize }) => {
      const start = ((page ?? 1) - 1) * (pageSize ?? 2);
      const options = ['alpha', 'beta', 'gamma'].slice(start, start + (pageSize ?? 2));

      return {
        hasMore: start + options.length < 3,
        options: options.map((value) => ({
          value,
          label: `Region ${value}`,
        })),
      };
    });

    dataSources.register('test.dynamic-regions', {
      loadMore: true,
      pageSize: 2,
      load: loader,
    });

    render(
      <AutoForm
        schema={dependentSchema}
        onSubmit={vi.fn()}
        fields={{
          region: {
            label: 'Region',
            dataSource: 'test.dynamic-regions',
            form: {
              'x-component': 'Combobox',
              'x-component-props': {
                placeholder: 'Select region',
                searchPlaceholder: 'Search region',
              },
            },
          },
        }}
      />,
    );

    await waitFor(() => {
      expect(loader).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'region',
          page: 1,
          pageSize: 2,
        }),
      );
    });

    fireEvent.click(
      screen.getByText('Select region').closest('button') as HTMLButtonElement,
    );
    await screen.findByText('Region alpha');
    expect(screen.queryByText('Region gamma')).toBeNull();

    const viewport = document.querySelector(
      '[data-multi-combobox-viewport]',
    ) as HTMLElement;
    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 220 },
      scrollTop: { configurable: true, value: 0, writable: true },
    });
    viewport.scrollTop = 120;
    fireEvent.scroll(viewport);

    await waitFor(() => {
      expect(viewport.scrollTop).toBe(120);
    });

    await waitFor(() => {
      expect(loader).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'region',
          page: 2,
          pageSize: 2,
        }),
      );
    });
    await screen.findByText('Region gamma');
  });

  it('loads options when a dataSource is registered after render', async () => {
    const loader = vi.fn(({ values }) => [
      {
        value: 'region-late',
        label: `Late Region ${String(values?.['customer'] ?? '')}`,
      },
    ]);

    render(
      <AutoForm
        schema={dependentSchema}
        initialValues={{ customer: 'acme' }}
        onSubmit={vi.fn()}
        overrides={{
          customer: {
            title: 'Customer',
          },
          region: {
            title: 'Region',
            'x-component': 'Combobox',
            'x-data-source': 'test.dynamic-regions',
            'x-component-props': {
              placeholder: 'Select region',
              searchPlaceholder: 'Search region',
            },
          },
        }}
      />,
    );

    expect(loader).not.toHaveBeenCalled();

    dataSources.register('test.dynamic-regions', {
      dependencies: ['customer'],
      load: loader,
    });

    await waitFor(() => {
      expect(loader).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'region',
          values: { customer: 'acme' },
        }),
      );
    });

    fireEvent.click(
      screen.getByText('Select region').closest('button') as HTMLButtonElement,
    );
    await screen.findByText('Late Region acme');
  });

  it('reloads options from registered dependency metadata and resets stale values', async () => {
    const onSubmit = vi.fn();
    const loader = vi.fn(({ values }) => [
      {
        value: 'region-1',
        label: `Region ${String(values?.['customer'] ?? '')}`,
      },
    ]);

    dataSources.register('test.dynamic-regions', {
      dependencies: ['customer'],
      reset: true,
      load: loader,
    });

    render(
      <AutoForm
        schema={dependentSchema}
        initialValues={{ customer: 'acme' }}
        onSubmit={onSubmit}
        overrides={{
          customer: {
            title: 'Customer',
          },
          region: {
            title: 'Region',
            'x-component': 'Combobox',
            'x-data-source': 'test.dynamic-regions',
            'x-component-props': {
              placeholder: 'Select region',
              searchPlaceholder: 'Search region',
            },
          },
        }}
      />,
    );

    await waitFor(() => {
      expect(loader).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'region',
          values: { customer: 'acme' },
        }),
      );
    });

    fireEvent.click(
      screen.getByText('Select region').closest('button') as HTMLButtonElement,
    );
    await screen.findByText('Region acme');
    fireEvent.click(screen.getByText('Region acme'));

    fireEvent.change(screen.getByRole('textbox', { name: 'Customer' }), {
      target: { value: 'beta' },
    });

    await waitFor(() => {
      expect(loader).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'region',
          values: { customer: 'beta' },
        }),
      );
    });

    fireEvent.click(screen.getByText('创建'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ customer: 'beta' });
    expect(onSubmit.mock.calls[0]?.[0]?.region).toBeUndefined();
  });
});
