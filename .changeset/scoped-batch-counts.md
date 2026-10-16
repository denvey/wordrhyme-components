---
'@wordrhyme/auto-crud-server': minor
---

Add opt-in batch counts that reuse list authorization, filters, scope, and soft-delete rules. The new route requires a governed database provider with `$counts` support and does not fetch or enrich list rows. Existing CRUD routers keep their current routes unless `counts: true` is configured.
