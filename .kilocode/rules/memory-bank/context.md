# Context

## Current Focus
The immediate focus is **System Remediation** following the "Phase 1 & 2 System Audit". The application is functional in terms of UI, but critical backend logic and data integrity issues must be resolved before further feature development.

## Recent Changes
- Completed full UI implementation (Sidebar, Dashboard, Transactions, Settings).
- Implemented "Scenario Engine" logic in frontend.
- Implemented IPC handlers for all database operations.
- Added "Celestial" and "Obsidian Flux" themes with animations.

## Active Decisions
- **Audit Remediation Strategy:** We are prioritizing P0 (Critical) and P1 (Urgent) findings from `SYSTEM_AUDIT.md`.
    - **Reconciliation:** Must fix the SQL schema mismatch (`source_account_id` vs `account_id`) immediately.
    - **Accounting Logic:** Must fix the inverted Debit/Credit logic for Liability accounts (OD) in `ScenarioLogic.ts`.
    - **UX/Performance:** Must fix the `Math.random` animation jitter and replace blocking `alert()` calls.

## Current State
- **Architecture:** Electron + React architecture is stable.
- **Database:** Schema exists but requires triggers for data integrity (Update/Delete).
- **Frontend:** UI is polished but has accessibility and performance gaps.
- **Testing:** Basic infrastructure (Vitest) is ready; Integration tests exist but need expansion.
- **High-Level Status:** Late Alpha. Core features built, but requires remediation.

## Immediate Next Steps (Todo)
1.  **Fix Reconciliation (AUDIT-001):** Update `reconciliationHandler.ts` to use the correct schema columns.
2.  **Fix Accounting Logic (AUDIT-002):** Correct `ScenarioLogic.ts` to properly Credit Liabilities (Increase) instead of Debiting them.
3.  **Fix Animation Jitter (AUDIT-006):** Refactor `Starfield.tsx` to move random generation out of the render loop.
4.  **UX Improvement (AUDIT-007):** Replace `window.alert` with a toast notification system.

## Known Issues
- **Reconciliation Crash:** `source_account_id` column missing in DB schema.
- **Accounting Inversion:** OD Account balance increases on Debit (should be Credit).
- **Animation Jitter:** Starfield background flickers due to random re-renders.

## Planned / Backlog
- [ ] **Advanced Reporting:** Export to Excel/PDF.
- [ ] **Cloud Sync:** Backup mechanism (future scope).
- [ ] **Multi-User:** Authentication (if scaling beyond single owner).
- [ ] **Automated Updates:** GitHub Actions workflow for release building.