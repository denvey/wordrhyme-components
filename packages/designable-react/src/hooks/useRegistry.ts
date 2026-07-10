import { GlobalRegistry, IDesignerRegistry } from '@wordrhyme/designable-core';
import { globalThisPolyfill } from '@wordrhyme/designable-shared';

export const useRegistry = (): IDesignerRegistry => {
  return globalThisPolyfill['__DESIGNER_REGISTRY__'] || GlobalRegistry;
};
