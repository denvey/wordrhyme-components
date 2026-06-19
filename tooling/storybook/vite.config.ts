import { defineConfig } from 'vite';
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

    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, 'utf8'),
    ) as { name?: string };
    if (packageJson.name) {
      aliases[packageJson.name] = srcPath;
    }

    return aliases;
  },
  {
    '@': path.resolve(__dirname, '../../packages/shadcn/src'),
  },
);

const workspaceAliasPackages = Object.keys(workspaceAliases).filter((alias) =>
  alias !== '@',
);

export default defineConfig({
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
