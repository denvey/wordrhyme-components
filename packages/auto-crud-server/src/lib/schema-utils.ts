import { z } from 'zod';

/**
 * 检查是否为 ZodObject 类型
 * 兼容 Zod v3 和 v4
 *
 * 实现策略：检查 schema 是否具有 ZodObject 特有的 .shape 属性
 * 这种方式比检查内部 _def 属性更稳定，因为不依赖 Zod 的内部实现细节
 */
export function isZodObject(schema: z.ZodTypeAny): schema is z.ZodObject<z.ZodRawShape> {
  // ZodObject 的特征是具有 shape 属性（一个对象包含所有字段的 schema）
  // ZodEffects (refine/transform 结果) 没有 shape 属性
  return (
    schema !== null &&
    typeof schema === 'object' &&
    'shape' in schema &&
    typeof schema.shape === 'object' &&
    schema.shape !== null
  );
}

/**
 * 非空对象验证器
 * 用于 updateSchema 的 refine，防止空更新
 */
export function nonEmpty(value: Record<string, unknown>): boolean {
  return Object.keys(value).length > 0;
}
