import { defineConfig } from '@internal/tsdown-config';

export default defineConfig({
  entry: 'src/index.ts',
  dts: true,
  minify: false,
  clean: true,
  bundleSize: 300 * 1024,
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
    '@wordrhyme/designable-shared',
    'antd',
    'dateformat',
    'react',
    'react-dom',
    'react-is',
    'react/jsx-runtime',
  ],
});
