import { defineConfig } from '@internal/tsdown-config';
import { buildStyles } from '@internal/tsdown-config/styles';

export default defineConfig({
  entry: ['src/index.ts', 'src/form/index.ts'],
  dts: true,
  minify: false,
  clean: true,
  format: ['esm'],
  hooks: { 'build:done': buildStyles },
});
