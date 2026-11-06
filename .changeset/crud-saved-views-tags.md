---
"@wordrhyme/auto-crud": minor
"@wordrhyme/auto-crud-server": minor
---

Add globally configured saved query views and dynamic tags with inclusion, exclusion, any/all matching, tag management and record assignment. Support structured tag filters through the existing correlated extension SQL conditions on the server.

Keep tag columns read-only by default and expose a controlled assignment dialog so consumers can place text or icon triggers in existing row, toolbar, cell or batch action slots.

Initialize tag selection from current record tags, preserve untouched mixed selections in batch editing and submit only the resulting additions and removals. Place editor actions in a single row.

Create tags from the current picker list and edit names and colors inline through per-tag icons, with inline deletion confirmation and no separate management dialog.

Allow switching saved views between a dropdown before search and tabs above the toolbar, with contextual settings and a configurable selector.

Limit TagService.list to resource/field scope and query/page/pageSize/signal inputs, and require a single paginated result with TagOption entries and hasMore.

Add an optional views.counts callback for batched saved-view totals in tabs and dropdowns, with loading, zero and retry states, and an in-memory Storybook example.
