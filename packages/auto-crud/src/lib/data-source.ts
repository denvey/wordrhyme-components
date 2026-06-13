/**
 * 数据源抽象接口
 * 支持任意后端实现（REST API, tRPC, GraphQL 等）
 */

/**
 * 列表查询参数
 */
export interface ListParams {
  page: number;
  perPage: number;
  sort?: Array<{ id: string; desc: boolean }>;
  search?: string;
  filters?: Array<{
    id: string;
    value: any;
    operator?: string;
  }>;
}

/**
 * 列表查询结果
 */
export interface ListResult<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}

/**
 * 数据源接口
 *
 * @example
 * ```typescript
 * // 使用自己项目的请求封装
 * const taskDataSource: DataSource<Task> = {
 *   list: (params) => request.post("/api/tasks/list", params),
 *   get: (id) => request.get(`/api/tasks/${id}`),
 *   create: (data) => request.post("/api/tasks", data),
 *   update: (id, data) => request.put(`/api/tasks/${id}`, data),
 *   delete: (id) => request.delete(`/api/tasks/${id}`),
 * };
 * ```
 */
export interface DataSource<T = any> {
  /**
   * 列表查询（分页、排序、过滤）
   */
  list(params: ListParams): Promise<ListResult<T>>;

  /**
   * 获取单条记录
   */
  get(id: string | number): Promise<T>;

  /**
   * 创建记录
   */
  create(data: Partial<T>): Promise<T>;

  /**
   * 更新记录
   */
  update(id: string | number, data: Partial<T>): Promise<T>;

  /**
   * 删除记录
   */
  delete(id: string | number): Promise<void>;

  /**
   * 批量删除（可选）
   */
  deleteMany?(ids: Array<string | number>): Promise<void>;
}

/**
 * tRPC 路由适配器
 * 将 tRPC 路由转换为 DataSource 接口
 *
 * @example
 * ```typescript
 * import { createTRPCDataSource } from "@wordrhyme/auto-crud";
 *
 * const taskDataSource = createTRPCDataSource(trpc.tasks);
 *
 * <AutoCrudTable schema={schema} dataSource={taskDataSource} />
 * ```
 */
export function createTRPCDataSource<T = any>(router: any): DataSource<T> {
  return {
    list: (params) => router.list.query(params),
    get: (id) => router.get.query({ id }),
    create: (data) => router.create.mutate(data),
    update: (id, data) => router.update.mutate({ id, data }),
    delete: (id) => router.delete.mutate({ id }),
    deleteMany: (ids) => router.deleteMany?.mutate({ ids }),
  };
}

/**
 * 内存数据源（用于测试/演示）
 *
 * @example
 * ```typescript
 * const mockDataSource = createMemoryDataSource([
 *   { id: 1, title: "Task 1", status: "todo" },
 *   { id: 2, title: "Task 2", status: "done" },
 * ]);
 *
 * <AutoCrudTable schema={schema} dataSource={mockDataSource} />
 * ```
 */
export function createMemoryDataSource<T extends { id: string | number }>(
  initialData: T[] = [],
): DataSource<T> {
  let data = [...initialData];
  let nextId = Math.max(...data.map((item) => Number(item.id)), 0) + 1;

  return {
    async list(params: ListParams): Promise<ListResult<T>> {
      let filtered = [...data];

      // 简单过滤
      if (params.filters) {
        filtered = filtered.filter((item) => {
          return params.filters!.every((filter) => {
            const value = (item as any)[filter.id];
            return value === filter.value;
          });
        });
      }

      // 排序
      if (params.sort && params.sort.length > 0) {
        const sortItem = params.sort[0]!;
        filtered.sort((a, b) => {
          const aVal = (a as any)[sortItem.id];
          const bVal = (b as any)[sortItem.id];
          const result = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          return sortItem.desc ? -result : result;
        });
      }

      // 分页
      const start = (params.page - 1) * params.perPage;
      const end = start + params.perPage;
      const paginatedData = filtered.slice(start, end);

      return {
        data: paginatedData,
        total: filtered.length,
        page: params.page,
        perPage: params.perPage,
      };
    },

    async get(id: string | number): Promise<T> {
      const item = data.find((item) => item.id === id);
      if (!item) throw new Error(`Item with id ${id} not found`);
      return item;
    },

    async create(newData: Partial<T>): Promise<T> {
      const newItem = {
        ...newData,
        id: nextId++,
      } as T;
      data.push(newItem);
      return newItem;
    },

    async update(id: string | number, updateData: Partial<T>): Promise<T> {
      const index = data.findIndex((item) => item.id === id);
      if (index === -1) throw new Error(`Item with id ${id} not found`);

      const updated = {
        ...data[index]!,
        ...updateData,
      } as T;
      data[index] = updated;
      return updated;
    },

    async delete(id: string | number): Promise<void> {
      const index = data.findIndex((item) => item.id === id);
      if (index === -1) throw new Error(`Item with id ${id} not found`);
      data.splice(index, 1);
    },

    async deleteMany(ids: Array<string | number>): Promise<void> {
      data = data.filter((item) => !ids.includes(item.id));
    },
  };
}
