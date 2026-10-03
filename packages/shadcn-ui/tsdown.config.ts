import { defineConfig } from '@internal/tsdown-config';
import { buildStyles } from '@internal/tsdown-config/styles';

export default defineConfig({
  entry: 'src/index.ts',
  dts: true,
  minify: false,
  clean: true,
  format: ['esm', 'cjs'],
  hooks: { 'build:done': buildStyles },
});
