import type { Decorator, Meta, StoryObj } from '@storybook/react';
import type { DesignContribution, FormilyDesignDocument } from '../src';
import { expect, within } from '@storybook/test';
import { createForm } from '@wordrhyme/formily-shadcn';
import {
  createDesignRegistry,
  FormilyDesignRenderer,
  toDesignableBehaviors,
  toDesignableResources,
  validateFormilyDesignDocument,
} from '../src';

const withDesignCanvas: Decorator = (Story) => (
  <div className="min-h-screen bg-background p-8 text-foreground">
    <Story />
  </div>
);

const meta: Meta<typeof FormilyDesignRenderer> = {
  title: 'Design Engine/Formily Adapter',
  component: FormilyDesignRenderer,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [withDesignCanvas],
};

export default meta;
type Story = StoryObj<typeof meta>;

interface ProductHeroBlockProps {
  title?: string;
  subtitle?: string;
  cta?: string;
}

interface ProductGridBlockProps {
  source?: string;
  limit?: number;
}

const shopContribution: DesignContribution = {
  pluginId: 'com.wordrhyme.shop',
  pluginVersion: '0.1.0',
  blocks: [
    {
      id: 'shop.productHero',
      title: 'Product Hero',
      category: 'Shop',
      icon: 'Package',
      component: 'ShopProductHero',
      surfaces: ['web'],
      defaultProps: {
        title: 'Featured collection',
        subtitle: 'Published products from the tenant catalog.',
      },
      propsSchema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            title: 'Title',
          },
          subtitle: {
            type: 'string',
            title: 'Subtitle',
          },
          cta: {
            type: 'string',
            title: 'CTA',
          },
        },
      },
    },
    {
      id: 'shop.productGrid',
      title: 'Product Grid',
      category: 'Shop',
      icon: 'LayoutGrid',
      component: 'ShopProductGrid',
      surfaces: ['web'],
      defaultProps: {
        source: 'local',
        limit: 8,
      },
      propsSchema: {
        type: 'object',
        properties: {
          source: {
            type: 'string',
            title: 'Source',
            enum: ['local', '1688'],
          },
          limit: {
            type: 'number',
            title: 'Limit',
          },
        },
      },
    },
    {
      id: 'shop.adminMetric',
      title: 'Admin Metric',
      surfaces: ['admin'],
    },
  ],
  dataSources: [
    {
      id: 'shop.publicCatalog.list',
      title: 'List public products',
      surfaces: ['web'],
      permission: 'shop.product.public.read',
      inputSchema: {
        type: 'object',
        properties: {
          source: {
            type: 'string',
          },
          limit: {
            type: 'number',
          },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
          },
        },
      },
    },
  ],
};

const registry = createDesignRegistry([shopContribution], { surface: 'web' });

const landingDocument: FormilyDesignDocument = {
  meta: {
    pageId: 'shop-home',
    route: '/products',
    editor: 'designable-formily',
  },
  form: {
    labelCol: 0,
    wrapperCol: 24,
  },
  schema: {
    type: 'object',
    properties: {
      hero: {
        type: 'void',
        'x-component': 'ShopProductHero',
        'x-component-props': {
          title: 'Studio Lamp',
          subtitle:
            'Local published products rendered from a Designable/Formily document.',
          cta: 'View products',
        },
      },
      grid: {
        type: 'void',
        'x-component': 'ShopProductGrid',
        'x-component-props': {
          source: 'local',
          limit: 4,
        },
      },
    },
  },
};

function ProductHeroBlock({
  title = 'Featured collection',
  subtitle = 'Published products from the tenant catalog.',
  cta = 'View products',
}: ProductHeroBlockProps) {
  return (
    <section className="rounded-lg border bg-card p-8 shadow-sm">
      <div className="max-w-3xl space-y-4">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Shop plugin block
        </p>
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="text-base text-muted-foreground">{subtitle}</p>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {cta}
        </button>
      </div>
    </section>
  );
}

function ProductGridBlock({ source = 'local', limit = 8 }: ProductGridBlockProps) {
  const products = [
    { id: 'local-1', name: 'Studio Lamp', price: '$89' },
    { id: 'local-2', name: 'Oak Desk Tray', price: '$42' },
    { id: 'local-3', name: 'Canvas Tote', price: '$28' },
    { id: 'local-4', name: 'Ceramic Cup', price: '$24' },
  ].slice(0, limit);

  return (
    <section className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Public catalog</h2>
          <p className="text-sm text-muted-foreground">
            Source: <span className="font-medium">{source}</span>
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {products.map((product) => (
          <article key={product.id} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-4 aspect-square rounded-md bg-muted" />
            <h3 className="font-medium">{product.name}</h3>
            <p className="text-sm text-muted-foreground">{product.price}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SummaryGrid({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: string | number }>;
}) {
  return (
    <section className="rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <dl className="mt-4 grid gap-3 md:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-md bg-muted p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {item.label}
            </dt>
            <dd className="mt-1 text-2xl font-semibold">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function JsonPreview({ title, value }: { title: string; value: unknown }) {
  return (
    <section className="rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <pre className="mt-4 max-h-[420px] overflow-auto rounded-md bg-muted p-4 text-xs leading-5">
        {JSON.stringify(value, null, 2)}
      </pre>
    </section>
  );
}

export const RenderedDesignDocument: Story = {
  render: () => {
    const form = createForm();

    return (
      <div className="mx-auto max-w-6xl">
        <FormilyDesignRenderer
          id="design-engine-rendered-document"
          form={form}
          document={landingDocument}
          components={{
            fields: {
              ShopProductHero: { component: ProductHeroBlock },
              ShopProductGrid: { component: ProductGridBlock },
            },
          }}
        />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Studio Lamp' }),
    ).toBeInTheDocument();
    await expect(canvas.getByText('Public catalog')).toBeInTheDocument();
    await expect(canvas.getByText('local')).toBeInTheDocument();
  },
};

export const PluginContributionRegistry: Story = {
  render: () => {
    const resources = toDesignableResources(registry);
    const behaviors = toDesignableBehaviors(registry);

    return (
      <div className="mx-auto grid max-w-6xl gap-6">
        <SummaryGrid
          title="Web surface registry"
          items={[
            { label: 'Blocks', value: registry.blocks.size },
            { label: 'Sources', value: registry.dataSources.size },
            {
              label: 'Admin filtered',
              value: registry.blocks.has('shop.adminMetric') ? 'no' : 'yes',
            },
          ]}
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <JsonPreview title="Designable resources" value={resources} />
          <JsonPreview title="Designable behaviors" value={behaviors} />
        </div>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Web surface registry')).toBeInTheDocument();
    await expect(canvas.getByText('Designable resources')).toBeInTheDocument();
    await expect(canvas.getByText('Designable behaviors')).toBeInTheDocument();
    await expect(
      canvas.getByText('Field[x-component=ShopProductGrid]', { exact: false }),
    ).toBeInTheDocument();
    await expect(canvas.getByText('yes')).toBeInTheDocument();
  },
};

export const ValidationIssues: Story = {
  render: () => {
    const issues = validateFormilyDesignDocument(
      {
        schema: {
          type: 'object',
          properties: {
            known: {
              type: 'void',
              'x-component': 'shop.productHero',
            },
            unknown: {
              type: 'void',
              'x-component': 'marketing.legacyHero',
            },
          },
        },
      },
      { registry },
    );

    return (
      <div className="mx-auto max-w-4xl rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Formily document validation</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The persisted document remains Designable/Formily output; validation only checks
          whether referenced components are contributed by installed plugins.
        </p>
        <ul className="mt-6 space-y-3">
          {issues.map((issue) => (
            <li key={`${issue.code}:${issue.path}`} className="rounded-md bg-muted p-4">
              <div className="text-sm font-medium">{issue.code}</div>
              <div className="mt-1 text-sm text-muted-foreground">{issue.message}</div>
              <code className="mt-2 block text-xs">{issue.path}</code>
            </li>
          ))}
        </ul>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Formily document validation')).toBeInTheDocument();
    await expect(canvas.getByText('unknown_component')).toBeInTheDocument();
    await expect(
      canvas.getByText('schema.properties.unknown.x-component'),
    ).toBeInTheDocument();
  },
};
