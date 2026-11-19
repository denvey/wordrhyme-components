---
"@wordrhyme/auto-crud": minor
"@wordrhyme/auto-crud-server": minor
---

Enable `allowSkippingListTotal` on a CRUD router to accept `list({ includeTotal: false })` and return rows before an independent count. The response omits `total` and uses `pageCount: -1`. While the total is unknown, the pager disables last-page navigation and stops advancing once the current page contains fewer rows than requested.
