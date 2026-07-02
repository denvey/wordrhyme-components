import * as Core from './exports';
export * from './exports';
import { globalThisPolyfill } from '@wordrhyme/designable-shared';

if (!globalThisPolyfill?.['Designable']?.['Core']) {
  globalThisPolyfill['Designable'] = globalThisPolyfill['Designable'] || {};
  globalThisPolyfill['Designable'].Core = Core;
}
