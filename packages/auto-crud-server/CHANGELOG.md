# @wordrhyme/auto-crud-server

## 1.5.1

### Patch Changes

- 0cf6f23: Allow the host date formatter registration to carry calendar locale and time-zone policy. Keep calendar selections as YYYY-MM-DD values and update mounted date filters when the host policy changes.

  Accept strict calendar-date strings in the default server date-filter fallback while retaining timestamp input support.

  Preserve selected-date labels from existing formatter-only registrations until the host explicitly opts into calendar locale presentation.

- 1b16a12: Keep Drizzle columns intact while building filter comparisons so column driver encoders serialize timestamp and other typed values correctly. Normalize Date parameters for raw SQL targets.
- 2333d62: Support preserveReferenceValue in extension field metadata so list, get and export return reference IDs for editing and data-source label resolution while retaining display values by default.

## 1.5.0

### Minor Changes

- d97a2a0: Expose typed server-side resource metadata on all generated CRUD procedures. Preserve the table object, primary-key field and operation for host integrations while retaining caller metadata, middleware and per-operation procedure configuration.

## 1.4.1

### Patch Changes

- fd5a82d: Combine base and extension search results with OR semantics and use a type-safe false condition for empty extension ID matches.

## 1.4.0

### Minor Changes

- 0360609: Run list and export count queries concurrently, apply stable multi-column sorting, preserve indexable text and JSON search targets, and add bulk CRUD extension persistence with a backward-compatible per-row fallback. Batch extension writes now require stable unique ids so returned rows are never associated by position.

## 1.3.1

### Patch Changes

- 36052f0: Import date helpers from their dedicated date-fns entry points to avoid loading the full package graph in Node.js processes.

## 1.3.0

### Minor Changes

- 72da093: Allow hosts to resolve date filters into UTC half-open ranges through an optional request-context adapter while preserving the existing server-local behavior when no adapter is provided.

  Treat non-empty host ranges as authoritative and reject invalid, reversed, or incomplete boundaries instead of silently widening a query or falling back to server-local parsing.

  Allow hosts to provide AutoCrud's process-wide date formatter so shared tables follow the host's locale and timezone policy without making AutoCrud select a timezone. Formatter registrations can be disposed safely even when cleanup occurs out of order.

## 1.2.0

### Minor Changes

- Add query capability metadata for auto-crud search, filters, and sorting, and merge provider capabilities with base router capabilities.

### Patch Changes

- 3503ad2: Derive CRUD lifecycle hook ids from plugin context when extension target ids include the plugin id prefix.
- 996881c: Treat audit actor fields as platform-managed defaults in generated CRUD schemas and UI.
  Default list views to `createdAt` descending when that column is available.

## 0.2.0

### Minor Changes

- Initial public release of auto-crud packages:

  **@wordrhyme/auto-crud** - Schema-first CRUD components
  - AutoCrudTable: Complete CRUD interface with table and form modals
  - AutoTable: Data table with simple/advanced/command filter modes
  - AutoForm: Schema-driven form generation
  - Default filter mode changed to "simple"

  **@wordrhyme/auto-crud-server** - tRPC server utilities
  - createCrudRouter: Auto-generate CRUD routers for Drizzle ORM
  - Advanced filtering, sorting, and pagination support
