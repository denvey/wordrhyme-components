import { defineConfig } from '@internal/tsdown-config';
import { buildStyles } from '@internal/tsdown-config/styles';

export default [
  defineConfig({
    entry: 'src/index.ts',
    dts: true,
    minify: false,
    clean: true,
    format: ['esm', 'cjs'],
    hooks: { 'build:done': (ctx) => buildStyles(ctx, '@wordrhyme/shadcn') },
  }),
  defineConfig({
    entry: 'src/mcp-server.ts',
    dts: false,
    minify: false,
    clean: false,
    format: ['esm'],
    platform: 'node',
  }),
];
