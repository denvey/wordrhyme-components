---
'@wordrhyme/auto-crud': patch
---

Allow column metadata to customize header and body cell classes and apply configured column sizes.

Use fixed column tracks for tables with a finite maxSize so browser auto layout cannot stretch capped columns. Tables without a width cap keep their automatic layout.

Keep column tracks in pinned rendering order, contain overflowing cell content in fixed layouts, and let default text inherit configured cell wrapping.

Group column classes under `fields.xxx.table.classNames`, with `th` applied to headers and `td` to body cells. Add global `table.classNames` for `table`, `thead`, `tbody`, `tr`, `th`, and `td`, shared by AutoTable and DataTable. Merge cell classes in default, global, then column order.
