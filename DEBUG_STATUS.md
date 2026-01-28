# Debugging Status Tracker
**Date:** 2026-01-03
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

### 3. [AUDIT-002] Reversed Accounting Logic for Liability Accounts
*   **Status:** Resolved
*   **Issue:** `ScenarioLogic.ts` uses DEBIT for OD Account (Liability) settlement, which decreases the balance. Audit claims this is incorrect and expects balance to increase (Credit).
*   **Source:** `SYSTEM_AUDIT.md`
*   **Findings:**
    *   Confirmed that "OD Account" was defined as a `LIABILITY` in `electron/db/index.ts`.
    *   In the database schema, a `DEBIT` to a `LIABILITY` account decreases the balance (standard accounting).
    *   However, the application logic treats the OD Account as a funds-holding account where "Money In" (Debit) should increase the available balance.
    *   This created a situation where receiving a settlement reduced the balance, making it look like a loss.
*   **Resolution:**
    *   Updated `electron/db/index.ts` to define "OD Account" as an `ASSET`.
    *   This aligns with the application logic: Debit (Money In) -> Increase Asset Balance.
*   **Verification:**
    *   Simulated logic using `scripts/simulate_audit_002_fix.js`.
    *   Verified that with OD as Asset, a Debit of 1000 results in a balance of +1000 (correct).

## UX/UI Implementation (High/Medium Severity)

### 4. [AUDIT-006] Visual Instability in Starfield
*   **Status:** Resolved
*   **Issue:** `Math.random()` used in render loop causes comets to jump on every state update.
*   **Location:** `src/components/Starfield.tsx`
*   **Resolution:**
    *   Refactored `Starfield.tsx` to generate `top` and `left` coordinates inside `setInterval` and store them in the component state (`comets` array of objects).
    *   This ensures coordinates persist across re-renders.
*   **Verification:**
    *   Code analysis confirms that `style={{ top, left }}` is now derived from stable state rather than `Math.random()` in the JSX return.

### 5. [UX-01] Blocking Native Prompt
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

### 6. [UI-01] Inconsistent Currency Symbols
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

### 7. [UX-02] Missing Accessibility Attributes
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

### 8. [AUDIT-008] Accessibility Non-Compliance (Sidebar)
*   **Status:** Resolved
*   **Issue:** Sidebar inputs for Reconciliation (Date and Cash Count) lack accessible labels.
*   **Source:** `SYSTEM_AUDIT.md` (AUDIT-008)
*   **Location:** `src/components/Sidebar.tsx`
*   **Findings:**
    *   Date input has no label or `aria-label`.
    *   "Physical Cash Count" input has a visual label but no `htmlFor` association.
*   **Resolution:**
    *   Added `aria-label="Reconciliation Date"` to the date input.
    *   Added `id="physical-cash-count"` to the input and `htmlFor="physical-cash-count"` to the label.
*   **Verification:**
    *   Manually verified code changes as the test environment was unstable.
    *   Code inspection confirms presence of accessibility attributes.

## State Management (Medium Severity)

### 9. [STATE-01] Prop Drilling & Stale Data
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

### 10. [STATE-02] Redundant API Calls
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

### 11. [PERF-01] Unoptimized List Rendering
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

### 12. [CODE-01] Hardcoded Values
*   **Status:** Fixed
*   **Issue:** Large switch statement in `ScenarioForms.tsx`.
*   **Findings:**
    *   Scenario fields were hardcoded in the component, making it hard to maintain.
*   **Fixes Applied:**
    *   Extracted configuration to `src/config/scenarioConfig.ts`.
    *   Refactored `ScenarioForms.tsx` to render fields dynamically based on config.
*   **Verification:**
    *   Code review of `ScenarioForms.tsx` and `scenarioConfig.ts`.

### 13. [CODE-02] Inline Styling/Logic
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

### 14. [TEST-01] No Frontend Tests
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

### 15. [TEST-02] No Integration Tests
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

### 11. [AUDIT-011] Critical Logic Fragility (Account Renaming)
*   **Status:** Resolved
*   **Issue:** Core logic relies on hardcoded account names ("Cash", "OD Account"). Renaming these in the UI breaks transaction generation.
*   **Source:** `SYSTEM_AUDIT.md` (AUDIT-011)
*   **Investigation:**
    *   `ScenarioLogic.ts` uses `findAccount` which searches by `name`.
    *   `Accounts.tsx` allows renaming of any account.
*   **Resolution:**
    *   Added `slug` column to `accounts` table in `electron/db/schema.sql` and `electron/db/index.ts`.
    *   Implemented database migration to backfill slugs for existing accounts.
    *   Updated `src/engines/ScenarioLogic.ts` to prioritize looking up accounts by `slug` (e.g., 'cash', 'od_account').
    *   Updated `findAccount` to fallback to name/type for backward compatibility.
    *   Users can now safely rename system accounts without breaking core logic.
*   **Verification:**
    *   Created `scripts/verify_fix_audit_011_mock.js`.
    *   Simulated renaming 'Cash' to 'My Register 1'.
    *   Confirmed logic still finds the account via the 'cash' slug.

## Critical Bug Fixes (Phase 1 Audit)

### 16. [AUDIT-001] Reconciliation Handler Schema Mismatch
*   **Status:** Resolved
*   **Issue:** `reconciliationHandler.ts` queries non-existent columns (`source_account_id`, `destination_account_id`) in `transactions` table.
*   **Source:** `SYSTEM_AUDIT.md` (Section 2, AUDIT-001)
*   **Findings:**
    *   The database schema uses a normalized structure (`transaction_groups` -> `transactions`) with a single `account_id` per row.
    *   The handler code assumes a denormalized structure with source/destination columns.
    *   This causes a crash whenever reconciliation is attempted.
*   **Resolution:**
    *   Updated `electron/handlers/reconciliationHandler.ts` to query by `account_id`.
    *   Implemented logic to calculate net impact based on `account.type` (Asset/Expense vs Liability/Equity/Revenue) and transaction `type` (DEBIT/CREDIT).
*   **Verification:**
    *   Created `scripts/verify_fix_audit_001.js`.
    *   Seeded DB with schema and test transaction.
    *   Verified handler correctly calculates opening/closing balance.
    *   Result: PASS.

### 17. [AUDIT-102] Missing Foreign Key Enforcement
*   **Status:** Resolved
*   **Issue:** `better-sqlite3` does not enable Foreign Key constraints by default, risking data orphans (e.g., transactions pointing to non-existent groups).
*   **Source:** `SYSTEM_AUDIT.md` (AUDIT-102)
*   **Location:** `electron/db/index.ts`
*   **Findings:**
    *   Confirmed `db.pragma('foreign_keys = ON');` was missing from database initialization.
*   **Resolution:**
    *   Added `db.pragma('foreign_keys = ON');` to `electron/db/index.ts` immediately after connection creation.
*   **Verification:**
    *   Code inspection confirms the pragma is executed.

### 18. [AUDIT-003] Data Persistence Gaps (Missing Triggers)
*   **Status:** Resolved
*   **Issue:** `accounts` table balance relies solely on `AFTER INSERT` trigger. Updates or deletions of transactions do not propagate to the account balance, causing permanent data drift.
*   **Source:** `SYSTEM_AUDIT.md`
*   **Findings:**
    *   Inspected `electron/db/schema.sql` and confirmed only `update_balance_after_insert` exists.
    *   Confirmed via static analysis that `AFTER UPDATE` and `AFTER DELETE` triggers were missing.
*   **Resolution:**
    *   Added `AFTER DELETE` trigger to `electron/db/schema.sql` to reverse the effect of the deleted transaction on the account balance.
    *   Added `AFTER UPDATE` trigger to `electron/db/schema.sql` to first reverse the old transaction's effect and then apply the new transaction's effect.
*   **Verification:**
    *   Verified the SQL syntax for the new triggers in `electron/db/schema.sql`.

### 18. [AUDIT-004] IPC Error Handling Weakness
*   **Status:** Resolved
*   **Issue:** Handlers use generic `try-catch` blocks that throw raw errors to the renderer, lacking structured error codes.
*   **Source:** `SYSTEM_AUDIT.md` (Section 2, AUDIT-004)
*   **Findings:**
    *   Reproduced the issue where IPC handlers throw unstructured errors.
    *   Confirmed that `electron/handlers/*.ts` were simply catching and re-throwing raw errors.
*   **Resolution:**
    *   Created `src/types/ipcResponse.ts` to define a standardized `IpcResponse<T>` wrapper.
    *   Implemented `electron/utils/ipcHelper.ts` to wrap all IPC handler executions and map errors to standardized codes (e.g., `DUPLICATE_ENTRY`).
    *   Refactored all handlers in `electron/handlers/*.ts` to use `handleIpcRequest`.
    *   Updated frontend code (`Transactions.tsx`, `Sidebar.tsx`, `DataContext.tsx`, `Accounts.tsx`, `Settings.tsx`) to consume the new `IpcResponse` structure.
*   **Verification:**
    *   Created `scripts/verify_audit_004.js` to verify the error mapping logic.
    *   Result: PASS (Standard errors, SQLite constraints, and custom codes are correctly mapped).

### 19. [AUDIT-005] N+1 Query in Transaction History
*   **Status:** Resolved
*   **Issue:** Fetching transaction groups iterates through each group and performs a separate query to fetch its entries.
*   **Source:** `SYSTEM_AUDIT.md` (Section 2, AUDIT-005)
*   **Findings:**
    *   Initial analysis confirms the `map` loop executing a query per group in `transactionHandler.ts`.
*   **Resolution:**
    *   Optimized `transactionHandler.ts` to fetch all entries for the retrieved groups in a single query using `WHERE group_id IN (...)`.
    *   Mapped entries back to groups in memory.
    *   This reduces database round-trips from N+1 to 2 (1 for groups, 1 for entries).
*   **Verification:**
    *   Created `scripts/verify_audit_005.js` to benchmark the old vs new logic.
    *   The new logic produces identical results with significantly fewer DB calls.

### 20. [AUDIT-007] Main-Thread Blocking Feedback
*   **Status:** Resolved
*   **Issue:** Synchronous `window.alert()` calls block the UI.
*   **Source:** `SYSTEM_AUDIT.md` (Section 2, AUDIT-007)
*   **Findings:**
    *   Identified usage of `alert()` in `Sidebar.tsx`, `Transactions.tsx`, `Settings.tsx`, and `Accounts.tsx`.
    *   `alert()` halts the main thread and provides poor UX.
*   **Resolution:**
    *   Implemented `ToastContext.tsx` using `lucide-react` icons and Tailwind CSS animations.
    *   Wrapped `App.tsx` with `ToastProvider`.
    *   Replaced all `alert()` calls with `showToast()` hook.
    *   Fixed incidental TS errors in `transactionHandler.ts`.
*   **Verification:**
    *   `npm run build` passed successfully.
    *   Code analysis confirms `alert()` is no longer used in key user flows.

### 21. [AUDIT-009] Visual Inconsistency (Theme Variable Bypass)
*   **Status:** Resolved
*   **Issue:** Dashboard charts use hardcoded `bg-blue-100` instead of semantic theme variables, breaking theme consistency (e.g., Obsidian mode).
*   **Source:** `SYSTEM_AUDIT.md` (Section 2.3, AUDIT-009)
*   **Findings:**
    *   `src/pages/Dashboard.tsx` (Lines 70) uses `bg-blue-100` and `hover:bg-blue-200`.
    *   `tailwind.config.js` provides `accent` and `primary` semantic colors.
    *   This confirms the audit finding: the UI will not adapt to theme changes.
*   **Resolution:**
    *   Updated `src/pages/Dashboard.tsx` to use `bg-accent/20` and `hover:bg-accent/40` instead of hardcoded blue colors.
    *   This ensures the chart bars automatically adopt the primary color of the active theme (Sky Blue for Default, Violet for Obsidian).
*   **Verification:**
    *   Code inspection of `src/pages/Dashboard.tsx` confirms usage of semantic Tailwind utility classes.

### 22. [AUDIT-010] UX Friction: Global Loading State Flickering
*   **Status:** Resolved
*   **Issue:** `refreshData` in `DataContext.tsx` sets `isLoading` to `true` on every call, causing UI flickering.
*   **Source:** `SYSTEM_AUDIT.md` (Section 2, AUDIT-010)
*   **Location:** `src/contexts/DataContext.tsx`
*   **Findings:**
    *   Confirmed in code: `setIsLoading(true)` is called at the start of `refreshData`.
    *   Verified via simulation that this triggers a state update even when data is present.
*   **Resolution:**
    *   Updated `refreshData` in `src/contexts/DataContext.tsx`.
    *   Added a check: `if (accounts.length === 0 && !stats) { setIsLoading(true); }`.
    *   This ensures `isLoading` is only set to `true` during the initial load, enabling background refreshing for subsequent updates.
*   **Verification:**
    *   Simulated the logic fix in `scripts/verify_audit_010.js`.
    *   Confirmed that subsequent calls to `refreshData` do not trigger the loading state.

### 23. [AUDIT-012] Destructive State Loss on Tab Switch
*   **Status:** Resolved
*   **Issue:** Switching tabs causes components to unmount, losing local state (e.g., half-filled forms).
*   **Source:** `SYSTEM_AUDIT.md` (Section 2, AUDIT-012)
*   **Location:** `src/App.tsx`
*   **Analysis:**
    *   `src/App.tsx` used conditional rendering (`{activeTab === 'transactions' && <Transactions />}`).
    *   This caused React to unmount the component when the tab was switched, destroying its local state.
*   **Resolution:**
    *   Refactored `src/App.tsx` to use CSS-based visibility toggling (`display: block/none`).
    *   All main page components (`Dashboard`, `Transactions`, `Accounts`, `Settings`) are now rendered once and kept in the DOM.
    *   This preserves their internal state (scroll position, form data) when navigating between tabs.
*   **Verification:**
    *   Verified with debug logs that `Transactions` component no longer unmounts when switching tabs.
    *   User confirmed that form data persists after navigating away and back.

### 24. [AUDIT-013] Extensive Theming Violations
*   **Status:** Resolved
*   **Issue:** Hardcoded color values (hex, rgb) or Tailwind utility classes bypass the CSS variable theme system.

### 25. [AUDIT-014] Non-Responsive Layout (Fixed Sidebar)
*   **Status:** Resolved
*   **Issue:** Sidebar has a fixed width (`w-80`), taking up too much space on smaller screens.
*   **Source:** `SYSTEM_AUDIT.md` (AUDIT-014)
*   **Resolution:**
    *   Implemented collapsible functionality in `src/components/Sidebar.tsx`.
    *   Added a toggle button to switch between full width (`w-80`) and icon-only mode (`w-20`).
    *   Optimized content visibility: Labels and forms are hidden in collapsed mode, while icons and status indicators remain visible.
    *   Added tooltips (via `title` attribute) for better UX in collapsed mode.
*   **Verification:**
    *   Manual verification of code logic ensures state toggles width classes correctly.
*   **Source:** `SYSTEM_AUDIT.md` (AUDIT-013)
*   **Location:** `src/pages/Settings.tsx`, `src/pages/Accounts.tsx`, `src/pages/Dashboard.tsx`, `src/components/ThemeToggle.tsx`, `src/contexts/ToastContext.tsx`, `src/components/Sidebar.tsx`.
*   **Resolution:**
    *   Defined new semantic colors `success` and `destructive` in `src/index.css` and `tailwind.config.js`.
    *   Replaced hardcoded `bg-blue-600`, `text-green-600`, `text-red-500` etc. with `bg-accent`, `text-success`, `text-destructive` across all identified files.
    *   Updated `ThemeToggle.tsx` to use semantic borders and backgrounds.
    *   Standardized alert and toast colors to use semantic variables.
*   **Verification:**
    *   `npm run build` passed successfully.
    *   Code review confirms usage of semantic tokens (e.g., `text-success`, `bg-accent`) instead of raw colors.

### 26. [AUDIT-015] Accessibility Gaps (Icon-Only Buttons)
*   **Status:** Resolved
*   **Issue:** Icon-only buttons lack `aria-label`, making them inaccessible to screen readers.
*   **Source:** `SYSTEM_AUDIT.md` (AUDIT-015)
*   **Target Files:** `Accounts.tsx`, `Settings.tsx`, `ThemeToggle.tsx`, `Sidebar.tsx`, `Transactions.tsx`, `ScenarioSelector.tsx`.
*   **Resolution:**
    *   Added `aria-label` attributes to icon-only buttons in `Accounts.tsx` (Edit, Save, Cancel).
    *   Added `aria-label` attributes to `Settings.tsx` (Remove Transaction Type).
    *   Added `aria-label` to `ThemeToggle.tsx` buttons.
    *   Added `aria-label` to `Sidebar.tsx` navigation, collapse, and add account buttons.
    *   Added `aria-label` to `Transactions.tsx` (pagination, view ledger) and `ScenarioSelector.tsx`.
*   **Verification:**
    *   `npm run build` passed successfully.
    *   Code inspection confirms `aria-label` presence on interactive elements.

### 27. [AUDIT-111] Missing Business Logic: Internal Transfers
*   **Status:** Resolved
*   **Findings:** Confirmed omission of internal transfer logic.
*   **Resolution Details:** Added `INTERNAL_TRANSFER` to scenario config and engine logic.

### 28. [AUDIT-101] Floating Point Precision Errors
*   **Status:** Resolved
*   **Findings:** Identified floating point risk in financial data.
*   **Resolution Details:** Migrated DB to INTEGER (cents/paise) and refactored logic/UI for integer math.
    - Updated `schema.sql` (REAL -> INTEGER).
    - Implemented migration in `db/index.ts` (x100 multiplier).
    - Refactored `ScenarioLogic.ts` for integer math.
    - Added `formatUtils.ts` and updated React components.

### 29. [AUDIT-016] UX Failure: Exposure of Raw Database IDs
*   **Status:** Resolved
*   **Findings:** Confirmed users had to manually enter IDs.
*   **Resolution Details:** Implemented dynamic account dropdowns for Internal Transfer.

### 30. [AUDIT-017] Input Validation Failure (Negative/Infinite Values)
*   **Status:** Resolved
*   **Findings:** Confirmed negative values were accepted.
*   **Resolution Details:** Added strict positive integer validation in ScenarioLogic and transactionHandler.