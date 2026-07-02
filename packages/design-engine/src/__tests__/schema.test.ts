import { describe, expect, it } from 'vitest';
import {
  assertValidFormilyDesignDocument,
  createDesignRegistry,
  toDesignableBehaviors,
  toDesignableResources,
  validateFormilyDesignDocument,
} from '../schema';

describe('design schema registry', () => {
  it('builds a registry from plugin contributions', () => {
    const registry = createDesignRegistry([
      {
        pluginId: 'com.wordrhyme.shop',
        blocks: [
          {
            id: 'shop.productList',
            title: 'Product List',
            surfaces: ['web'],
            defaultProps: {
              pageSize: 24,
            },
          },
        ],
        dataSources: [
          {
            id: 'shop.publicCatalog.list',
            title: 'List products',
            surfaces: ['web'],
          },
        ],
      },
    ]);

    expect(registry.blocks.get('shop.productList')?.pluginId).toBe('com.wordrhyme.shop');
    expect(registry.dataSources.has('shop.publicCatalog.list')).toBe(true);
  });

  it('filters by surface', () => {
    const registry = createDesignRegistry(
      [
        {
          pluginId: 'com.wordrhyme.shop',
          blocks: [
            {
              id: 'shop.webOnly',
              title: 'Web only',
              surfaces: ['web'],
            },
            {
              id: 'shop.adminOnly',
              title: 'Admin only',
              surfaces: ['admin'],
            },
          ],
        },
      ],
      { surface: 'web' },
    );

    expect(registry.blocks.has('shop.webOnly')).toBe(true);
    expect(registry.blocks.has('shop.adminOnly')).toBe(false);
  });

  it('rejects duplicate block ids', () => {
    expect(() =>
      createDesignRegistry([
        {
          pluginId: 'a',
          blocks: [{ id: 'dup', title: 'A' }],
        },
        {
          pluginId: 'b',
          blocks: [{ id: 'dup', title: 'B' }],
        },
      ]),
    ).toThrow('Duplicate design blocks id "dup"');
  });

  it('emits Designable-compatible resource and behavior descriptors', () => {
    const registry = createDesignRegistry([
      {
        pluginId: 'com.wordrhyme.shop',
        blocks: [
          {
            id: 'shop.productDetail',
            title: 'Product Detail',
            category: 'Shop',
            icon: 'Package',
            propsSchema: {
              type: 'object',
            },
          },
        ],
      },
    ]);

    expect(toDesignableResources(registry)).toMatchObject([
      {
        title: 'Product Detail',
        icon: 'Package',
        category: 'Shop',
        node: {
          componentName: 'Field',
          props: {
            type: 'void',
            'x-component': 'shop.productDetail',
            'x-component-props': {},
          },
        },
      },
    ]);
    expect(toDesignableBehaviors(registry)).toMatchObject([
      {
        name: 'shop.productDetail',
        selector: 'Field[x-component=shop.productDetail]',
        propsSchema: {
          type: 'object',
        },
      },
    ]);
  });
});

describe('design schema validation', () => {
  const registry = createDesignRegistry([
    {
      pluginId: 'com.wordrhyme.shop',
      blocks: [{ id: 'shop.productList', title: 'Product List' }],
    },
  ]);

  it('accepts a registered component tree', () => {
    assertValidFormilyDesignDocument(
      {
        schema: {
          type: 'object',
          properties: {
            productList: {
              type: 'void',
              'x-component': 'shop.productList',
            },
          },
        },
      },
      { registry },
    );
  });

  it('reports unknown components', () => {
    const issues = validateFormilyDesignDocument(
      {
        schema: {
          type: 'object',
          properties: {
            unknown: {
              type: 'void',
              'x-component': 'unknown.block',
            },
          },
        },
      },
      { registry },
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown_component',
          path: 'schema.properties.unknown.x-component',
        }),
      ]),
    );
  });
});
