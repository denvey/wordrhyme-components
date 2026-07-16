---
'@wordrhyme/auto-crud-server': minor
'@wordrhyme/auto-crud': minor
---

Allow hosts to resolve date filters into UTC half-open ranges through an optional request-context adapter while preserving the existing server-local behavior when no adapter is provided.

Treat non-empty host ranges as authoritative and reject invalid, reversed, or incomplete boundaries instead of silently widening a query or falling back to server-local parsing.

Allow hosts to provide AutoCrud's process-wide date formatter so shared tables follow the host's locale and timezone policy without making AutoCrud select a timezone. Formatter registrations can be disposed safely even when cleanup occurs out of order.
