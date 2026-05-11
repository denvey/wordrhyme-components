import { useReducer, useCallback, useMemo, useRef, useEffect } from "react";
import { z } from "zod";
import { toast as sonnerToast } from "sonner";
import { keepPreviousData } from "@tanstack/react-query";
import { useQueryStates, parseAsInteger, parseAsStringEnum } from "@/hooks/use-url-state";
import { useReadableFilters } from "@/hooks/use-readable-filters";
import { createTableSchema } from "@/lib/schema-bridge/zod-to-columns";
import { getSortingStateParser } from "@/lib/parsers";
import { coerceRowValues } from "@/lib/import";

/**
 * Toast 适配器接口
 * 用户可以注入自己的 toast 实现
 */
export interface ToastAdapter {
  success: (message: string) => void;
  error: (message: string) => void;
  info?: (message: string) => void;
  warning?: (message: string) => void;
}

/** 默认 toast 适配器（使用 sonner） */
const defaultToastAdapter: ToastAdapter = {
  success: sonnerToast.success,
  error: sonnerToast.error,
  info: sonnerToast.info,
  warning: sonnerToast.warning,
};

/** 空 toast 适配器（禁用通知） */
export const noopToastAdapter: ToastAdapter = {
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
};

/**
 * Modal 状态类型
 */
export type ModalVariant = "dialog" | "sheet";

interface ModalState<T> {
  createOpen: boolean;
  editOpen: boolean;
  deleteOpen: boolean;
  viewOpen: boolean;
  selected: T | null;
  /** 复制源数据（用于复制行功能） */
  copySource: T | null;
  variant: ModalVariant;
}

/**
 * Modal 状态 Actions
 */
type ModalAction<T> =
  | { type: "OPEN_CREATE" }
  | { type: "OPEN_CREATE_WITH_COPY"; payload: T }
  | { type: "OPEN_EDIT"; payload: T }
  | { type: "OPEN_DELETE"; payload: T }
  | { type: "OPEN_VIEW"; payload: T }
  | { type: "CLOSE_ALL" }
  | { type: "SET_VARIANT"; payload: ModalVariant };

/**
 * Hook 返回值类型（用于判断是数据转换还是完全自定义）
 * - 返回对象 = 数据转换，继续执行默认 mutation
 * - 返回 true/false = 完全自定义，跳过默认 mutation
 */
type HookResult<T> = T | boolean;

/**
 * 统一的 hooks 配置
 */
export interface CrudHooks<TSchema extends z.ZodObject<z.ZodRawShape>, TListItem> {
  /**
   * 创建前钩子
   * - 返回对象: 作为转换后的数据，继续执行默认创建
   * - 返回 true: 表示已自定义处理成功，跳过默认创建
   * - 返回 false: 表示自定义处理失败，跳过默认创建
   */
  beforeCreate?: (values: z.infer<TSchema>) => HookResult<z.infer<TSchema>> | Promise<HookResult<z.infer<TSchema>>>;
  /**
   * 更新前钩子
   * - 返回对象: 作为转换后的数据，继续执行默认更新
   * - 返回 true/false: 完全自定义处理
   */
  beforeUpdate?: (values: z.infer<TSchema>, original: TListItem) => HookResult<z.infer<TSchema>> | Promise<HookResult<z.infer<TSchema>>>;
  /**
   * 删除前钩子
   * - 返回 true: 表示已自定义处理成功（如软删除）
   * - 返回 false: 表示自定义处理失败
   * - 返回 undefined/void: 继续执行默认删除
   */
  beforeDelete?: (item: TListItem) => boolean | void | Promise<boolean | void>;
  /** 操作成功回调 */
  onSuccess?: (op: "create" | "update" | "delete", payload: unknown) => void;
  /** 操作失败回调 */
  onError?: (op: "create" | "update" | "delete", error: Error) => void;
}

/**
 * Hook 配置选项
 */
export interface UseAutoCrudResourceOptions<TSchema extends z.ZodObject<z.ZodRawShape>, TListItem> {
  /** 主键字段名（默认: "id"） */
  idKey?: keyof TListItem & string;
  /** 默认弹窗模式 */
  defaultVariant?: ModalVariant;
  /** 统一钩子配置 */
  hooks?: CrudHooks<TSchema, TListItem>;
  /**
   * Toast 配置
   * - undefined: 使用内置 sonner（默认）
   * - false: 禁用所有通知
   * - ToastAdapter: 注入自定义 toast 实现
   */
  toast?: ToastAdapter | false;
  /**
   * 自定义导出数据获取函数（escape hatch）
   *
   * 通常不需要传此参数：
   * - 导出选中行：纯客户端，零配置
   * - 导出筛选结果：router 有 export procedure 时自动可用
   *
   * 仅当需要完全自定义导出逻辑时才使用（如队列导出、自定义接口等）
   * 传入后优先级高于 router.export
   */
  exportFetcher?: (params: any) => Promise<{ data: Record<string, unknown>[]; total: number; hasMore: boolean }>;
}

/**
 * 导入结果类型（与服务端保持一致）
 */
export interface ImportResult {
  success: number;
  updated: number;
  skipped: number;
  failed: Array<{ row: number; errors: string[] }>;
}

/**
 * Hook 返回值类型
 */
export interface UseAutoCrudResourceReturn<TSchema extends z.ZodObject<z.ZodRawShape>, TListItem> {
  tableData: {
    data: TListItem[];
    pageCount: number;
    isLoading: boolean;
    /** 是否正在获取数据（用于显示微妙的加载指示器） */
    isFetching: boolean;
  };
  modal: ModalState<TListItem>;
  mutations: {
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
    isImporting: boolean;
  };
  handlers: {
    openCreate: () => void;
    openEdit: (row: TListItem) => void;
    openDelete: (row: TListItem) => void;
    openView: (row: TListItem) => void;
    copyRow: (row: TListItem) => void;
    closeModals: () => void;
    submitCreate: (values: z.infer<TSchema>) => void;
    submitUpdate: (values: z.infer<TSchema>) => void;
    confirmDelete: () => void;
    deleteMany: (rows: TListItem[]) => void;
    updateMany: (rows: TListItem[], data: Record<string, unknown>) => void;
    setVariant: (variant: ModalVariant) => void;
    /** 导入数据（router 有 import 路由时自动可用） */
    import: ((rows: Record<string, unknown>[]) => Promise<ImportResult>) | null;
    /** 导出筛选结果（router 有 export procedure 或传入 exportFetcher 时自动可用）。导出选中行由 AutoCrudTable 内部处理 */
    export: (() => Promise<Record<string, unknown>[]>) | null;
  };
}

/**
 * Modal 状态 Reducer
 */
function modalReducer<T>(state: ModalState<T>, action: ModalAction<T>): ModalState<T> {
  switch (action.type) {
    case "OPEN_CREATE":
      return { ...state, createOpen: true, selected: null, copySource: null };
    case "OPEN_CREATE_WITH_COPY":
      return { ...state, createOpen: true, selected: null, copySource: action.payload };
    case "OPEN_EDIT":
      return { ...state, editOpen: true, selected: action.payload };
    case "OPEN_DELETE":
      return { ...state, deleteOpen: true, selected: action.payload };
    case "OPEN_VIEW":
      return { ...state, viewOpen: true, selected: action.payload };
    case "CLOSE_ALL":
      return { ...state, createOpen: false, editOpen: false, deleteOpen: false, viewOpen: false, selected: null, copySource: null };
    case "SET_VARIANT":
      return { ...state, variant: action.payload };
    default:
      return state;
  }
}

/**
 * tRPC Router 接口定义（宽松类型以兼容实际 tRPC router）
 * import 为可选 — 传入 router 时自动检测是否存在
 */
interface CrudRouter {
  list: {
    useQuery: (input?: any, opts?: any) => any;
  };
  create: {
    useMutation: (opts?: any) => any;
  };
  update: {
    useMutation: (opts?: any) => any;
  };
  delete: {
    useMutation: (opts?: any) => any;
  };
  deleteMany?: {
    useMutation: (opts?: any) => any;
  };
  updateMany?: {
    useMutation: (opts?: any) => any;
  };
  /** 导入路由（mutation，由 createCrudRouter 自动生成） */
  import?: {
    useMutation: (opts?: any) => any;
  };
  /** 导出路由（query，由 createCrudRouter 自动生成） */
  export?: {
    useQuery: (input?: any, opts?: any) => any;
  };
}

/**
 * 自动生成的查询参数（由内部 URL 状态管理生成）
 */
export interface AutoQueryParams {
  page: number;
  perPage: number;
  sort: Array<{ id: string; desc: boolean }>;
  filters: any[];
  joinOperator: "and" | "or";
}

/**
 * Hook 配置参数
 */
export interface UseAutoCrudResourceParams<TSchema extends z.ZodObject<z.ZodRawShape>, TListItem> {
  /** tRPC router (如 trpc.tasks) */
  router: CrudRouter;
  /** Zod schema */
  schema: TSchema;
  /**
   * 查询参数变换函数
   *
   * 默认零配置：hook 内部自动管理 URL 状态（分页、排序、筛选），
   * 传入此函数可注入额外参数或修改自动生成的参数。
   *
   * @example
   * ```tsx
   * // 注入租户 ID
   * query: (params) => ({ ...params, tenantId: currentTenant.id })
   *
   * // 覆盖默认分页
   * query: (params) => ({ ...params, perPage: 20 })
   * ```
   */
  query?: (params: AutoQueryParams) => Record<string, unknown>;
  /** 其他配置选项 */
  options?: UseAutoCrudResourceOptions<TSchema, TListItem>;
}

/**
 * Hook 主函数
 */
export function useAutoCrudResource<
  TSchema extends z.ZodObject<z.ZodRawShape>,
  TListItem = z.output<TSchema>
>({
  router,
  schema,
  query: queryTransform,
  options = {},
}: UseAutoCrudResourceParams<TSchema, TListItem>): UseAutoCrudResourceReturn<TSchema, TListItem> {
  const {
    idKey = "id" as keyof TListItem & string,
    defaultVariant = "dialog",
    hooks,
    toast: toastAdapter,
    exportFetcher,
  } = options;

  // 使用注入的 toast 或默认 sonner
  const toast = useMemo(
    () => toastAdapter === false ? noopToastAdapter : (toastAdapter ?? defaultToastAdapter),
    [toastAdapter]
  );

  // Stabilize hooks reference to avoid handler rebuilds when hooks object changes
  const hooksRef = useRef(hooks);
  useEffect(() => {
    hooksRef.current = hooks;
  }, [hooks]);

  // ========== URL 状态管理（内部自动 or 外部传入） ==========
  // 从 schema 推导 columns（用于 useReadableFilters）
  const columns = useMemo(
    () => createTableSchema(schema as any),
    [schema],
  );

  // 内部 URL 状态：分页、排序、joinOperator
  const [urlParams] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      perPage: parseAsInteger.withDefault(10),
      sort: getSortingStateParser().withDefault([]),
      joinOperator: parseAsStringEnum(["and", "or"]).withDefault("and"),
    },
    { shallow: false },
  );

  // 内部 URL 状态：筛选
  const [filters] = useReadableFilters(columns, { shallow: false });

  // 构建查询参数
  const queryInput = useMemo(() => {
    const autoParams: AutoQueryParams = {
      page: urlParams.page,
      perPage: urlParams.perPage,
      sort: urlParams.sort,
      filters,
      joinOperator: urlParams.joinOperator,
    };
    return queryTransform ? queryTransform(autoParams) : autoParams;
  }, [urlParams, filters, queryTransform]);

  // tRPC Query 和 Mutations
  // 使用 keepPreviousData 保持旧数据显示，避免分页时的闪烁
  const listQuery = router.list.useQuery(queryInput, {
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
  const createMutation = router.create.useMutation();
  const updateMutation = router.update.useMutation();
  const deleteMutation = router.delete.useMutation();
  const deleteManyMutation = router.deleteMany?.useMutation();
  const updateManyMutation = router.updateMany?.useMutation();
  const importMutation = router.import?.useMutation();

  // Export query（enabled: false = 不自动执行，通过 refetch() 按需触发）
  const exportInput = useMemo(() => {
    if (!queryInput) return {};
    const { page: _p, perPage: _pp, ...rest } = queryInput;
    return rest;
  }, [queryInput]);
  const exportQuery = router.export?.useQuery(exportInput, { enabled: false });

  // Modal 状态管理
  const [modal, dispatch] = useReducer(modalReducer<TListItem>, {
    createOpen: false,
    editOpen: false,
    deleteOpen: false,
    viewOpen: false,
    selected: null,
    copySource: null,
    variant: defaultVariant,
  });

  // Handlers: Modal 控制
  const openCreate = useCallback(() => dispatch({ type: "OPEN_CREATE" }), []);
  const openEdit = useCallback((row: TListItem) => dispatch({ type: "OPEN_EDIT", payload: row }), []);
  const openDelete = useCallback((row: TListItem) => dispatch({ type: "OPEN_DELETE", payload: row }), []);
  const openView = useCallback((row: TListItem) => dispatch({ type: "OPEN_VIEW", payload: row }), []);
  const closeModals = useCallback(() => dispatch({ type: "CLOSE_ALL" }), []);
  const setVariant = useCallback((variant: ModalVariant) => dispatch({ type: "SET_VARIANT", payload: variant }), []);

  // Handlers: Create
  const submitCreate = useCallback(
    async (values: z.infer<TSchema>) => {
      const currentHooks = hooksRef.current;
      try {
        // 调用 beforeCreate 钩子
        if (currentHooks?.beforeCreate) {
          const result = await currentHooks.beforeCreate(values);

          // 返回 boolean = 完全自定义处理
          if (typeof result === "boolean") {
            if (result) {
              toast.success("创建成功");
              closeModals();
              listQuery.refetch();
              currentHooks?.onSuccess?.("create", values);
            }
            return;
          }

          // 返回对象 = 数据转换，继续执行默认创建
          values = result;
        }

        createMutation.mutate(values, {
          onSuccess: (data: unknown) => {
            toast.success("创建成功");
            closeModals();
            listQuery.refetch();
            currentHooks?.onSuccess?.("create", data);
          },
          onError: (error: unknown) => {
            const err = error as Error;
            toast.error(`创建失败: ${err.message}`);
            currentHooks?.onError?.("create", err);
          },
        });
      } catch (error) {
        const err = error as Error;
        toast.error(`创建失败: ${err.message}`);
        currentHooks?.onError?.("create", err);
      }
    },
    [createMutation, closeModals, listQuery]
  );

  // Handlers: Update
  const submitUpdate = useCallback(
    async (values: z.infer<TSchema>) => {
      const currentHooks = hooksRef.current;
      if (!modal.selected) return;

      try {
        // 调用 beforeUpdate 钩子
        if (currentHooks?.beforeUpdate) {
          const result = await currentHooks.beforeUpdate(values, modal.selected);

          // 返回 boolean = 完全自定义处理
          if (typeof result === "boolean") {
            if (result) {
              toast.success("更新成功");
              closeModals();
              listQuery.refetch();
              currentHooks?.onSuccess?.("update", values);
            }
            return;
          }

          // 返回对象 = 数据转换，继续执行默认更新
          values = result;
        }

        const id = modal.selected[idKey];
        updateMutation.mutate(
          { id, data: values } as { id: string | number; data: z.infer<TSchema> },
          {
            onSuccess: (data: unknown) => {
              toast.success("更新成功");
              closeModals();
              listQuery.refetch();
              currentHooks?.onSuccess?.("update", data);
            },
            onError: (error: unknown) => {
              const err = error as Error;
              toast.error(`更新失败: ${err.message}`);
              currentHooks?.onError?.("update", err);
            },
          }
        );
      } catch (error) {
        const err = error as Error;
        toast.error(`更新失败: ${err.message}`);
        currentHooks?.onError?.("update", err);
      }
    },
    [modal.selected, idKey, updateMutation, closeModals, listQuery]
  );

  // Handlers: Delete
  const confirmDelete = useCallback(async () => {
    const currentHooks = hooksRef.current;
    if (!modal.selected) return;

    try {
      // 调用 beforeDelete 钩子
      if (currentHooks?.beforeDelete) {
        const result = await currentHooks.beforeDelete(modal.selected);

        // 返回 boolean = 完全自定义处理
        if (typeof result === "boolean") {
          if (result) {
            toast.success("删除成功");
            closeModals();
            listQuery.refetch();
            currentHooks?.onSuccess?.("delete", modal.selected);
          }
          return;
        }
        // 返回 undefined/void = 继续执行默认删除
      }

      const id = modal.selected[idKey];
      deleteMutation.mutate(id as string, {
        onSuccess: (data: unknown) => {
          toast.success("删除成功");
          closeModals();
          listQuery.refetch();
          currentHooks?.onSuccess?.("delete", data);
        },
        onError: (error: unknown) => {
          const err = error as Error;
          toast.error(`删除失败: ${err.message}`);
          currentHooks?.onError?.("delete", err);
        },
      });
    } catch (error) {
      const err = error as Error;
      toast.error(`删除失败: ${err.message}`);
      currentHooks?.onError?.("delete", err);
    }
  }, [modal.selected, idKey, deleteMutation, closeModals, listQuery]);

  // Handlers: Delete Many
  const deleteMany = useCallback(
    (rows: TListItem[]) => {
      const currentHooks = hooksRef.current;
      if (!deleteManyMutation) {
        toast.error("批量删除功能未启用");
        return;
      }
      const ids = rows.map((row) => row[idKey] as string);
      deleteManyMutation.mutate(ids, {
        onSuccess: (data: unknown) => {
          toast.success(`成功删除 ${ids.length} 条记录`);
          listQuery.refetch();
          currentHooks?.onSuccess?.("delete", data);
        },
        onError: (error: unknown) => {
          const err = error as Error;
          toast.error(`批量删除失败: ${err.message}`);
          currentHooks?.onError?.("delete", err);
        },
      });
    },
    [deleteManyMutation, idKey, listQuery]
  );

  // Handlers: Update Many
  const updateMany = useCallback(
    (rows: TListItem[], data: Record<string, unknown>) => {
      const currentHooks = hooksRef.current;
      if (!updateManyMutation) {
        toast.error("批量更新功能未启用");
        return;
      }
      const ids = rows.map((row) => row[idKey] as string);
      updateManyMutation.mutate({ ids, data }, {
        onSuccess: (result: unknown) => {
          toast.success(`成功更新 ${ids.length} 条记录`);
          listQuery.refetch();
          currentHooks?.onSuccess?.("update", result);
        },
        onError: (error: unknown) => {
          const err = error as Error;
          toast.error(`批量更新失败: ${err.message}`);
          currentHooks?.onError?.("update", err);
        },
      });
    },
    [updateManyMutation, idKey, listQuery]
  );

  // Handlers: Copy Row (复制行并打开创建弹窗)
  const copyRow = useCallback(
    (row: TListItem) => {
      dispatch({ type: "OPEN_CREATE_WITH_COPY", payload: row });
    },
    []
  );

  // Handlers: Import (如果 router 支持)
  const handleImport = useCallback(
    async (rows: Record<string, unknown>[]): Promise<ImportResult> => {
      if (!importMutation) {
        throw new Error("Import not supported: router has no import procedure");
      }
      // CSV 解析后所有值都是 string，根据 schema 做类型转换
      const coercedRows = coerceRowValues(rows, schema);
      const result = await importMutation.mutateAsync({
        rows: coercedRows,
        onConflict: "upsert",
      });
      listQuery.refetch();
      return result as ImportResult;
    },
    [importMutation, listQuery, schema]
  );

  // Handlers: Export — 导出筛选结果
  // 优先级：exportFetcher（自定义） > router.export（自动检测）
  const handleExport = useCallback(
    async (): Promise<Record<string, unknown>[]> => {
      // 优先使用自定义 exportFetcher
      if (exportFetcher) {
        const { page: _p, perPage: _pp, ...exportParams } = queryInput ?? {};
        const result = await exportFetcher(exportParams);
        return (result?.data ?? []) as Record<string, unknown>[];
      }
      // 自动检测 router.export
      if (exportQuery) {
        const result = await exportQuery.refetch();
        return (result?.data?.data ?? []) as Record<string, unknown>[];
      }
      throw new Error("Export not supported");
    },
    [exportFetcher, exportQuery, queryInput]
  );

  const canExport = !!(exportFetcher || exportQuery);

  // 返回值
  return {
    tableData: {
      data: (listQuery.data?.data ?? []) as TListItem[],
      pageCount: listQuery.data?.pageCount ?? 0,
      isLoading: listQuery.isLoading,
      isFetching: listQuery.isFetching,
    },
    modal,
    mutations: {
      isCreating: createMutation.isPending,
      isUpdating: updateMutation.isPending,
      isDeleting: deleteMutation.isPending,
      isImporting: importMutation?.isPending ?? false,
    },
    handlers: {
      openCreate,
      openEdit,
      openDelete,
      openView,
      copyRow,
      closeModals,
      submitCreate,
      submitUpdate,
      confirmDelete,
      deleteMany,
      updateMany,
      setVariant,
      import: importMutation ? handleImport : null,
      export: canExport ? handleExport : null,
    },
  };
}
