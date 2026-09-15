---
"@wordrhyme/auto-crud": patch
"@wordrhyme/auto-crud-server": patch
---

Allow the host date formatter registration to carry calendar locale and time-zone policy. Keep calendar selections as YYYY-MM-DD values and update mounted date filters when the host policy changes.

Accept strict calendar-date strings in the default server date-filter fallback while retaining timestamp input support.

Preserve selected-date labels from existing formatter-only registrations until the host explicitly opts into calendar locale presentation.
