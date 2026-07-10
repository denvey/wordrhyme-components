import { defineConfig } from '@internal/tsdown-config';

export default defineConfig({
  entry: 'src/index.ts',
  dts: true,
  minify: false,
  clean: true,
  format: ['esm', 'cjs'],
  external: [
    '@formily/core',
    '@formily/json-schema',
    '@wordrhyme/designable-core',
    '@wordrhyme/designable-shared',
  ],
});
