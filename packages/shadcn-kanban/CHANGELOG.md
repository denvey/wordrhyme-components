# @wordrhyme/shadcn-kanban

## 1.1.3

### Patch Changes

- Updated dependencies [f564a13]
  - @wordrhyme/shadcn-ui@2.1.1

## 1.1.2

### Patch Changes

- Updated dependencies [b8045ed]
- Updated dependencies [d2b58fc]
  - @wordrhyme/shadcn-ui@2.1.0

## 1.1.1

### Patch Changes

- Updated dependencies [4ba625e]
  - @wordrhyme/shadcn-ui@2.0.1

## 1.1.0

### Minor Changes

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

- Updated dependencies [4d8f1b1]
- Updated dependencies
- Updated dependencies [492c940]
  - @wordrhyme/shadcn-ui@2.0.0

## 1.1.3

### Patch Changes

- @wordrhyme/shadcn-ui@3.18.1

## 1.1.2

### Patch Changes

- Updated dependencies
  - @wordrhyme/shadcn-ui@3.18.0

## 1.1.1

### Patch Changes

- Updated dependencies
- Updated dependencies [e29bbee]
  - @wordrhyme/shadcn-ui@3.17.6

## 1.1.0

### Minor Changes

- add touch-friendly dragging and column snapping
- 12310c9: Make the board usable on touch screens.

  A finger on a card no longer starts a drag on contact. Card dragging now waits
  for a 250 ms hold (tunable via the new `touch` prop), so a swipe that happens to
  begin on top of a card scrolls the board instead of dragging the card away. The
  card rings while it is held, so the hold is visible before the drag arms.

  Below the `sm` breakpoint columns become CSS scroll-snap children roughly a
  screen wide, so a swipe pages exactly one column with the platform's own
  momentum. Controlled by the new `columnSnap` prop; pass `false` for the previous
  plain scroller.

  Mouse and keyboard activation are unchanged.

  Behavioural notes for existing consumers:
  - Cards are now `touch-action: manipulation` instead of `touch-action: none`,
    and `user-select: none`.
  - Below `sm`, columns are sized from `--kanban-column-snap-width` rather than
    `flex-1`, unless `columnSnap={false}`.
  - The column reorder grip gained an `aria-label` and a `data-kanban-drag-handle`
    attribute; a column wrapper gained `data-testid="kanban-column-<id>"`.

## 1.0.0

### Major Changes

- c0a92c0: first release

### Minor Changes

- add drag-and-drop kanban board package

### Patch Changes

- Updated dependencies
  - @wordrhyme/shadcn-ui@3.17.5

## 0.3.0

### Minor Changes

- add drag-and-drop kanban board package

### Patch Changes

- Updated dependencies
  - @wordrhyme/shadcn-ui@3.17.4

## 0.2.0

### Minor Changes

- add drag-and-drop kanban board package

### Patch Changes

- Updated dependencies
  - @wordrhyme/shadcn-ui@3.17.3

## 0.1.0

### Minor Changes

- add drag-and-drop kanban board package

### Patch Changes

- Updated dependencies
  - @wordrhyme/shadcn-ui@3.17.2
