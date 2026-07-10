import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { isZodObject, nonEmpty } from './schema-utils';

describe('schema-utils', () => {
  describe('isZodObject', () => {
    it('returns true for z.object', () => {
      const schema = z.object({ name: z.string() });
      expect(isZodObject(schema)).toBe(true);
    });

    it('returns true for empty z.object', () => {
      const schema = z.object({});
      expect(isZodObject(schema)).toBe(true);
    });

    it('returns false for z.string', () => {
      const schema = z.string();
      expect(isZodObject(schema)).toBe(false);
    });

    it('returns false for z.number', () => {
      const schema = z.number();
      expect(isZodObject(schema)).toBe(false);
    });

    it('returns false for z.array', () => {
      const schema = z.array(z.string());
      expect(isZodObject(schema)).toBe(false);
    });

    // Note: In Zod v4, refine() preserves the shape property and ZodObject methods
    // So isZodObject returns true for refined objects, which is actually correct
    // because you can still call .omit(), .partial(), etc. on them
    it('returns true for ZodEffects (refine result) in Zod v4', () => {
      const schema = z.object({ name: z.string() }).refine(() => true);
      // In Zod v4, refine preserves shape and ZodObject methods
      expect(isZodObject(schema)).toBe(true);
    });

    // transform() changes the type to 'pipe' and removes shape
    it('returns false for ZodEffects (transform result)', () => {
      const schema = z.object({ name: z.string() }).transform((v) => v);
      expect(isZodObject(schema)).toBe(false);
    });

    it('returns true for z.object with omit', () => {
      const schema = z.object({ id: z.string(), name: z.string() }).omit({ id: true });
      expect(isZodObject(schema)).toBe(true);
    });

    it('returns true for z.object with pick', () => {
      const schema = z.object({ id: z.string(), name: z.string() }).pick({ name: true });
      expect(isZodObject(schema)).toBe(true);
    });

    it('returns true for z.object with partial', () => {
      const schema = z.object({ name: z.string() }).partial();
      expect(isZodObject(schema)).toBe(true);
    });

    it('returns true for z.object with extend', () => {
      const schema = z.object({ name: z.string() }).extend({ age: z.number() });
      expect(isZodObject(schema)).toBe(true);
    });
  });

  describe('nonEmpty', () => {
    it('returns false for empty object', () => {
      expect(nonEmpty({})).toBe(false);
    });

    it('returns true for object with one property', () => {
      expect(nonEmpty({ a: 1 })).toBe(true);
    });

    it('returns true for object with multiple properties', () => {
      expect(nonEmpty({ a: 1, b: 2, c: 3 })).toBe(true);
    });

    it('returns true for object with undefined value', () => {
      expect(nonEmpty({ a: undefined })).toBe(true);
    });

    it('returns true for object with null value', () => {
      expect(nonEmpty({ a: null })).toBe(true);
    });
  });
});
