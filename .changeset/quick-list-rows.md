---
"@wordrhyme/auto-crud": minor
"@wordrhyme/auto-crud-server": minor
---

Allow list input schemas to opt in to `includeTotal: false` so rows can return before an independent count. A rows only response omits `total` and uses `pageCount: -1`; pagination can display the current page while the count is unknown.
