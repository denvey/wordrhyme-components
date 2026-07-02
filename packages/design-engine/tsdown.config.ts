import { defineConfig } from '@internal/tsdown-config';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    schema: 'src/schema/index.ts',
    render: 'src/render/index.ts',
  },
  dts: true,
  minify: false,
  clean: true,
  format: ['esm', 'cjs'],
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    '@formily/core',
    '@formily/react',
    '@wordrhyme/designable-core',
    '@wordrhyme/designable-formily-transformer',
    '@wordrhyme/formily-shadcn',
  ],
});
