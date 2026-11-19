---
"@wordrhyme/auto-crud": minor
"@wordrhyme/auto-crud-server": minor
---

Declare `total: z.boolean().optional()` in a router's list input schema to support `list({ total: false })`. This skips the count, omits `total` from the response, and returns `pageCount: -1`. Requests that omit the flag or pass `true` receive the exact count. While the total is unknown, the pager disables last-page navigation and stops advancing once the current page contains fewer rows than requested.
