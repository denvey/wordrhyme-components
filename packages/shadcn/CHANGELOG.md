# @pixpilot/shadcn

## 2.0.0

### Major Changes

- Sync pixpilot/shadcn-components through 1ef005a5387331a697bc04decbd2652487846da6.

  Introduce OverlayProvider and drawer/dialog registries, component MCP servers,
  date clearing, richer editor and loading interactions, and Formily overlay
  decorators. Preserve WordRhyme searchable Select, MultiCombobox scrolling,
  Formily compatibility props and array DOM filtering. DialogProvider remains a
  deprecated alias for OverlayProvider.

  Replace the unused authentication package with the upstream provider, magic
  link, email OTP and profile components. Introduce the controlled Kanban package
  with drag-and-drop, filtering, paging, virtualization and touch support.

  See docs/upstream-upgrade.md for migration details.

### Patch Changes

- 492c940: Publish the transitive Tailwind CSS source entries across the complete component dependency chain.

  Generate both CSS entries in `dist` during the package build, keeping the public import paths unchanged. Component packages share one CSS build function; no per-package source stylesheet needs to be maintained.

  Release all four packages together so workspace dependencies resolve to newly published versions that export `./tailwind.css`, rather than older registry packages without that entry. The Tailwind entries contain source declarations only and do not inject theme or reset rules.

  Also publish an opt-in `./styles.css` entry for applications without a Tailwind build. Each package builds a self-contained stylesheet covering its own components and the transitive component dependencies, including the shared default theme, dark mode, and animation utilities. It does not include global Preflight or page background rules. CSS imports are marked as side effects so production bundlers preserve them.

## 1.3.4

### Patch Changes

- d227d42: Match select trigger typography to inputs on narrow screens.

## 1.3.3

### Patch Changes

- f6ad223: Match select trigger typography to inputs on narrow screens.

## 1.3.2

### Patch Changes

- Fix auto-crud remote filter search pagination and publish matching Wordrhyme UI dependencies.

## 1.3.1

### Patch Changes

- 65120f4: fix release

## 1.3.0

### Minor Changes

- add id prop support across various components for improved accessibility

## 1.2.7

### Patch Changes

- 4237cd7: fix release

## 1.2.6

### Patch Changes

- keep workspace packages in source during HMR

## 1.2.5

### Patch Changes

- 01ccd0c: fix release

## 1.2.4

### Patch Changes

- package issue

## 1.2.3

### Patch Changes

- 3d902a3: new release

## 1.2.2

### Patch Changes

- cc5d0dc: new fix release

## 1.2.1

### Patch Changes

- update size handling and component structure

## 1.2.0

### Minor Changes

- enhance dialog component with container context and overlay behavior

## 1.1.0

### Minor Changes

- enhance dialog component with container support and backdrop click prevention

## 1.0.0

### Major Changes

- 47dbbfb: new release

## 0.11.1

### Patch Changes

- ffaab2d: new release

## 0.11.0

### Minor Changes

- restructure form exports and prevent accidental re-export

## 0.10.1

### Patch Changes

- remove unused `form` export from index

## 0.10.0

### Minor Changes

- 5fe21ce: new release

## 0.9.0

### Minor Changes

- add ButtonGroup and ToggleGroup components
- enhance component creation guidelines

## 0.8.0

### Minor Changes

- add `Rating` component to default component registry

## 0.7.1

### Patch Changes

- 2792697: new release

## 0.7.0

### Minor Changes

- add contentProps support to Select component

## 0.6.1

### Patch Changes

- 82285a5: update pnpm lock file

## 0.6.0

### Minor Changes

- enhance color parsing and alpha handling

## 0.5.0

### Minor Changes

- add Tabs component with variants and stories

## 0.4.0

### Minor Changes

- refactor schema field components and update README

## 0.3.2

### Patch Changes

- 6c1ff42: ensure release

## 0.3.1

### Patch Changes

- update imports for Alert and ConfirmationDialog components
- fix import and exports

## 0.3.0

### Minor Changes

- refactor FileUpload component and add FileUploadItems

### Patch Changes

- adjust padding in FileUpload component

## 0.2.0

### Minor Changes

- implement new FileUpload
- fix file upload

## 0.1.11

### Patch Changes

- improve button

## 0.1.10

### Patch Changes

- fix release

## 0.1.9

### Patch Changes

- fix bundler

## 0.1.8

### Patch Changes

- test

## 0.1.7

### Patch Changes

- test publish

## 0.1.6

### Patch Changes

- test publish

## 0.1.0

### Minor Changes

- test publish
