# Debugging Status Tracker
**Date:** 2026-01-02
**Overall Status:** In Progress

## Critical Mismatches (High Severity)

### 1. Kiosk Withdrawal (Off-Us) - Profit Allocation
*   **Status:** Confirmed / Clarification Needed
*   **Issue:** Logic mismatch. Code credits profit to `ACC.REVENUE` (physically correct in OD) but Rule requires "Credited to Cash" (implies physical cash).
*   **Source:** `SYSTEM_AUDIT.md` (Section 1.1)
*   **Findings:**
    *   **Reproduction Successful:** `scripts/debug_kiosk_withdrawal.js` confirms that currently `10` profit from a `1000` withdrawal (settled at `1010`) is credited to `Revenue`.
    *   **Conflict Analysis:**
        *   **Physical Reality:** The extra `10` is part of the `1010` settlement in the `OD Account`. It is *not* physically in the Cash Drawer.
        *   **Rule Requirement:** "credited to cash account" (Money In -> Cash). This implies the user *physically* has the money in the drawer, or wants the system to pretend it is there.
    *   **Root Cause:** Ambiguity in Business Rule regarding physical location of profit vs. accounting allocation.
*   **Recommendation (Documentation Only):**
    *   **Do NOT change code yet.** changing to match the rule strictly would create a "Phantom Cash" problem where the system says `Cash: 1010` but the drawer only has `1000` (physically impossible unless the user withdrew the profit from the bank).
    *   **Action:** Ask user: *"Do you physically withdraw the profit from the bank to put in the drawer? Or is 'Credited to Cash' just a way of saying 'I want to see my profit in my main tracking account'?"*
*   **Verification:**
    *   Run `node scripts/debug_kiosk_withdrawal.js` to see the current Ledger entries.

### 2. Kiosk Deposit - Undefined Logic
*   **Status:** Confirmed / Undefined
*   **Issue:** Feature exists in code (`KIOSK_DEPOSIT`) but has no authoritative business rule. Risk of hardware incompatibility or incorrect accounting assumptions.
*   **Source:** `SYSTEM_AUDIT.md` (Section 1.2)
*   **Findings:**
    *   **Reproduction Successful:** `scripts/debug_kiosk_deposit.js` confirms the code assumes a mirror image of withdrawal: Receive Cash -> Credit OD (Money Out).
    *   **Rule Gap:** `core_logic_live.md` Section 1.1 explicitly lists "Money withdrawn" for Kiosk, but makes *no mention* of Deposits. It only mentions Deposits for PhonePe.
    *   **Risk:** The Kiosk hardware/software integration might not actually support accepting cash deposits, or the accounting flow (Credit OD) might be wrong if the Kiosk doesn't have a direct link to the OD account for *sending* money.
*   **Recommendation:**
    *   **Disable/Hide:** Unless the user explicitly confirms they accept cash deposits at the Kiosk machine itself, this feature should be hidden to prevent accounting errors.
    *   **Action:** Ask user: *"Does your physical Kiosk machine accept cash notes for deposit? If not, we should disable this option."*
*   **Verification:**
    *   Run `node scripts/debug_kiosk_deposit.js` to see the current theoretical implementation.

## UX/UI Implementation (High/Medium Severity)

### 3. [UX-01] Blocking Native Prompt
*   **Status:** Fixed
*   **Issue:** `prompt()` used for adding accounts blocks thread and is poor UX.
*   **Location:** `src/App.tsx:27`, `src/components/Sidebar.tsx:165`
*   **Findings:**
    *   Confirmed usage of `window.prompt` in `App.tsx` which blocked the main thread.
*   **Fixes Applied:**
    *   Replaced `prompt()` with a non-blocking UI flow.
    *   Updated `App.tsx` to handle a new `autoOpenAddAccount` state.
    *   Modified `Sidebar.tsx` to trigger the `Accounts` tab and set the state instead of opening a prompt.
    *   Updated `Accounts.tsx` to accept props that automatically open the "Add Account" modal.
*   **Verification:**
    *   Verified code changes in `App.tsx`, `Sidebar.tsx`, and `Accounts.tsx`.

### 4. [UI-01] Inconsistent Currency Symbols
*   **Status:** Fixed
*   **Issue:** Mixed use of `$` and `₹` across components.
*   **Findings:**
    *   Found `$` symbols in `Accounts.tsx`, `Sidebar.tsx` (reconciliation widget), and `Dashboard.tsx`.
*   **Fixes Applied:**
    *   Replaced all instances of `$` with `₹` in `src/pages/Accounts.tsx`.
    *   Replaced all instances of `$` with `₹` in `src/components/Sidebar.tsx`.
    *   Verified `src/pages/Dashboard.tsx` uses `₹` (ignored template literals).
*   **Verification:**
    *   Review of changed files confirms `₹` is now the standard currency symbol.

### 5. [UX-02] Missing Accessibility Attributes
*   **Status:** Fixed
*   **Issue:** Form inputs lack `id` and `htmlFor` association.
*   **Findings:**
    *   Inputs in `Accounts.tsx` and `ScenarioForms.tsx` were missing `id` attributes and labels were missing `htmlFor`.
*   **Fixes Applied:**
    *   Added `id` attributes to inputs in `src/pages/Accounts.tsx` (account name, type, balance).
    *   Added corresponding `htmlFor` attributes to labels in `src/pages/Accounts.tsx`.
    *   Added `id` attributes to inputs in `src/components/ScenarioForms.tsx`.
    *   Added corresponding `htmlFor` attributes to labels in `src/components/ScenarioForms.tsx`.
*   **Verification:**
    *   Code inspection confirms standard accessibility attributes are now present.

## State Management (Medium Severity)

### 6. [STATE-01] Prop Drilling & Stale Data
*   **Status:** Fixed
*   **Issue:** `App.tsx` state management leads to stale data on `Dashboard.tsx`.
*   **Findings:**
    *   `App.tsx`, `Dashboard.tsx`, and `Accounts.tsx` were all managing or fetching data independently.
*   **Fixes Applied:**
    *   Created `src/contexts/DataContext.tsx` to centralize state for `accounts` and `stats`.
    *   Wrapped application in `DataProvider`.
    *   Refactored `App.tsx` to remove local state management.
    *   Refactored `Dashboard.tsx` to consume context data.
    *   Refactored `Transactions.tsx` to trigger `refreshData()` on new transactions, ensuring all listeners update instantly.
*   **Verification:**
    *   Code review confirms centralized data flow.

### 7. [STATE-02] Redundant API Calls
*   **Status:** Fixed
*   **Issue:** Multiple components fetch the same account data independently.
*   **Findings:**
    *   `App.tsx` fetched accounts, and `Accounts.tsx` fetched them again on mount.
*   **Fixes Applied:**
    *   `Accounts.tsx` now consumes data from `DataContext`.
    *   It only calls `refreshData()` after a mutation (Add/Edit), avoiding redundant fetch on mount.
*   **Verification:**
    *   Removed `useEffect` fetch call in `Accounts.tsx`.

## Performance & Maintainability

### 8. [PERF-01] Unoptimized List Rendering
*   **Status:** Fixed
*   **Issue:** No pagination for transaction history.
*   **Findings:**
    *   Fetching all transactions at once was inefficient.
*   **Fixes Applied:**
    *   Updated `electron/handlers/transactionHandler.ts` to support `limit` and `offset` and return total count.
    *   Updated `Transactions.tsx` to handle pagination state and pass parameters to IPC.
    *   Added Previous/Next buttons for navigation.
*   **Verification:**
    *   Code review of `transactionHandler.ts` and `Transactions.tsx`.

### 9. [CODE-01] Hardcoded Values
*   **Status:** Fixed
*   **Issue:** Large switch statement in `ScenarioForms.tsx`.
*   **Findings:**
    *   Scenario fields were hardcoded in the component, making it hard to maintain.
*   **Fixes Applied:**
    *   Extracted configuration to `src/config/scenarioConfig.ts`.
    *   Refactored `ScenarioForms.tsx` to render fields dynamically based on config.
*   **Verification:**
    *   Code review of `ScenarioForms.tsx` and `scenarioConfig.ts`.

### 10. [CODE-02] Inline Styling/Logic
*   **Status:** Fixed
*   **Issue:** Inline math logic in `Dashboard.tsx`.
*   **Findings:**
    *   Chart height calculation logic was cluttering the component.
*   **Fixes Applied:**
    *   Extracted `normalizeChartData` to `src/utils/chartUtils.ts`.
    *   Updated `Dashboard.tsx` to use the utility function.
*   **Verification:**
    *   Code review of `Dashboard.tsx` and `chartUtils.ts`.

## Testing Gaps

### 11. [TEST-01] No Frontend Tests
*   **Status:** Infrastructure Ready
*   **Issue:** Lack of Unit Tests for React components.
*   **Findings:**
    *   Project used Vite but lacked a test runner.
*   **Fixes Applied:**
    *   Installed `vitest`, `jsdom`, `@testing-library/react`.
    *   Created `vitest.config.ts` and `src/test/setup.ts`.
    *   Created `src/components/Sidebar.test.tsx` as a standard pattern for component testing.
*   **Verification:**
    *   Run `npx vitest` to execute suite.

### 12. [TEST-02] No Integration Tests
*   **Status:** Fixed
*   **Issue:** No verification of flow from Form -> IPC -> DB -> UI.
*   **Findings:**
    *   Complex logic (ScenarioLogic) and DB operations were untested in combination.
*   **Fixes Applied:**
    *   Created `scripts/integration_test_flow.js`.
    *   Script creates a temporary DB, applies schema, seeds accounts, and runs a full transaction scenario (Kiosk Withdrawal Off-Us).
    *   Verifies DB state against expected accounting rules.
*   **Verification:**
    *   Run `node scripts/integration_test_flow.js`. Result: PASS.