---
'@wordrhyme/shadcn': major
'@wordrhyme/shadcn-ui': major
'@wordrhyme/formily-shadcn': major
'@wordrhyme/shadcn-auth': major
'@wordrhyme/shadcn-kanban': minor
---

Sync pixpilot/shadcn-components through 1ef005a5387331a697bc04decbd2652487846da6.

Introduce OverlayProvider and drawer/dialog registries, component MCP servers,
date clearing, richer editor and loading interactions, and Formily overlay
decorators. Preserve WordRhyme searchable Select, MultiCombobox scrolling,
Formily compatibility props and array DOM filtering. DialogProvider remains a
deprecated alias for OverlayProvider.

Replace the unused authentication package with the upstream provider, magic
link, email OTP and profile components. Introduce the controlled Kanban package
with drag-and-drop, filtering, paging, virtualization and touch support.

See docs/upstream-upgrade.md for migration details.
