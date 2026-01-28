# Active Context

## Current Focus
The immediate focus is **Quality Assurance & Input Hardening**. The critical "Phase 1 & 2 System Audit" remediation is complete, and the system is stable. The current goal is to enforce strict input validation (AUDIT-017) to prevent logical data corruption and verify the new features with automated tests.

## Recent Changes
- **Audit Remediation (Critical):**
    - Fixed SQL schema mismatch in Reconciliation (AUDIT-001).
    - Corrected Accounting Logic for Liability Accounts (AUDIT-002).
    - Fixed Account Renaming fragility by introducing `slugs` (AUDIT-011).
    - Implemented Foreign Key constraints (AUDIT-102).
- **Audit Remediation (Data Integrity):**
    - Migrated database and logic to use **Integer Math** (cents/paise) to eliminate floating-point errors (AUDIT-101).
    - Added database triggers for `UPDATE` and `DELETE` to ensure account balance consistency.
- **Audit Remediation (UX):**
    - Refactored `Starfield` animation to eliminate jitter (AUDIT-006).
    - Replaced blocking `window.alert` with a non-blocking **Toast Notification System** (AUDIT-007).
    - Implemented "Internal Transfer" scenario with dynamic account selection (AUDIT-111, AUDIT-016).
- **Audit Consolidation:**
    - Migrated resolved findings from `DEBUG_STATUS.md` to `SYSTEM_AUDIT.md` (AUDIT-018 to AUDIT-027).
- **Audit Consolidation:**
    - Migrated resolved findings from `DEBUG_STATUS.md` to `SYSTEM_AUDIT.md` (AUDIT-018 to AUDIT-027).

## Active Decisions
- **Input Validation Strategy:** We are adopting a "Zero Trust" approach for IPC boundaries. All financial inputs must be validated on the backend to be positive integers.
- **Testing Strategy:** We are expanding the automated test suite (`scripts/integration_test_flow.js` and Vitest) to cover edge cases like self-transfers and negative inputs.

## Current State
- **Architecture:** Electron + React architecture is stable and robust.
- **Database:** Schema is normalized, strictly typed (Integer), and protected by Foreign Keys and Triggers.
- **Frontend:** UI is polished, responsive, and accessible.
- **Testing:** Basic infrastructure is ready; Integration tests verified the "Happy Path".

## Immediate Next Steps (Todo)
1.  **Input Hardening (AUDIT-017):** Implement strict positive integer validation for the "Internal Transfer" scenario in `ScenarioLogic.ts` and IPC handlers.
2.  **User Verification (AUDIT-016):** Verify that the "Internal Transfer" UI correctly handles account selection and prevents invalid transfers (e.g., Source == Destination).
3.  **Automated Assurance:** Create a dedicated test suite for Internal Transfers covering edge cases (negative amounts, self-transfers).
4.  **Documentation:** Update user guide to reflect the new "Internal Transfer" feature.

## Known Issues
- **Input Validation Gap:** "Internal Transfer" currently lacks strict validation for negative numbers or zero values (AUDIT-017).
