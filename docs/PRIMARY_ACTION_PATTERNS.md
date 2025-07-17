# Primary Action Patterns (2025-07-16)

## 🆕 DASHBOARD NAVIGATION & PRIMARY ACTION UPDATE
- All navigation to Settings, Profile, Secrets, and Audit Log is now via the user dropdown
- All primary actions and navigation use updated `data-testid` patterns for dropdown items
- Documentation files synchronized to reflect new navigation and test structure

## ✅ COMPLETED
- All primary action buttons, including secrets-first flows, use `data-testid="primary-action {action}-btn"` pattern
- All E2E and unit tests use the new pattern
- All pattern tasks marked as completed

## Examples
- `data-testid="primary-action generate-workflow-btn"`
- `data-testid="primary-action save-workflow-btn"`
- `data-testid="primary-action execute-workflow-btn"`
- `data-testid="primary-action create-connection-header-btn"`
- ...and all other core flows

_Last updated: 2025-07-16 (Dashboard navigation refactor, E2E, and documentation update)_ 