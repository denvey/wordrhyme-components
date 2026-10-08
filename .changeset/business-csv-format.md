---
"@wordrhyme/auto-crud": patch
---

Add field-level `format(value, { row, target })` for default table/detail text and CSV values. Returning `undefined` preserves existing formatting. Keep existing export columns, headers and permission exclusions, and add a UTF-8 BOM for CSV downloads.
