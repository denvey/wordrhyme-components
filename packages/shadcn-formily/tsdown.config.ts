import { defineConfig } from '@internal/tsdown-config';
import { buildStyles } from '@internal/tsdown-config/styles';

export default [
  defineConfig({
    entry: 'src/index.ts',
    dts: true,
    minify: false,
    clean: true,
    format: ['esm', 'cjs'],
    hooks: { 'build:done': (ctx) => buildStyles(ctx, '@wordrhyme/shadcn-ui') },
    external: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      '@formily/core',
      '@formily/react',
      '@formily/reactive',
      '@formily/shared',
      '@wordrhyme/shadcn',
      '@wordrhyme/shadcn-ui',
      'lucide-react',
    ],
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
