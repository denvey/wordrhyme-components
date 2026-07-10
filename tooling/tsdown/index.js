import { defineConfig as defineTsDownConfig } from '@pixpilot/tsdown-config';
import { copyFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const KB = 1024;
const LIMIT = 200;
const LIMIT_KB = LIMIT * KB;
const STYLE_ASSET_RE = /\.(?:css|less|scss)$/u;

/** @type {Array<string | RegExp>} */
const defaultExternal = [
  'react',
  'react-dom',
  'react/jsx-runtime', // Add this - critical!
  'class-variance-authority',
  'clsx',
  'tailwind-merge',
  'lucide-react',
  'date-fns',
  /^@radix-ui\//u, // Use regex pattern for better matching
  STYLE_ASSET_RE,
];

/**
 * @template T
 * @param {T | T[] | null | undefined | false} value
 * @returns {T[]}
 */
const toArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

/**
 * @param {unknown} error
 * @returns {error is NodeJS.ErrnoException}
 */
const isNodeError = (error) => error instanceof Error && 'code' in error;

/**
 * @param {string} id
 * @returns {boolean}
 */
const matchesDefaultExternal = (id) =>
  defaultExternal.some((external) =>
    typeof external === 'string' ? external === id : external.test(id),
  );

/**
 * @param {import('@pixpilot/tsdown-config').Options['external']} external
 * @returns {import('@pixpilot/tsdown-config').Options['external']}
 */
const mergeExternal = (external) => {
  if (typeof external === 'function') {
    return (id, parentId, isResolved) =>
      matchesDefaultExternal(id) || external(id, parentId, isResolved);
  }

  return [...defaultExternal, ...toArray(external)];
};

/**
 * @param {string} dir
 * @param {string} [base]
 * @returns {Promise<string[]>}
 */
const walkStyleAssets = async (dir, base = dir) => {
  /** @type {import('node:fs').Dirent[]} */
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return [];
    throw error;
  }

  const assets = await Promise.all(
    entries.map(async (entry) => {
      const filePath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walkStyleAssets(filePath, base);
      if (!STYLE_ASSET_RE.test(entry.name)) return [];
      return [path.relative(base, filePath)];
    }),
  );
  return assets.flat();
};

/**
 * @param {import('tsdown').BuildContext} ctx
 */
const copyStyleAssets = async ({ options }) => {
  const cwd = options.cwd ?? process.cwd();
  const outDir = path.resolve(cwd, options.outDir ?? 'dist');
  const srcDir = path.resolve(cwd, 'src');
  const assets = await walkStyleAssets(srcDir);

  await Promise.all(
    assets.map(async (asset) => {
      const from = path.join(srcDir, asset);
      const to = path.join(outDir, asset);
      await mkdir(path.dirname(to), { recursive: true });
      await copyFile(from, to);
    }),
  );
};

/**
 * @param {import('@pixpilot/tsdown-config').Options} options
 */
export function defineConfig(options) {
  const userHooks = options.hooks;
  return defineTsDownConfig({
    minify: true,
    bundleSize: LIMIT_KB,
    dts: true,
    clean: true,
    format: ['esm', 'cjs'],
    unbundle: true,
    // Ensure proper treeshaking and no Node.js polyfills
    treeshake: true,
    platform: 'browser',
    // sourcemap: true,
    ...options,
    external: mergeExternal(options.external),
    hooks: {
      ...(typeof userHooks === 'object' && userHooks ? userHooks : {}),
      'build:done': async (ctx) => {
        if (typeof userHooks === 'object') {
          await userHooks?.['build:done']?.(ctx);
        }
        await copyStyleAssets(ctx);
      },
    },
  });
}

export default defineConfig;
