import { defineConfig } from '@internal/tsdown-config';

export default defineConfig({
  entry: 'src/index.ts',
  dts: true,
  minify: false,
  clean: true,
  format: ['esm', 'cjs'],
  external: [
    '@formily/core',
    '@formily/react',
    '@formily/reactive',
    '@formily/reactive-react',
    '@formily/shared',
    '@wordrhyme/designable-core',
    '@wordrhyme/designable-formily-setters',
    '@wordrhyme/designable-react',
    '@wordrhyme/designable-shared',
    '@wordrhyme/formily-shadcn',
    '@wordrhyme/shadcn',
    '@wordrhyme/shadcn-ui',
    'classnames',
    'react',
    'react-dom',
    'react/jsx-runtime',
  ],
});
