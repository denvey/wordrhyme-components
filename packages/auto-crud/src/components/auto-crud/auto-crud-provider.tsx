'use client';

import type { ReactNode } from 'react';
import type { AutoCrudDataSourceContext } from '@/lib/registries';
import type { SavedView, ViewInput, ViewStorageCapabilities } from '@/lib/saved-views';
import { createContext, useContext, useId, useMemo } from 'react';

export interface ViewStorage {
  list: (resourceId: string) => Promise<SavedView[]>;
  create: (resourceId: string, input: ViewInput) => Promise<SavedView>;
  update: (resourceId: string, id: string, input: ViewInput) => Promise<SavedView>;
  remove: (resourceId: string, id: string) => Promise<void>;
  /** Omit to use the adapter's default scope. Empty createScopes disables creation. */
  getCapabilities?: (resourceId: string) => Promise<ViewStorageCapabilities>;
  /** Complete permutation of permitted persisted IDs; other rows keep their slots. The selector uses local preferences. */
  reorder?: (resourceId: string, ids: string[]) => Promise<void>;
}

export interface TagScope {
  resourceId: string;
  field: string;
}

export interface TagInput {
  label: string;
  color: string;
}

export interface TagOption extends TagInput {
  disabled?: boolean;
  value: string;
}

export interface TagService {
  /** Search a page of tags; set hasMore to false on the last page. */
  list: (
    input: TagScope &
      Pick<AutoCrudDataSourceContext, 'query' | 'page' | 'pageSize' | 'signal'>,
  ) => Promise<{ options: TagOption[]; hasMore: boolean }>;
  /** Resolve all selected IDs; missing IDs remain visible as invalid selections. */
  resolve: (input: TagScope & { ids: string[] }) => Promise<TagOption[]>;
  create?: (input: TagScope & TagInput) => Promise<TagOption>;
  update?: (input: TagScope & TagInput & { id: string }) => Promise<TagOption>;
  remove?: (input: TagScope & { id: string }) => Promise<void>;
  /** Add/remove only the specified tags; preserve every other existing tag. */
  assign?: (
    input: TagScope & { entityIds: string[]; add: string[]; remove: string[] },
  ) => Promise<void>;
}

export interface AutoCrudProviderProps {
  /** Change with the signed-in user/tenant; remounts cached UI state. */
  scope: string;
  viewStorage?: ViewStorage;
  tagService?: TagService;
  children: ReactNode;
}

const Context = createContext<
  (Omit<AutoCrudProviderProps, 'children'> & { cacheKey: string }) | null
>(null);

export function AutoCrudProvider({ children, ...config }: AutoCrudProviderProps) {
  const id = useId();
  const value = useMemo(
    () => ({ ...config, cacheKey: `${id}:${config.scope}` }),
    [id, config.scope, config.viewStorage, config.tagService],
  );
  return (
    <Context.Provider value={value}>
      <ScopedContent key={config.scope}>{children}</ScopedContent>
    </Context.Provider>
  );
}

function ScopedContent({ children }: { children: ReactNode }): ReactNode {
  return children;
}

export function useAutoCrudConfig() {
  return useContext(Context);
}

export const CrudResourceContext = createContext<string | undefined>(undefined);
