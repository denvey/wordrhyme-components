import { describe, it, expectTypeOf } from 'vitest';
import type { CrudHookEventMap } from './hook-types';
import type { ExportInput, ListInput } from './config';

// ============================================================
// 测试用 Schema 类型
// ============================================================

interface CreateCustomer {
  name: string;
  email: string;
  organizationId: string;
}

interface UpdateCustomer {
  name?: string;
  email?: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// CrudHookEventMap 类型推导测试
// ============================================================

type TestMap = CrudHookEventMap<
  'crm',
  'customers',
  CreateCustomer,
  UpdateCustomer,
  Customer
>;

type ProductListInput = ListInput & {
  include?: { skus?: boolean };
};

type ProductGetInput = {
  id: string;
  include?: { skus?: boolean };
};

type ProductExportInput = ExportInput & {
  format?: 'csv' | 'xlsx';
};

type CustomInputMap = CrudHookEventMap<
  'shop',
  'products',
  CreateCustomer,
  UpdateCustomer,
  Customer,
  ProductListInput,
  ProductGetInput,
  ProductExportInput
>;

describe('CrudHookEventMap 类型推导', () => {
  // === 生命周期 Hook ===

  it('beforeCreate 应推导为 CreateInput 类型', () => {
    expectTypeOf<TestMap['crm.customers.beforeCreate']>().toEqualTypeOf<CreateCustomer>();
  });

  it('afterCreate 应推导为 SelectModel 类型', () => {
    expectTypeOf<TestMap['crm.customers.afterCreate']>().toEqualTypeOf<Customer>();
  });

  it('beforeUpdate 应推导为 { id, data } 结构', () => {
    expectTypeOf<TestMap['crm.customers.beforeUpdate']>().toEqualTypeOf<{
      id: string;
      data: UpdateCustomer;
    }>();
  });

  it('afterUpdate 应推导为 SelectModel 类型', () => {
    expectTypeOf<TestMap['crm.customers.afterUpdate']>().toEqualTypeOf<Customer>();
  });

  it('beforeDelete 应推导为 { id } 结构', () => {
    expectTypeOf<TestMap['crm.customers.beforeDelete']>().toEqualTypeOf<{ id: string }>();
  });

  it('afterDelete 应推导为 SelectModel 类型', () => {
    expectTypeOf<TestMap['crm.customers.afterDelete']>().toEqualTypeOf<Customer>();
  });

  // === tRPC Procedure Hook ===

  it('create procedure hook 应推导为 CreateInput 类型', () => {
    expectTypeOf<TestMap['crm.customers.create']>().toEqualTypeOf<CreateCustomer>();
  });

  it('update procedure hook 应推导为 { id, data } 结构', () => {
    expectTypeOf<TestMap['crm.customers.update']>().toEqualTypeOf<{
      id: string;
      data: UpdateCustomer;
    }>();
  });

  it('delete procedure hook 应推导为 string (id)', () => {
    expectTypeOf<TestMap['crm.customers.delete']>().toEqualTypeOf<string>();
  });

  it('get procedure hook 应推导为 string (id)', () => {
    expectTypeOf<TestMap['crm.customers.get']>().toEqualTypeOf<string>();
  });

  it('list procedure hook 应推导为完整 ListInput 结构', () => {
    expectTypeOf<TestMap['crm.customers.list']>().toEqualTypeOf<{
      page: number;
      perPage: number;
      sort?: Array<{ id: string; desc: boolean }>;
      filters?: Array<{
        id: string;
        value: string | string[];
        variant: string;
        operator: string;
        filterId: string;
      }>;
      joinOperator: 'and' | 'or';
    }>();
  });

  it('deleteMany procedure hook 应推导为 string[]', () => {
    expectTypeOf<TestMap['crm.customers.deleteMany']>().toEqualTypeOf<string[]>();
  });

  it('updateMany procedure hook 应推导为 { ids, data } 结构', () => {
    expectTypeOf<TestMap['crm.customers.updateMany']>().toEqualTypeOf<{
      ids: string[];
      data: UpdateCustomer;
    }>();
  });

  it('upsert procedure hook 应推导为 CreateInput 类型', () => {
    expectTypeOf<TestMap['crm.customers.upsert']>().toEqualTypeOf<CreateCustomer>();
  });

  it('export procedure hook 应推导为完整 ExportInput 结构', () => {
    expectTypeOf<TestMap['crm.customers.export']>().toEqualTypeOf<{
      sort?: Array<{ id: string; desc: boolean }>;
      filters?: Array<{
        id: string;
        value: string | string[];
        variant: string;
        operator: string;
        filterId: string;
      }>;
      joinOperator?: 'and' | 'or';
      limit?: number;
    }>();
  });

  it('import procedure hook 应推导为 ImportInput 结构', () => {
    expectTypeOf<TestMap['crm.customers.import']>().toEqualTypeOf<{
      rows: unknown[];
      onConflict?: 'skip' | 'upsert' | 'error';
    }>();
  });

  it('createMany procedure hook 应推导为 CreateInput[]', () => {
    expectTypeOf<TestMap['crm.customers.createMany']>().toEqualTypeOf<CreateCustomer[]>();
  });

  it('可自定义 list/get/export procedure hook 输入类型', () => {
    expectTypeOf<
      CustomInputMap['shop.products.list']
    >().toEqualTypeOf<ProductListInput>();
    expectTypeOf<CustomInputMap['shop.products.get']>().toEqualTypeOf<ProductGetInput>();
    expectTypeOf<
      CustomInputMap['shop.products.export']
    >().toEqualTypeOf<ProductExportInput>();
  });

  // === 多插件/资源不冲突 ===

  it('不同插件的 HookEventMap 不冲突', () => {
    type ShopMap = CrudHookEventMap<
      'shop',
      'products',
      { title: string; price: number },
      { title?: string; price?: number },
      { id: string; title: string; price: number }
    >;

    // shop 和 crm 的 key 完全独立
    expectTypeOf<ShopMap['shop.products.beforeCreate']>().toEqualTypeOf<{
      title: string;
      price: number;
    }>();

    // CRM 的类型不受影响
    expectTypeOf<TestMap['crm.customers.beforeCreate']>().toEqualTypeOf<CreateCustomer>();
  });
});
