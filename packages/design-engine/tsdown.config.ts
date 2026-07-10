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
  exports: false,
  format: ['esm', 'cjs'],
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    '@formily/core',
    '@formily/react',
    '@wordrhyme/designable-core',
    '@wordrhyme/designable-formily-shadcn',
    '@wordrhyme/designable-formily-transformer',
    '@wordrhyme/designable-react',
    '@wordrhyme/designable-react-settings-form',
    '@wordrhyme/formily-shadcn',
  ],
});
