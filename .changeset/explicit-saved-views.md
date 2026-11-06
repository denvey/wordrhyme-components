---
"@wordrhyme/auto-crud": patch
---

Disable saved views by default. Providing global viewStorage no longer enables view controls automatically. Existing consumers must set AutoCrudTable table.views or standalone AutoTable views to true or a configuration object to retain the controls. Stored display preferences do not override this opt-in.
