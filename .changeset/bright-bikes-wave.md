---
'@wordrhyme/auto-crud': patch
---

Allow table fields to customize body cell classes and apply configured column sizes.

Use fixed column tracks for tables with a finite maxSize so browser auto layout cannot stretch capped columns. Tables without a width cap keep their automatic layout.

Keep column tracks in pinned rendering order, contain overflowing cell content in fixed layouts, and let default text inherit configured cell wrapping.
