import type { ColumnSort, Row, RowData } from '@tanstack/react-table';
import type { DataTableConfig } from '@/config/data-table';
import type { FilterItemSchema } from '@/lib/parsers';

declare module '@tanstack/react-table' {
  // biome-ignore lint/correctness/noUnusedVariables: TData is used in the TableMeta interface
  interface TableMeta<TData extends RowData> {
    queryKeys?: QueryKeys;
    queryStateOptions?: import('@/hooks/use-url-state').UrlStateOptions;
  }

  // biome-ignore lint/correctness/noUnusedVariables: TData and TValue are used in the ColumnMeta interface
  interface ColumnMeta<TData extends RowData, TValue> {
    label?: string;
    index?: number;
    placeholder?: string;
    variant?: FilterVariant;
    options?: Option[];
    range?: [number, number];
    unit?: string;
    icon?: React.FC<React.SVGProps<SVGSVGElement>>;
    /** 控制在哪些筛选模式下显示（未设置则在所有模式显示） */
    modes?: Array<'simple' | 'advanced' | 'command'>;
    /** 内部：远程筛选选项搜索值 */
    autoCrudFilterSearchValue?: string;
    /** 内部：远程筛选选项搜索回调 */
    autoCrudFilterOnSearch?: (value: string) => void;
    /** 内部：是否启用本地选项过滤 */
    autoCrudFilterShouldFilter?: boolean;
    /** 内部：远程筛选当前弹窗选项，和稳定标签缓存分离 */
    autoCrudFilterOptions?: Option[];
    /** 内部：远程筛选是否还有更多选项 */
    autoCrudFilterHasMore?: boolean;
    /** 内部：远程筛选是否正在加载 */
    autoCrudFilterLoading?: boolean;
    /** 内部：远程筛选弹窗滚动回调 */
    autoCrudFilterOnPopupScroll?: React.UIEventHandler<HTMLElement>;
  }
}

export interface QueryKeys {
  page: string;
  perPage: string;
  sort: string;
  filters: string;
  joinOperator: string;
}

export interface Option {
  label: string;
  value: string;
  searchText?: string;
  count?: number;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
}

export type FilterOperator = DataTableConfig['operators'][number];
export type FilterVariant = DataTableConfig['filterVariants'][number];
export type JoinOperator = DataTableConfig['joinOperators'][number];

export interface ExtendedColumnSort<TData> extends Omit<ColumnSort, 'id'> {
  id: Extract<keyof TData, string>;
}

export interface ExtendedColumnFilter<TData> extends FilterItemSchema {
  id: Extract<keyof TData, string>;
}

export interface DataTableRowAction<TData> {
  row: Row<TData>;
  variant: 'update' | 'delete';
}
