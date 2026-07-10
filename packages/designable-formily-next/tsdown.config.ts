import { defineConfig } from '@internal/tsdown-config';

export default defineConfig({
  entry: 'src/index.ts',
  dts: true,
  minify: false,
  clean: true,
  format: ['esm', 'cjs'],
  external: [
    '@alifd/next',
    '@formily/antd',
    '@formily/core',
    '@formily/json-schema',
    '@formily/next',
    '@formily/react',
    '@formily/reactive',
    '@formily/reactive-react',
    '@formily/shared',
    '@wordrhyme/designable-core',
    '@wordrhyme/designable-formily-setters',
    '@wordrhyme/designable-formily-transformer',
    '@wordrhyme/designable-react',
    'antd',
    'react',
    'react-dom',
    'react-is',
    'react/jsx-runtime',
  ],
});
