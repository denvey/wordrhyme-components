---
'@wordrhyme/auto-crud': minor
---

Allow personal display ordering and hiding/restoring across presets and saved views through the existing view settings. Store display preferences per user/tenant/resource without changing shared queries or invoking adapter reorder permissions.

Add a single views.hiddenViews option accepting view IDs or slugs to hide any view independently of personal preferences, with selection fallback and no restore option for configured hidden entries. Personal preferences remain ID-based and migrate older browser data from hiddenPresetIds.

Simplify view configuration forwarding and integration examples while retaining fieldsReady and the adapter reorder API for compatibility. Use smaller view counts in both selectors and include preset/shared views in the line tab stories.
