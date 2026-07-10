/**
 * Middleware 便捷工具函数
 * 简化常见场景的 middleware 创建
 */

// ============================================================
// afterMiddleware - 操作后执行副作用
// ============================================================

/**
 * 创建 after-only 的 middleware（最常见场景）
 * 在操作完成后执行副作用，不修改返回值
 *
 * @example
 * middleware: {
 *   create: afterMiddleware(async (ctx, result) => {
 *     await sendEmail(result);
 *     await logAudit(ctx.user, 'create', result);
 *   }),
 * }
 */
export function afterMiddleware<TContext, TResult>(
  fn: (ctx: TContext, result: TResult) => void | Promise<void>,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (params: {
    ctx: TContext;
    next: () => Promise<TResult>;
    [key: string]: any;
  }): Promise<TResult> => {
    const result = await params.next();
    await fn(params.ctx, result);
    return result;
  };
}

// ============================================================
// beforeMiddleware - 操作前修改输入
// ============================================================

/**
 * 创建 before-only 的 middleware
 * 在操作执行前修改输入数据
 *
 * @example
 * middleware: {
 *   create: beforeMiddleware(async (ctx, input) => {
 *     return { ...input, slug: slugify(input.title), createdBy: ctx.user.id };
 *   }),
 * }
 */
export function beforeMiddleware<TContext, TInput>(
  fn: (ctx: TContext, input: TInput) => TInput | Promise<TInput>,
) {
  return async <TResult>(params: {
    ctx: TContext;
    input: TInput;
    next: (input?: TInput) => Promise<TResult>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }): Promise<TResult> => {
    const modifiedInput = await fn(params.ctx, params.input);
    return params.next(modifiedInput);
  };
}

// ============================================================
// composeMiddleware - 组合多个 middleware
// ============================================================

type AnyMiddlewareParams<TContext> = {
  ctx: TContext;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  next: (...args: any[]) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

/**
 * 组合多个 middleware 为一个
 *
 * @example
 * middleware: {
 *   create: composeMiddleware(
 *     beforeMiddleware((ctx, input) => ({ ...input, slug: slugify(input.title) })),
 *     afterMiddleware((ctx, result) => sendEmail(result)),
 *   ),
 * }
 */
export function composeMiddleware<TContext, TResult>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...middlewares: Array<(params: AnyMiddlewareParams<TContext>) => Promise<any>>
) {
  return async (params: AnyMiddlewareParams<TContext>): Promise<TResult> => {
    let index = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const executeNext = async (...args: any[]): Promise<TResult> => {
      if (index >= middlewares.length) {
        return params.next(...args);
      }

      const currentMiddleware = middlewares[index++];
      return currentMiddleware!({
        ...params,
        next: executeNext,
      });
    };

    return executeNext();
  };
}
