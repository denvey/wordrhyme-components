---
"@wordrhyme/auto-crud-server": major
---

Return raw extension values by default from list, get, and export. A defined refId (including null) takes precedence over value; display is only a fallback for legacy projections without a raw value. No field opt-in or metadata read is needed.

Migration: consumers that relied on display labels in CRUD rows must resolve labels through field data sources or their presentation layer. Providers should supply editable values in value, including ID arrays for multi-reference fields. Exports now contain raw values when available; human-readable reports must resolve labels explicitly.
