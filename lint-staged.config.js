const path = require('node:path');

const packageFilters = [
  ['packages/auto-crud-server/', '@wordrhyme/auto-crud-server'],
  ['packages/auto-crud/', '@wordrhyme/auto-crud'],
  ['packages/hooks/', '@internal/hooks'],
  ['packages/shadcn-auth/', '@wordrhyme/shadcn-auth'],
  ['packages/shadcn-formily/', '@wordrhyme/formily-shadcn'],
  ['packages/shadcn-ui/', '@wordrhyme/shadcn-ui'],
  ['packages/shadcn/', '@wordrhyme/shadcn'],
  ['tooling/eslint/', '@internal/eslint-config'],
  ['tooling/prettier/', '@internal/prettier-config'],
  ['tooling/storybook/', '@internal/storybook'],
  ['tooling/tsdown/', '@internal/tsdown-config'],
  ['tooling/typescript/', '@internal/tsconfig'],
  ['tooling/vitest/', '@internal/vitest-config'],
];

function typecheckStagedPackages(files) {
  const filters = new Set();

  for (const file of files) {
    const normalizedPath = path.relative(__dirname, file).replaceAll(path.sep, '/');
    const match = packageFilters.find(([prefix]) => normalizedPath.startsWith(prefix));

    if (match == null) {
      return ['pnpm run typecheck'];
    }

    filters.add(match[1]);
  }

  return Array.from(filters, (filter) => `pnpm --filter ${filter} typecheck`);
}

function formatStagedFiles(files) {
  return [
    `pnpm exec prettier --write ${files.map((file) => JSON.stringify(file)).join(' ')}`,
  ];
}

module.exports = {
  '*.{ts,tsx}': typecheckStagedPackages,
  '*.{ts,tsx,js,jsx,yml,yaml,json}': formatStagedFiles,
};
