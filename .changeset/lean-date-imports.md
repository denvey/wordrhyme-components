---
'@wordrhyme/auto-crud-server': patch
---

Import date helpers from their dedicated date-fns entry points to avoid loading the full package graph in Node.js processes.
