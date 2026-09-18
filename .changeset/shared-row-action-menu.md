---
'@wordrhyme/auto-crud': patch
---

Use the shared @wordrhyme/ui entry for extensible row action menus. Consumers
must provide the new @wordrhyme/ui peer dependency and use its menu items for
custom actions, including Host resource permission entries.

Requires @wordrhyme/ui ^0.1.0-alpha.20 at runtime, including its CommonJS root
export. Publish the UI provider first; alpha.19 is only a development fixture.
