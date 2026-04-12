# Local Date And Detail Fix Design

## Scope

This change fixes two confirmed issues only:

1. Income detail cards read role totals from the expense bucket.
2. Frontend and backend default date/month logic uses UTC via `toISOString()`, which can drift at local day and month boundaries.

## Approach

Add a small shared utility layer for deterministic date/month formatting and detail-summary selection.
Replace direct `toISOString().slice(...)` usage with local-time helpers.
Use a small detail summary helper so the detail page always reads the correct role totals for the active type.

## Validation

Use Node's built-in test runner for two regression areas:

1. Local date/month formatting near UTC boundaries.
2. Detail summary selection for both income and expense.
