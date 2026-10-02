---
"@wordrhyme/shadcn": patch
"@wordrhyme/shadcn-ui": patch
"@wordrhyme/formily-shadcn": patch
"@wordrhyme/auto-crud": patch
---

Publish the transitive Tailwind CSS source entries across the complete component dependency chain.

Release all four packages together so workspace dependencies resolve to newly published versions that export `./tailwind.css`, rather than older registry packages without that entry. The CSS entries contain source declarations only and do not inject theme or reset rules.
