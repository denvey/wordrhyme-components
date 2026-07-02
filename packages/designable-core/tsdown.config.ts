import { defineConfig } from '@internal/tsdown-config';

export default defineConfig({
  entry: 'src/index.ts',
  dts: true,
  minify: false,
  clean: true,
  format: ['esm', 'cjs'],
  external: [
    '@formily/json-schema',
    '@formily/path',
    '@formily/reactive',
    '@juggle/resize-observer',
    '@wordrhyme/designable-shared',
  ],
});
