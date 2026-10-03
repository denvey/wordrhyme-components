# Upstream component upgrade

Source: [pixpilot/shadcn-components](https://github.com/pixpilot/shadcn-components/tree/1ef005a5387331a697bc04decbd2652487846da6).

## Retained WordRhyme behavior

- All package names continue to use `@wordrhyme/*`.
- `Select` retains its `simple` and `searchable` modes, single and multiple
  selection, rich option labels and custom trigger support.
- `MultiCombobox` retains its portal, nested scrolling and keyboard behavior.
- Formily compatibility props, including input addons, clearing, sizing,
  number formatting, textarea sizing and FormItem layout, remain supported.
- Array configuration props remain filtered before reaching DOM elements.
- `showConfirmDialog` retains independent instances for concurrent calls;
  the new `confirmDialog` facade controls a shared instance.
- Table, ActionBar, Faceted, Sortable, Kbd and Skeleton remain exported.
- Existing release infrastructure and Auto CRUD packages are retained.

## Overlays

Prefer the shared `OverlayProvider` when mounting registered dialogs or drawers:

```tsx
import { OverlayProvider } from '@wordrhyme/shadcn-ui';

<OverlayProvider>{children}</OverlayProvider>;
```

`DialogProvider` remains an alias for existing consumers. The shared provider
prevents nested providers from shadowing the modal store, and accepts
`portalContainerRef` for overlays rendered inside a host container.

Formily now includes dialog, drawer and popover decorators and array drawers.
`FormItem.requiredMark` accepts a boolean or React node; `asterisk` continues
to work as a deprecated fallback.

## Authentication

`@wordrhyme/shadcn-auth` adopts the upstream 2.0 component API. The previous
authentication components were unused in this project, so their old interfaces
are not retained. Use `ProviderSignInButtons` for provider buttons in place of
the former `GoogleSignIn` component. The package also exports `MagicLinkForm`,
`EmailOtpForm`, `CompleteProfileForm` and `SignInMethods`.

Authentication state and handlers are supplied by the host. These components
do not implement authentication endpoints or store account data. See the
[authentication README](../packages/shadcn-auth/README.md) for integration.

## Kanban

```tsx
import { KanbanBoard } from '@wordrhyme/shadcn-kanban';

<KanbanBoard
  columns={[
    { id: 'todo', title: 'To Do' },
    { id: 'done', title: 'Done' },
  ]}
  items={items}
  onChange={(event) => setItems(event.items)}
/>;
```

The board is controlled by its `items` prop. It provides drag-and-drop,
column reordering, filtering, paging, virtualization and touch interaction.
See the [Kanban README](../packages/shadcn-kanban/README.md).

## Component MCP

The UI and Formily packages expose component MCP binaries. Registries are
generated during their normal builds. WordRhyme's additional UI components are
included alongside upstream metadata.

## Packaging

Package versions are advanced by Changesets. Published exports point to built
files and preserve WordRhyme package identities. This upgrade does not publish
packages automatically; publication follows the repository's release workflow.
