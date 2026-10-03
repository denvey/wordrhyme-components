---
"@wordrhyme/shadcn": patch
"@wordrhyme/shadcn-ui": patch
"@wordrhyme/formily-shadcn": patch
"@wordrhyme/auto-crud": patch
---

Publish the transitive Tailwind CSS source entries across the complete component dependency chain.

Release all four packages together so workspace dependencies resolve to newly published versions that export `./tailwind.css`, rather than older registry packages without that entry. The Tailwind entries contain source declarations only and do not inject theme or reset rules.

Also publish an opt-in `./styles.css` entry for applications without a Tailwind build. Each package builds a self-contained stylesheet covering its own components and the transitive component dependencies, including the shared default theme, dark mode, and animation utilities. It does not include global Preflight or page background rules. CSS imports are marked as side effects so production bundlers preserve them.
