---
'@wordrhyme/auto-crud': patch
---

Keep excluded column configuration stable when row selection changes to avoid rebuilding table columns and remounting cells.

Reuse the table body when parent selection callbacks rerender without changing data or table state, while preserving selection-dependent cells and live date formatting.
