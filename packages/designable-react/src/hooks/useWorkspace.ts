import { useContext } from 'react';
import { useDesigner } from './useDesigner';
import { WorkspaceContext } from '../context';
import { Workspace } from '@wordrhyme/designable-core';
import { globalThisPolyfill } from '@wordrhyme/designable-shared';

export const useWorkspace = (id?: string): Workspace => {
  const designer = useDesigner();
  const workspaceId = id || useContext(WorkspaceContext)?.id;
  if (workspaceId) {
    return designer.workbench.findWorkspaceById(workspaceId);
  }
  if (globalThisPolyfill['__DESIGNABLE_WORKSPACE__'])
    return globalThisPolyfill['__DESIGNABLE_WORKSPACE__'];
  return designer.workbench.currentWorkspace;
};
