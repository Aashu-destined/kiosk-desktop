# System Audit Report - Phase 2 Remediation

**Date:** 2026-01-28
**Auditor:** Kilo Code (Architect)
**Version:** 2.0
**Status:** DRAFT

---

## Executive Summary
This audit focuses on critical remediation of the "Kiosk Transaction Manager" application. While the UI is largely complete, the system suffers from fundamental data integrity issues (Schema mismatch), accounting logic errors (Liability handling), and performance bottlenecks (Animation jitter). 

**Total Findings:** 8
**Critical (P0):** 2
**High (P1):** 2
**Medium (P2):** 2
**Low (P3):** 2

---

## Critical Findings (P0 - Immediate Action Required)

### [AUDIT-001] - Reconciliation Schema Mismatch [RESOLVED]
*   **Category:** Data Integrity
*   **Severity:** Critical (P0)
*   **Description:** The `daily_records` table in `electron/db/schema.sql` lacks an `account_id` column. However, the application logic (`reconciliationHandler.ts`) implies checking balances for specific accounts. This makes it impossible to store reconciliation data for multiple distinct accounts (e.g., multiple cash drawers or bank accounts), leading to data corruption or overwrites if multiple accounts are reconciled on the same day.
*   **Location:** `electron/db/schema.sql` (Line 28), `electron/handlers/reconciliationHandler.ts`
*   **Steps to Reproduce:**
    1.  Attempt to save a reconciliation record for "Cash Account A".
    2.  Attempt to save a reconciliation record for "Cash Account B" on the same date.
    3.  **Result:** The second record will overwrite the first (due to `UNIQUE(date)` constraint), or fail to distinguish between the two accounts.
*   **Impact:** Complete loss of historical reconciliation data integrity for multi-account setups.
*   **Fix:** 
    1.  Modify `daily_records` schema: Add `account_id INTEGER REFERENCES accounts(id)`.
    2.  Update `UNIQUE` constraint to `UNIQUE(date, account_id)`.
    3.  Update `reconciliationHandler.ts` to INSERT/SELECT using `account_id`.
*   **Resolution:** Confirmed `schema.sql` has `account_id` and `UNIQUE(date, account_id)`. Confirmed `reconciliationHandler.ts` uses `account_id`.

### [AUDIT-002] - Accounting Logic Inversion (Liabilities) [RESOLVED]
*   **Category:** Business Logic
*   **Severity:** Critical (P0)
*   **Description:** In `src/engines/ScenarioLogic.ts`, the `KIOSK_WITHDRAWAL_ON_US` scenario handles the "Bank Settlement" leg by DEBITING the `od_account`. Since the OD account is classified as a `LIABILITY`, a DEBIT operation *decreases* the balance (reduces debt). However, in the context of a Kiosk Withdrawal where the merchant *receives* settlement funds, the intention is often to track the *increase* in available funds (or increase in liability if it's a loan drawdown). The current logic decreases the Liability balance when money comes in, which contradicts the "Settlement" flow if the user expects to see the "Balance" rise.
*   **Location:** `src/engines/ScenarioLogic.ts` (Line 115)
*   **Steps to Reproduce:**
    1.  Select "Kiosk Withdrawal (On Us)".
    2.  Enter Amount: 1000, Settled: 1000.
    3.  Process Transaction.
    4.  Check "OD Account" balance.
    5.  **Result:** Balance decreases by 1000.
*   **Impact:** Financial reports will show incorrect Liability balances, potentially showing the business as "paying off debt" when they are actually receiving funds (or vice versa depending on the exact accounting model intended).
*   **Fix:** 
    *   Clarify if `od_account` is an Asset (Bank Balance) or Liability (Debt).
    *   If Liability: CREDIT the account to increase the balance (Liability Increase).
    *   If Asset: Change Account Type to ASSET.
*   **Resolution:** Confirmed `electron/db/index.ts` defines OD Account as `ASSET`. `ScenarioLogic.ts` DEBITs the Asset (Increase), matching user expectation of funds availability.

---

## High Priority Findings (P1 - Urgent)

### [AUDIT-006] - Animation Jitter & Performance [RESOLVED]
*   **Category:** Performance / UX
*   **Severity:** High (P1)
*   **Description:** The `Starfield.tsx` component uses a `setInterval` loop combined with `Math.random()` to update React state (`setComets`) every few seconds. This triggers full component re-renders and potential layout thrashing, causing visible jitter in the UI, especially on lower-end hardware typical of Kiosk setups.
*   **Location:** `src/components/Starfield.tsx` (Lines 12-31)
*   **Impact:** Degraded user experience; application feels "heavy" or "laggy".
*   **Fix:** 
    *   Refactor to use CSS-only animations for comet movement where possible.
    *   If JS is needed, use `requestAnimationFrame` and manipulate DOM directly or use a Canvas overlay to avoid React render cycles for background effects.
*   **Resolution:** Refactored `Starfield.tsx` to generate static comet data once on mount (`useMemo`) and rely on CSS Animations (`@keyframes comet-cycle`) for the loop. Eliminated `setInterval` and `useState` updates.

### [AUDIT-007] - Blocking Alerts & Notifications [RESOLVED]
*   **Category:** UX
*   **Severity:** High (P1)
*   **Description:** While `Transactions.tsx` uses a Toast system, there are reports (per legacy audit) of `window.alert()` usage. Blocking alerts freeze the renderer process and disrupt the workflow.
*   **Location:** Global search required (potentially in `App.tsx` error boundaries or legacy handlers).
*   **Impact:** Poor UX; application appears to freeze.
*   **Fix:** Enforce a strict "No Alert" policy. Replace all instances of `window.alert`, `window.confirm`, and `window.prompt` with the `ToastContext` or a custom Modal component.
*   **Resolution:** Performed global search for `alert()` calls. None found. Confirmed removed.

---

## Medium Findings (P2 - Warning)

### [AUDIT-008] - Accessibility Gaps
*   **Category:** Accessibility (a11y)
*   **Severity:** Medium (P2)
*   **Description:** The Transaction list table (`src/pages/Transactions.tsx`) lacks a `caption` for screen readers. Several interactive elements (like the "View Ledger" button) rely on mouse interactions.
*   **Location:** `src/pages/Transactions.tsx`
*   **Fix:** Add `<caption>` to tables. Ensure all interactive elements have `aria-label` and support keyboard navigation (Tab index).

### [AUDIT-009] - Hardcoded Strings
*   **Category:** Maintainability
*   **Severity:** Medium (P2)
*   **Description:** UI strings in `ScenarioForms.tsx` (e.g., "Customer Name (Optional)", "Processing...") are hardcoded.
*   **Location:** `src/components/ScenarioForms.tsx`
*   **Fix:** Extract strings to a `constants/strings.ts` or i18n file to support future localization.

---

## Low Findings (P3 - Info)

### [AUDIT-010] - Unused Dependencies
*   **Category:** Configuration
*   **Severity:** Low (P3)
*   **Description:** `package.json` lists `electron-rebuild` in `devDependencies`. Ensure this is necessary given the `rebuild` script.
*   **Fix:** Audit and prune unused npm packages to reduce install size.

### [AUDIT-011] - Missing Pagination State Persistence
*   **Category:** UX
*   **Severity:** Low (P3)
*   **Description:** Pagination in `Transactions.tsx` resets to Page 1 on reload.
*   **Fix:** Persist `currentPage` in `sessionStorage` or URL query params.

---

## Risk Assessment & Remediation Strategy

### Risk Matrix
*   **Data Loss Risk:** **HIGH** (Due to AUDIT-001)
*   **Financial Inaccuracy:** **HIGH** (Due to AUDIT-002)
*   **Performance Risk:** **MEDIUM** (Due to AUDIT-006)

### Recommended Strategy
1.  **Phase 1 (Immediate):** Fix AUDIT-001 (Schema) and AUDIT-002 (Logic). These are blockers for deployment as they corrupt data.
2.  **Phase 2 (UX/Perf):** Fix AUDIT-006 (Starfield) and AUDIT-007 (Alerts).
3.  **Phase 3 (Polish):** Address Accessibility and Hardcoded strings.

This audit concludes that the system is **NOT READY** for production release until P0 items are resolved.
