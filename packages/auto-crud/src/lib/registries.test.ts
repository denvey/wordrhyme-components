import { describe, expect, it, vi } from 'vitest';
import { dataSources } from './registries';

describe('AutoCrud registries', () => {
  it('coalesces same-tick notifications', async () => {
    const listener = vi.fn();
    const unsubscribe = dataSources.subscribe(listener);

    dataSources.register('test.coalesce-a', async () => []);
    dataSources.register('test.coalesce-b', async () => []);

    expect(listener).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    dataSources.unregister('test.coalesce-a');
    dataSources.unregister('test.coalesce-b');
  });

  it('shares data sources across separate module instances', async () => {
    const loader = vi.fn(async () => []);
    dataSources.register('test.federated-source', loader);

    vi.resetModules();
    const reloaded = await import('./registries');

    expect(reloaded.dataSources.get('test.federated-source')?.load).toBe(loader);
    reloaded.dataSources.unregister('test.federated-source');
  });
});
