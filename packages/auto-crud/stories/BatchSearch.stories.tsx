import type { Meta, StoryObj } from '@storybook/react';
import type { AutoQueryParams, Fields } from '../src';
import { z } from 'zod';
import { AutoCrudTable, useAutoCrudResource } from '../src';

const schema = z.object({
  id: z.string(),
  orderNo: z.string(),
  trackingNo: z.string(),
  sku: z.string(),
  customerId: z.number().int().positive(),
  customerEmail: z.string().email(),
  status: z.enum(['待发货', '已发货', '已完成']),
  amount: z.number(),
  createdAt: z.date(),
});
type Order = z.output<typeof schema>;
const rows: Order[] = Array.from({ length: 12 }, (_, index) => ({
  id: String(index + 1),
  orderNo: `001028${41 + index}`,
  trackingNo: `YT2026110600${31 + index}`,
  sku: ['LINEN-SHIRT-01', 'CERAMIC-MUG-02', 'CANVAS-BAG-03'][index % 3]!,
  customerId: 10001 + index,
  customerEmail: `customer${index + 1}@example.com`,
  status: (['待发货', '已发货', '已完成'] as const)[index % 3]!,
  amount: [89, 32, 48][index % 3]!,
  createdAt: new Date(Date.UTC(2026, 10, 6, 8, 48 - index)),
}));
const fields: Fields = {
  orderNo: { label: '订单编号', search: true, filter: { batch: true } },
  trackingNo: { label: '物流单号', table: false, filter: { batch: true } },
  sku: { label: '商品 SKU', filter: { batch: true } },
  customerId: { label: '客户 ID', table: false, filter: { batch: true } },
  customerEmail: { label: '客户邮箱', filter: { batch: true } },
  status: { label: '状态' },
  amount: { label: '订单金额' },
  createdAt: { label: '创建时间' },
};

function queryRows(input?: Partial<AutoQueryParams>) {
  const matches = rows.filter((row) => {
    const search = input?.search?.toLowerCase() ?? '';
    if (
      search &&
      ![row.orderNo, row.sku, row.customerEmail].some((value) =>
        value.toLowerCase().includes(search),
      )
    )
      return false;
    const filters = (input?.filters ?? []) as Array<{
      id: keyof Order;
      value: string | string[];
      operator: string;
    }>;
    const results = filters.map((filter) => {
      const value = String(row[filter.id]);
      if (filter.operator === 'inArray')
        return Array.isArray(filter.value) && filter.value.includes(value);
      if (filter.operator === 'eq') return value === filter.value;
      return value.toLowerCase().includes(String(filter.value).toLowerCase());
    });
    return (
      !results.length ||
      (input?.joinOperator === 'or' ? results.some(Boolean) : results.every(Boolean))
    );
  });
  for (const sort of [...(input?.sort ?? [])].reverse()) {
    matches.sort((left, right) => {
      const a = left[sort.id as keyof Order];
      const b = right[sort.id as keyof Order];
      if (a === b) return 0;
      return (a < b ? -1 : 1) * (sort.desc ? -1 : 1);
    });
  }
  return matches;
}

// Local procedures keep the example independent of a backend while using the real resource hook.
function mutation() {
  return {
    isPending: false,
    mutate: () => {},
    mutateAsync: async () => ({}),
  };
}
const router = {
  list: {
    useQuery: (input?: AutoQueryParams) => {
      const matches = queryRows(input);
      const perPage = input?.perPage ?? 10;
      const page = input?.page ?? 1;
      const data = {
        data: matches.slice((page - 1) * perPage, page * perPage),
        total: matches.length,
        pageCount: Math.ceil(matches.length / perPage),
      };
      return {
        data,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: async () => ({ data }),
      };
    },
  },
  export: {
    useQuery: (input?: Partial<AutoQueryParams>) => ({
      refetch: async () => {
        const data = queryRows(input);
        return { data: { data, total: data.length, hasMore: false } };
      },
    }),
  },
  create: { useMutation: mutation },
  update: { useMutation: mutation },
  delete: { useMutation: mutation },
};

function BatchSearchExample() {
  const resource = useAutoCrudResource({
    router,
    schema,
    fields,
    options: { toast: false },
  });
  return (
    <div className="space-y-5 p-6">
      <p className="text-muted-foreground text-sm">
        点击搜索框右侧图标打开批量查询，也可双击搜索框或按
        Alt+Enter。示例订单编号：00102841、00102842、00102843；客户
        ID：10001、10002、10003。
      </p>
      <AutoCrudTable
        schema={schema}
        resource={resource}
        fields={fields}
        title="订单管理"
        locale="zh-CN"
        permissions={{
          can: { create: false, update: false, delete: false, import: false },
        }}
        table={{
          search: { placeholder: '搜索订单、客户或 SKU' },
          batchSearch: { maxItems: 2000 },
        }}
      />
    </div>
  );
}

const meta = {
  title: 'Auto CRUD/Batch Search',
  component: BatchSearchExample,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof BatchSearchExample>;
export default meta;
type Story = StoryObj<typeof meta>;
export const DoubleClickSearch: Story = {};
