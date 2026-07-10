import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import { antdScopePostcssPlugin } from './antd-scope-postcss.mjs';

export default {
  plugins: [tailwindcss(), antdScopePostcssPlugin(), autoprefixer()],
};
