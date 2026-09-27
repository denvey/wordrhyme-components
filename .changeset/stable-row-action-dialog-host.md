---
'@wordrhyme/auto-crud': minor
---

Allow custom row actions to open controlled dialogs hosted by AutoCrudTable. Dialogs survive menu dismissal, column updates, and source-row removal; closing releases the dialog, and each new opening starts a fresh session.

Add a typed `open(options)` row-action entry point for built-in operations and custom dialogs while preserving all existing action methods.
