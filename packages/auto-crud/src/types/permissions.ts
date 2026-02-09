/**
 * CRUD 操作权限
 * 控制工具栏按钮、行操作按钮、批量操作按钮的显示
 */
export interface CrudOperationPermissions {
  /** 是否允许创建（新建按钮、复制行操作） */
  create?: boolean;
  /** 是否允许更新（编辑按钮、批量更新） */
  update?: boolean;
  /** 是否允许删除（删除按钮、批量删除） */
  delete?: boolean;
  /** 是否允许导出 */
  export?: boolean;
  /** 是否允许导入 */
  import?: boolean;
}

/**
 * AutoCrudTable 权限配置
 *
 * @example
 * ```tsx
 * const permissions = useMemo(() => ({
 *   can: {
 *     create: user.role === 'admin',
 *     update: user.role === 'admin' || user.role === 'editor',
 *     delete: user.role === 'admin',
 *     export: true,
 *   },
 *   deny: user.role === 'user' ? ['salary', 'ssn'] : [],
 * }), [user.role]);
 *
 * <AutoCrudTable
 *   schema={employeeSchema}
 *   resource={resource}
 *   permissions={permissions}
 * />
 * ```
 */
export interface CrudPermissions {
  /** 操作权限（默认全部为 true） */
  can?: CrudOperationPermissions;
  /** 禁止访问的字段列表（表格列和表单字段都会隐藏） */
  deny?: string[];
}
