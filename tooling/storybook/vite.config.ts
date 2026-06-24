import { defineConfig, type Plugin } from 'vite';
import path from 'path';
import fs from 'fs';

const packagesDir = path.resolve(__dirname, '../../packages');
const workspacePackages = fs
  .readdirSync(packagesDir)
  .filter((item) => fs.statSync(path.join(packagesDir, item)).isDirectory());

const workspaceAliases = workspacePackages.reduce<Record<string, string>>(
  (aliases, pkg) => {
    const srcPath = path.resolve(packagesDir, pkg, 'src');
    if (!fs.existsSync(srcPath)) {
      return aliases;
    }

    const packageJsonPath = path.resolve(packagesDir, pkg, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return aliases;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      name?: string;
    };
    if (packageJson.name) {
      aliases[packageJson.name] = srcPath;
    }

    return aliases;
  },
  {},
);

const workspaceAliasPackages = Object.keys(workspaceAliases);

function getImporterPackageSrc(importer?: string) {
  if (!importer) return null;

  const importerPath = importer.split('?')[0] ?? importer;
  const relativePath = path.relative(packagesDir, importerPath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  const [packageDir] = relativePath.split(path.sep);
  if (!packageDir) return null;

  const srcPath = path.resolve(packagesDir, packageDir, 'src');
  return fs.existsSync(srcPath) ? srcPath : null;
}

function packageScopedAtAlias(): Plugin {
  return {
    name: 'package-scoped-at-alias',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (!source.startsWith('@/')) return null;

      const srcPath = getImporterPackageSrc(importer);
      if (!srcPath) return null;

      const resolvedPath = path.resolve(srcPath, source.slice(2));
      return (
        (await this.resolve(resolvedPath, importer, { skipSelf: true })) ?? resolvedPath
      );
    },
  };
}

export default defineConfig({
  plugins: [packageScopedAtAlias()],
  resolve: {
    alias: workspaceAliases,
  },
  optimizeDeps: {
    // Keep workspace packages out of prebundling so HMR reflects local source edits.
    exclude: workspaceAliasPackages,
    include: ['react', 'react-dom'],
  },
  server: {
    fs: {
      strict: false,
    },
  },
});
