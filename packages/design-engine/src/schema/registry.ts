import type {
  DesignActionDefinition,
  DesignBlockDefinition,
  DesignContribution,
  DesignDataSourceDefinition,
  DesignRegistry,
  DesignSlotDefinition,
  DesignSurface,
  DesignTemplateDefinition,
  DesignableResource,
  DesignableTreeNode,
  JsonObject,
} from './types';
import { cloneJsonObject } from './json';

type RegistryBucket = 'blocks' | 'slots' | 'templates' | 'dataSources' | 'actions';

export interface DesignRegistryOptions {
  surface?: DesignSurface;
}

function supportsSurface(
  item: { surfaces?: DesignSurface[] },
  surface: DesignSurface | undefined,
): boolean {
  return !surface || !item.surfaces || item.surfaces.includes(surface);
}

function addItems<
  T extends { id: string; pluginId?: string; surfaces?: DesignSurface[] },
>(
  bucket: RegistryBucket,
  map: Map<string, T>,
  items: T[] | undefined,
  contribution: DesignContribution,
  options: DesignRegistryOptions,
): void {
  for (const item of items ?? []) {
    if (!supportsSurface(item, options.surface)) {
      continue;
    }

    const normalized = {
      ...item,
      pluginId: item.pluginId ?? contribution.pluginId,
    };

    if (map.has(normalized.id)) {
      throw new Error(`Duplicate design ${bucket} id "${normalized.id}"`);
    }

    map.set(normalized.id, normalized);
  }
}

export function createDesignRegistry(
  contributions: DesignContribution[] = [],
  options: DesignRegistryOptions = {},
): DesignRegistry {
  const registry: DesignRegistry = {
    blocks: new Map<string, DesignBlockDefinition>(),
    slots: new Map<string, DesignSlotDefinition>(),
    templates: new Map<string, DesignTemplateDefinition>(),
    dataSources: new Map<string, DesignDataSourceDefinition>(),
    actions: new Map<string, DesignActionDefinition>(),
    contributions,
  };

  for (const contribution of contributions) {
    addItems('blocks', registry.blocks, contribution.blocks, contribution, options);
    addItems('slots', registry.slots, contribution.slots, contribution, options);
    addItems(
      'templates',
      registry.templates,
      contribution.templates,
      contribution,
      options,
    );
    addItems(
      'dataSources',
      registry.dataSources,
      contribution.dataSources,
      contribution,
      options,
    );
    addItems('actions', registry.actions, contribution.actions, contribution, options);
  }

  return registry;
}

export function getBlockComponentId(block: DesignBlockDefinition): string {
  return block.component ?? block.id;
}

export function toDesignableResources(
  registry: Pick<DesignRegistry, 'blocks'>,
): DesignableResource[] {
  return Array.from(registry.blocks.values()).map((block) => {
    const component = getBlockComponentId(block);
    const node: DesignableTreeNode = {
      componentName: 'Field',
      props: {
        type: 'void',
        'x-component': component,
        'x-component-props': cloneJsonObject(block.defaultProps),
      },
    };

    return {
      title: block.title,
      icon: block.icon,
      category: block.category,
      node,
      ...(block.designable?.resource ?? {}),
    };
  });
}

export function toDesignableBehaviors(
  registry: Pick<DesignRegistry, 'blocks'>,
): JsonObject[] {
  return Array.from(registry.blocks.values()).map((block): JsonObject => {
    const component = getBlockComponentId(block);

    return {
      name: component,
      selector: `Field[x-component=${component}]`,
      propsSchema: block.propsSchema ?? block.settingsSchema,
      designerProps: {
        title: block.title,
        icon: block.icon,
        defaultProps: block.defaultProps,
      },
      ...(block.designable?.behavior ?? {}),
    };
  });
}
