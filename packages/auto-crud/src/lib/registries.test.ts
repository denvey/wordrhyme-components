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

  it('shares registrations and notifications within the same module instance', async () => {
    const sameModule = await import('./registries');
    const loader = vi.fn(async () => []);
    const listener = vi.fn();
    const unsubscribe = sameModule.dataSources.subscribe(listener);

    expect(sameModule.dataSources).toBe(dataSources);
    dataSources.register('test.shared-source', loader);
    expect(sameModule.dataSources.get('test.shared-source')?.load).toBe(loader);
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);

    sameModule.dataSources.unregister('test.shared-source');
    expect(dataSources.get('test.shared-source')).toBeUndefined();
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('does not force separate module instances to share registrations', async () => {
    const loader = vi.fn(async () => []);
    dataSources.register('test.isolated-source', loader);

    vi.resetModules();
    const reloaded = await import('./registries');

    expect(reloaded.dataSources).not.toBe(dataSources);
    expect(reloaded.dataSources.get('test.isolated-source')).toBeUndefined();
    expect(dataSources.get('test.isolated-source')?.load).toBe(loader);
    dataSources.unregister('test.isolated-source');
  });
});
