# SYSTEM AUDIT - Phase 1: Backend, Data Layer, and Core Logic

## 1. Executive Summary
This audit focuses on the backend integrity, database reliability, and core business logic of the `kiosk-desktop` application. While basic accounting logic appears to be directionally correct following previous fixes, significant risks remain regarding data precision, database constraints, and timezone handling. The application relies on floating-point arithmetic for financial calculations, which is prone to rounding errors. Additionally, foreign key constraints are not enforced, risking data orphans, and the reconciliation logic contains fragile hardcoded dependencies. Recent comparisons with `core_logic_live.md` have confirmed discrepancies in profit allocation logic and missing features for internal transfers.

---

## 2. Audit Findings (Backend & Logic)

### [AUDIT-001] - Reconciliation Schema Mismatch [RESOLVED]
- **Category:** Data Integrity
- **Section:** 3. Functional Logic
- **Location:** `electron/handlers/reconciliationHandler.ts` / `electron/db/schema.sql`
- **Severity:** Critical
- **Description:** Previous reports indicated a crash where `reconciliationHandler.ts` attempted to query a `source_account_id` column. Verified that the current codebase correctly uses `account_id` consistent with the schema.
- **Impact:** None (Resolved).
- **Resolution:** Confirmed `reconciliationHandler.ts` uses normalized `account_id` lookups.

### [AUDIT-002] - Accounting Logic Inversion (Liability Accounts) [RESOLVED]
- **Category:** Business Logic
- **Section:** 3. Functional Logic
- **Location:** `src/engines/ScenarioLogic.ts`
- **Severity:** Critical
- **Description:** The user's mental model for Liability accounts (OD) follows an inverted structure where "Credit" (Money In) is perceived as an increase in available funds.
- **Resolution:** Verified that "OD Account" is seeded as an `ASSET` type in `electron/db/index.ts`. This ensures that `DEBIT` transactions (Money In) increase the balance (positive number), matching the user's expectation of "Funds Available" going up, even if the accounting term is "Debit".
- **Impact:** None (Resolved).

### [AUDIT-101] - Floating Point Precision Errors in Financial Calculations [RESOLVED]
- **Category:** Data Integrity
- **Section:** 6. Data Integrity & Validation
- **Location:** `src/engines/ScenarioLogic.ts` (Lines 116, 171, 195, 227), `electron/db/schema.sql` (Line 6)
- **Severity:** High
- **Description:** The application used standard JavaScript `number` (IEEE 754 floating point) and SQLite `REAL` for all monetary values. Financial applications must use integer-based math (storing cents) or decimal data types to avoid precision loss.
- **Resolution:** Migrated database to store amounts as `INTEGER` (cents/paise). Refactored `ScenarioLogic.ts` and UI components to use integer-based calculations. Added utility for formatting display values.
- **Impact:** None (Resolved).

### [AUDIT-102] - Missing Foreign Key Enforcement [RESOLVED]
- **Category:** Data Integrity
- **Section:** 6. Data Integrity & Validation
- **Location:** `electron/db/index.ts`
- **Severity:** High
- **Description:** `better-sqlite3` does not enable Foreign Key constraints by default.
- **Resolution:** Added `db.pragma('foreign_keys = ON');` to database initialization in `electron/db/index.ts`.
- **Impact:** None (Resolved).

### [AUDIT-103] - Hardcoded Account Dependency in Reconciliation [RESOLVED]
- **Category:** Functional Logic
- **Section:** 3. Functional Logic
- **Location:** `electron/handlers/reconciliationHandler.ts`
- **Severity:** High
- **Description:** The reconciliation handler explicitly queries for an account named `'Cash'`. If the user renames the "Cash" account, the reconciliation feature will fail or default to an incorrect account.
- **Resolution:** Updated query to use `slug = 'cash'`, ensuring resilience against display name changes.

### [AUDIT-104] - Timezone-Unaware Date Handling [RESOLVED]
- **Category:** Functional Logic
- **Section:** 3. Functional Logic
- **Location:** `src/engines/ScenarioLogic.ts`
- **Severity:** Medium
- **Description:** The application generates dates using UTC. For users in non-UTC timezones, late-night transactions may be recorded on the previous day.
- **Resolution:** Switched to local date generation (`toLocaleDateString('en-CA')`).

### [AUDIT-105] - Stale Reconciliation Snapshots [RESOLVED]
- **Category:** Data Integrity
- **Section:** 11. State Management
- **Location:** `electron/handlers/reconciliationHandler.ts`
- **Severity:** Medium
- **Description:** `daily_records` stores a snapshot of `cash_closing_calculated`. If past transactions are edited, this snapshot becomes stale.
- **Resolution:** Implemented status invalidation in `transactionHandler.ts`. Adding new transactions now resets the `status` of that day's reconciliation to `'OPEN'`.

### [AUDIT-106] - Zero-Trust Input Validation Failure [RESOLVED]
- **Category:** Data Integrity
- **Section:** 6. Data Integrity & Validation
- **Location:** `electron/handlers/transactionHandler.ts`
- **Severity:** Medium
- **Description:** API endpoints trust frontend payloads implicitly (e.g., negative amounts).
- **Resolution:** Added server-side validation in IPC handlers to reject invalid/negative amounts and missing fields.

### [AUDIT-107] - Reconciliation Read Isolation Failure (Race Condition) [RESOLVED]
- **Category:** State Management
- **Section:** 11. State Management
- **Location:** `electron/handlers/reconciliationHandler.ts`
- **Severity:** Medium
- **Description:** Read-Compute sequence is not atomic. New transactions during computation can skew the Opening Balance calculation.
- **Resolution:** Wrapped the entire read-compute sequence in a `db.transaction`.

### [AUDIT-108] - Ambiguous Profit Logic for Off-Us Withdrawals [RESOLVED]
- **Category:** Functional Logic
- **Section:** 3. Functional Logic
- **Location:** `src/engines/ScenarioLogic.ts`
- **Severity:** Low (Ambiguity)
- **Description:** `ScenarioLogic` leaves profit in OD (Settlement - Cash Given). `core_logic_live.md` suggests profit should be credited to Cash.
- **Resolution:** Updated `ScenarioLogic.ts` to credit profit to the Cash account (Debit Cash, Credit Revenue).

### [AUDIT-109] - Dashboard Logic Fragility (Hardcoded Account Name) [RESOLVED]
- **Category:** Functional Logic
- **Section:** 3. Functional Logic
- **Location:** `electron/handlers/dashboardHandler.ts`
- **Severity:** Medium
- **Description:** Dashboard looks for account named `'Cash'`. Renaming fails the query.
- **Resolution:** Updated query to use `slug = 'cash'`.

### [AUDIT-110] - Data Loss in On-Us Withdrawals [RESOLVED]
- **Category:** Functional Logic
- **Section:** 3. Functional Logic
- **Location:** `src/engines/ScenarioLogic.ts`
- **Severity:** High
- **Description:** `KIOSK_WITHDRAWAL_ON_US` ignores `total_settled` input, assuming it equals `amount`. Any difference (fee/loss) is silently discarded.
- **Resolution:** Incorporation of `total_settled` into logic; differences are now recorded as Revenue/Loss.

### [AUDIT-111] - Missing Business Logic: Internal Transfers [RESOLVED]
- **Category:** Functional Logic
- **Section:** 3. Functional Logic
- **Location:** `src/engines/ScenarioLogic.ts`
- **Severity:** High
- **Description:** No scenario exists for "Internal Transfer" (rebalancing Cash/Bank/OD) as required by `core_logic_live.md`.
- **Resolution:** Implemented `INTERNAL_TRANSFER` scenario.

### [AUDIT-112] - Profit Allocation Logic Mismatch (Cash vs OD) [RESOLVED]
- **Category:** Business Logic
- **Section:** 3. Functional Logic
- **Location:** `src/engines/ScenarioLogic.ts`
- **Severity:** Medium
- **Description:** Requirement: "difference amount will be credited to cash account". Implementation: Profit remains in OD.
- **Resolution:** Refactored withdrawal scenarios to credit profit to the Cash account.

### [AUDIT-113] - PhonePe Withdrawal Profit Allocation Mismatch [RESOLVED]
- **Category:** Business Logic
- **Section:** 3. Functional Logic
- **Location:** `src/engines/ScenarioLogic.ts`
- **Severity:** High
- **Description:** The `PHONEPAY_WITHDRAWAL` logic currently credits profit to the **Cash Account** (attempting to mimic Kiosk logic), but `core_logic_live.md` (Sec 3) explicitly states that for PhonePe transactions, the difference (profit) should be credited to the **Bank Account**.
- **Resolution:** Updated `ScenarioLogic.ts` to retain the profit in the Bank Account (Debit Bank Full Amount, Credit Cash Given, Credit Revenue Difference), ensuring it matches the physical flow of funds.

### [AUDIT-114] - Unbalanced Ledger Entries in Withdrawals [RESOLVED]
- **Category:** Data Integrity
- **Section:** 6. Data Integrity & Validation
- **Location:** `src/engines/ScenarioLogic.ts`
- **Severity:** Critical
- **Description:** The logic for `KIOSK_WITHDRAWAL_ON_US`, `KIOSK_WITHDRAWAL_OFF_US`, and `PHONEPAY_WITHDRAWAL` generates unbalanced ledger entries. The code appends a profit entry (`Debit Cash`, `Credit Revenue`) without adjusting the main settlement entry or ensuring the total debits equal total credits. This results in `Total Debits = Settlement + Profit` vs `Total Credits = Settlement` (specifically for cases where profit is added on top of full settlement).
- **Resolution:** Refactored `ScenarioLogic.ts` to ensure all scenarios generate balanced ledger entries. For Withdrawals, the profit is now correctly handled by explicitly transferring the surplus from the Settlement Account to Cash (Debit Cash, Credit Settlement) alongside the Revenue recognition (Credit Revenue), ensuring Total Debits = Total Credits.

### [AUDIT-115] - Internal Transfer Logic/Expectation Mismatch (OD Liability) [RESOLVED]
- **Category:** Business Logic / UX
- **Section:** 3. Functional Logic
- **Location:** `src/engines/ScenarioLogic.ts`
- **Severity:** High (User Confusion)
- **Description:** The user expects withdrawing from an OD (Liability) account to *decrease* the balance. However, mathematically, withdrawing from a Liability *increases* the debt balance. The system currently correctly implements the accounting logic (Credit Liability = Increase), but this conflicts with the user's mental model.
- **Resolution:** Changed OD Account type from LIABILITY to ASSET to match user mental model (Withdrawal = Decrease Balance). Added database migration to update existing accounts.
- **Impact:** None (Resolved).


---

# SYSTEM AUDIT - Phase 2: Frontend, User Interface, and User Experience

## 1. Executive Summary
Phase 2 focuses on the React-based frontend. Significant performance bottlenecks were identified in animation logic (`Starfield`), and the UX is hampered by synchronous alerts. Critical accessibility gaps remain.

## 2. Audit Findings (Frontend/UX)

### [AUDIT-006] - Visual Instability & Performance Degradation (Math.random in Render) [RESOLVED]
- **Category:** Performance
- **Location:** `src/components/Starfield.tsx`
- **Severity:** HIGH
- **Description:** `Math.random()` in render loop causes comets to teleport on every state update.
- **Suggested Fix:** Move random generation to `useEffect`.

### [AUDIT-007] - Main-Thread Blocking Feedback (Synchronous Alerts) [RESOLVED]
- **Category:** UX
- **Location:** `src/components/Sidebar.tsx`
- **Severity:** MEDIUM
- **Description:** Uses `window.alert()` for feedback, freezing the UI.
- **Suggested Fix:** Implement Toast notifications.

### [AUDIT-008] - Accessibility Non-Compliance (Missing Form Labels) [RESOLVED]
- **Category:** Accessibility
- **Severity:** HIGH
- **Description:** Inputs lack labels/aria-labels.
- **Suggested Fix:** Add `htmlFor` and `aria-label`.

### [AUDIT-009] - Visual Inconsistency (Theme Variable Bypass) [RESOLVED]
- **Category:** UI
- **Location:** `src/pages/Dashboard.tsx`
- **Severity:** LOW
- **Description:** Hardcoded Tailwind colors (`bg-blue-100`) bypass the theme system.
- **Suggested Fix:** Use semantic variables (e.g., `bg-accent/20`).

### [AUDIT-010] - UX Friction: Global Loading State Flickering [RESOLVED]
- **Category:** UX
- **Location:** `src/contexts/DataContext.tsx`
- **Severity:** MEDIUM
- **Description:** `isLoading` triggers full-page refresh on every data update.
- **Suggested Fix:** Implement background refresh.

### [AUDIT-011] - Critical Logic Fragility (Account Renaming) [RESOLVED]
- **Category:** User Journey
- **Location:** `src/engines/ScenarioLogic.ts`
- **Severity:** CRITICAL
- **Description:** Logic relies on hardcoded Account Names. Renaming "Cash" breaks the entire engine.
- **Suggested Fix:** Use `slug` or `is_system` flag.

### [AUDIT-012] - Destructive State Loss on Tab Switch [RESOLVED]
- **Category:** UX
- **Location:** `src/App.tsx`
- **Severity:** HIGH
- **Description:** Switching tabs unmounts components, destroying form state.
- **Suggested Fix:** Use CSS hiding or persistent state.

### [AUDIT-013] - Extensive Theming Violations (Hardcoded Colors) [RESOLVED]
- **Category:** UI
- **Severity:** LOW
- **Description:** Hardcoded colors in Settings/Accounts pages.
- **Suggested Fix:** Use semantic theme tokens.

### [AUDIT-014] - Non-Responsive Layout (Fixed Sidebar) [RESOLVED]
- **Category:** UI
- **Location:** `src/components/Sidebar.tsx`
- **Severity:** MEDIUM
- **Description:** Fixed width sidebar consumes too much space on small screens.
- **Suggested Fix:** Make sidebar collapsible/responsive.

### [AUDIT-015] - Accessibility Gaps (Icon-Only Buttons) [RESOLVED]
- **Category:** Accessibility
- **Severity:** MEDIUM
- **Description:** Buttons rely on icons without aria-labels.
- **Suggested Fix:** Add `aria-label`.

### [AUDIT-016] - UX Failure: Exposure of Raw Database IDs [RESOLVED]
- **Category:** User Experience
- **Location:** `src/components/ScenarioForms.tsx` / `src/config/scenarioConfig.ts`
- **Severity:** HIGH
- **Description:** The "Internal Transfer" form requires users to manually enter `fromAccountId` and `toAccountId`. Users do not know these database keys, making the feature unusable.
- **Resolution:** Replaced text inputs with dynamic `<select>` dropdowns populated by the accounts list in `ScenarioForms.tsx` and updated `scenarioConfig.ts`.

### [AUDIT-017] - Input Validation Failure (Negative/Infinite Values) [RESOLVED]
- **Category:** Data Integrity
- **Location:** `src/engines/ScenarioLogic.ts`
- **Severity:** HIGH
- **Description:** The `amount` field accepts negative numbers. In a double-entry system, a negative "Credit" becomes a "Debit", inverting the transaction logic unexpectedly. Furthermore, infinite values are not blocked.
- **Resolution:** Implemented strict positive integer validation in `ScenarioLogic.ts` and `transactionHandler.ts`.
- **Suggested Fix:** Implement strict schema validation (e.g., Zod) to ensure amounts are positive integers.

### [AUDIT-018] - Blocking Native Prompt [RESOLVED]
- **Category:** User Experience
- **Section:** 8. User Experience (UX)
- **Location:** `src/App.tsx`, `src/components/Sidebar.tsx`
- **Severity:** Medium
- **Description:** Usage of `window.prompt()` for adding accounts blocks the main thread and provides a poor user experience.
- **Resolution:** Replaced `prompt()` with a non-blocking UI flow using `autoOpenAddAccount` state and a proper modal interface.

### [AUDIT-019] - Inconsistent Currency Symbols [RESOLVED]
- **Category:** UI Consistency
- **Section:** 7. User Interface (UI)
- **Location:** `src/pages/Accounts.tsx`, `src/components/Sidebar.tsx`
- **Severity:** Low
- **Description:** Mixed use of `$` and `₹` symbols across components.
- **Resolution:** Standardized all currency displays to use the Indian Rupee symbol (`₹`).

### [AUDIT-020] - Missing Accessibility Attributes [RESOLVED]
- **Category:** Accessibility
- **Section:** 8. User Experience (UX)
- **Location:** `src/pages/Accounts.tsx`, `src/components/ScenarioForms.tsx`
- **Severity:** Medium
- **Description:** Form inputs lacked `id` attributes and labels missed corresponding `htmlFor` associations, violating accessibility standards.
- **Resolution:** Added `id` and `htmlFor` attributes to all identified form inputs and labels.

### [AUDIT-021] - Prop Drilling & Stale Data [RESOLVED]
- **Category:** State Management
- **Section:** 11. State Management
- **Location:** `src/App.tsx`, `src/contexts/DataContext.tsx`
- **Severity:** Medium
- **Description:** `App.tsx` managed state locally and passed it down via props, leading to stale data in `Dashboard.tsx` and `Transactions.tsx`.
- **Resolution:** Centralized state management in `DataContext.tsx` and wrapped the application in a `DataProvider`.

### [AUDIT-022] - Redundant API Calls [RESOLVED]
- **Category:** Performance
- **Section:** 10. Performance
- **Location:** `src/pages/Accounts.tsx`
- **Severity:** Low
- **Description:** Multiple components fetched the same account data independently, causing unnecessary IPC overhead.
- **Resolution:** Refactored components to consume data from `DataContext` and only refresh after mutations.

### [AUDIT-023] - Unoptimized List Rendering [RESOLVED]
- **Category:** Performance
- **Section:** 10. Performance
- **Location:** `electron/handlers/transactionHandler.ts`, `src/pages/Transactions.tsx`
- **Severity:** Medium
- **Description:** Transaction history fetched all records at once without pagination.
- **Resolution:** Implemented server-side pagination (limit/offset) in `transactionHandler.ts` and added pagination controls in the UI.

### [AUDIT-024] - Hardcoded Values in Form Logic [RESOLVED]
- **Category:** Code Quality
- **Section:** 12. Code Quality
- **Location:** `src/components/ScenarioForms.tsx`
- **Severity:** Low
- **Description:** Scenario fields were hardcoded within the component, reducing maintainability.
- **Resolution:** Extracted configuration to `src/config/scenarioConfig.ts` and refactored the form to render dynamically.

### [AUDIT-025] - Inline Business Logic in View [RESOLVED]
- **Category:** Code Quality
- **Section:** 12. Code Quality
- **Location:** `src/pages/Dashboard.tsx`
- **Severity:** Low
- **Description:** Complex chart height calculation logic was mixed with UI rendering code.
- **Resolution:** Extracted logic to `src/utils/chartUtils.ts`.

### [AUDIT-026] - Lack of Frontend Unit Tests [RESOLVED]
- **Category:** Testing
- **Section:** 13. Testing
- **Location:** `src/test/`
- **Severity:** High
- **Description:** The project lacked a test runner and unit tests for React components.
- **Resolution:** Configured `vitest`, `jsdom`, and `testing-library`, and added example tests for `Sidebar.tsx`.

### [AUDIT-027] - Lack of Integration Tests [RESOLVED]
- **Category:** Testing
- **Section:** 13. Testing
- **Location:** `scripts/integration_test_flow.js`
- **Severity:** High
- **Description:** No automated verification of the full data flow from Form to IPC to DB.
- **Resolution:** Created `scripts/integration_test_flow.js` to simulate and verify full transaction scenarios against the database.

### [AUDIT-028] - Kiosk Deposit Undefined Logic [UNDEFINED]
- **Category:** Business Logic
- **Section:** 3. Functional Logic
- **Location:** `src/engines/ScenarioLogic.ts`
- **Severity:** Medium
- **Description:** The `KIOSK_DEPOSIT` scenario exists in code but lacks a defined business rule. It assumes a mirror of withdrawal (Credit OD), but it is unclear if the physical hardware supports this.
- **Resolution:** Pending user clarification. Recommendation is to disable/hide if not supported.

### [AUDIT-018] - Blocking Native Prompt [RESOLVED]
- **Category:** UX
- **Location:** `src/App.tsx`, `src/components/Sidebar.tsx`
- **Severity:** Medium
- **Description:** Usage of `window.prompt` blocked the main thread and provided poor user experience.
- **Resolution:** Replaced `prompt()` with a non-blocking UI flow (Modal/Sidebar integration).

### [AUDIT-019] - Inconsistent Currency Symbols [RESOLVED]
- **Category:** UI
- **Location:** `src/pages/Accounts.tsx`, `src/components/Sidebar.tsx`, `src/pages/Dashboard.tsx`
- **Severity:** Low
- **Description:** Mixed use of `$` and `₹` across components led to visual inconsistency.
- **Resolution:** Standardized all instances to `₹`.

### [AUDIT-020] - Missing Accessibility Attributes [RESOLVED]
- **Category:** Accessibility
- **Location:** `src/pages/Accounts.tsx`, `src/components/ScenarioForms.tsx`
- **Severity:** Medium
- **Description:** Form inputs lacked `id` attributes and labels were missing `htmlFor` association.
- **Resolution:** Added `id` and `htmlFor` attributes to inputs and labels to ensure proper accessibility linkage.

### [AUDIT-021] - Prop Drilling & Stale Data [RESOLVED]
- **Category:** State Management
- **Location:** `src/App.tsx`, `src/pages/Dashboard.tsx`
- **Severity:** Medium
- **Description:** Decentralized state management led to stale data on the Dashboard and redundant prop drilling.
- **Resolution:** Implemented `DataContext` to centralize state and eliminate independent fetching in child components.

### [AUDIT-022] - Redundant API Calls [RESOLVED]
- **Category:** Performance
- **Location:** `src/pages/Accounts.tsx`
- **Severity:** Low
- **Description:** Multiple components fetched the same account data independently, causing unnecessary network/IPC overhead.
- **Resolution:** Centralized data fetching in `DataContext`, removing redundant `useEffect` calls in `Accounts.tsx`.

### [AUDIT-023] - Unoptimized List Rendering [RESOLVED]
- **Category:** Performance
- **Location:** `electron/handlers/transactionHandler.ts`, `src/pages/Transactions.tsx`
- **Severity:** Medium
- **Description:** Transaction history lacked pagination, causing performance degradation as the dataset grew.
- **Resolution:** Implemented server-side pagination (limit/offset) in IPC handler and added pagination controls to the UI.

### [AUDIT-024] - Hardcoded Values in Form Logic [RESOLVED]
- **Category:** Maintainability
- **Location:** `src/components/ScenarioForms.tsx`
- **Severity:** Low
- **Description:** Large switch statement with hardcoded scenario fields made maintenance difficult.
- **Resolution:** Extracted configuration to `src/config/scenarioConfig.ts` and refactored component to render dynamically.

### [AUDIT-025] - Inline Business Logic in View [RESOLVED]
- **Category:** Maintainability
- **Location:** `src/pages/Dashboard.tsx`
- **Severity:** Low
- **Description:** Complex inline math logic for chart height calculation cluttered the component code.
- **Resolution:** Extracted logic to `src/utils/chartUtils.ts`.

### [AUDIT-026] - Lack of Frontend Unit Tests [RESOLVED]
- **Category:** Testing
- **Location:** `src/test/`
- **Severity:** High
- **Description:** The project lacked a unit testing framework for React components.
- **Resolution:** Installed Vitest, configured `setup.ts`, and established a testing pattern with `Sidebar.test.tsx`.

### [AUDIT-027] - Lack of Integration Tests [RESOLVED]
- **Category:** Testing
- **Location:** `scripts/integration_test_flow.js`
- **Severity:** High
- **Description:** No automated verification existed for the full data flow (Form -> IPC -> DB -> UI).
- **Resolution:** Created `scripts/integration_test_flow.js` to verify full transaction scenarios against database state.

### [AUDIT-028] - Reconciliation Schema Mismatch [RESOLVED]
*   **Category:** Data Integrity
*   **Severity:** Critical
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

### [AUDIT-029] - Accounting Logic Inversion (Liabilities) [RESOLVED]
*   **Category:** Business Logic
*   **Severity:** Critical
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

### [AUDIT-030] - Animation Jitter & Performance [RESOLVED]
*   **Category:** Performance / UX
*   **Severity:** High
*   **Description:** The `Starfield.tsx` component uses a `setInterval` loop combined with `Math.random()` to update React state (`setComets`) every few seconds. This triggers full component re-renders and potential layout thrashing, causing visible jitter in the UI, especially on lower-end hardware typical of Kiosk setups.
*   **Location:** `src/components/Starfield.tsx` (Lines 12-31)
*   **Impact:** Degraded user experience; application feels "heavy" or "laggy".
*   **Fix:** 
    *   Refactor to use CSS-only animations for comet movement where possible.
    *   If JS is needed, use `requestAnimationFrame` and manipulate DOM directly or use a Canvas overlay to avoid React render cycles for background effects.
*   **Resolution:** Refactored `Starfield.tsx` to generate static comet data once on mount (`useMemo`) and rely on CSS Animations (`@keyframes comet-cycle`) for the loop. Eliminated `setInterval` and `useState` updates.

### [AUDIT-031] - Blocking Alerts & Notifications [RESOLVED]
*   **Category:** UX
*   **Severity:** High
*   **Description:** While `Transactions.tsx` uses a Toast system, there are reports (per legacy audit) of `window.alert()` usage. Blocking alerts freeze the renderer process and disrupt the workflow.
*   **Location:** Global search required (potentially in `App.tsx` error boundaries or legacy handlers).
*   **Impact:** Poor UX; application appears to freeze.
*   **Fix:** Enforce a strict "No Alert" policy. Replace all instances of `window.alert`, `window.confirm`, and `window.prompt` with the `ToastContext` or a custom Modal component.
*   **Resolution:** Performed global search for `alert()` calls. None found. Confirmed removed.

### [AUDIT-032] - Accessibility Gaps
*   **Category:** Accessibility (a11y)
*   **Severity:** Medium
*   **Description:** The Transaction list table (`src/pages/Transactions.tsx`) lacks a `caption` for screen readers. Several interactive elements (like the "View Ledger" button) rely on mouse interactions.
*   **Location:** `src/pages/Transactions.tsx`
*   **Fix:** Add `<caption>` to tables. Ensure all interactive elements have `aria-label` and support keyboard navigation (Tab index).

### [AUDIT-033] - Hardcoded Strings
*   **Category:** Maintainability
*   **Severity:** Medium
*   **Description:** UI strings in `ScenarioForms.tsx` (e.g., "Customer Name (Optional)", "Processing...") are hardcoded.
*   **Location:** `src/components/ScenarioForms.tsx`
*   **Fix:** Extract strings to a `constants/strings.ts` or i18n file to support future localization.

## [AUDIT-034] - Unused Dependencies
*   **Category:** Configuration
*   **Severity:** Low
*   **Description:** `package.json` lists `electron-rebuild` in `devDependencies`. Ensure this is necessary given the `rebuild` script.
*   **Fix:** Audit and prune unused npm packages to reduce install size.

### [AUDIT-035] - Missing Pagination State Persistence
*   **Category:** UX
*   **Severity:** Low
*   **Description:** Pagination in `Transactions.tsx` resets to Page 1 on reload.
*   **Fix:** Persist `currentPage` in `sessionStorage` or URL query params.


# 3. Risk Assessment & Remediation Strategy

### 3.1 Executive Summary
*   **Overall System Health Score:** 4/10 (Critical Risks)
*   **Assessment:** While the application's "Happy Path" (standard usage) is functional, the system is fragile and user-hostile in edge cases. The exposure of raw database IDs to users (AUDIT-016) is a critical usability failure. The lack of robust input validation (AUDIT-017) poses a significant risk to financial data integrity. Remediation is urgent before any Beta release.

### 3.2 Prioritization Matrix

| Priority | Finding ID(s) | Impact | Status |
| :--- | :--- | :--- | :--- |
| **P0: Critical** | AUDIT-001, AUDIT-002, AUDIT-011, AUDIT-111 | Crashes, Data Corruption, Logic Failures. | **RESOLVED** |
| **P1: Urgent** | **AUDIT-016**, **AUDIT-017** | Feature Unusability, Data Integrity Risk. | **RESOLVED** |
| **P1: Urgent** | AUDIT-101, AUDIT-102, AUDIT-110, AUDIT-112 | Financial Inaccuracy. | **RESOLVED** |
| **P2: High** | AUDIT-006, AUDIT-012, AUDIT-103, AUDIT-109 | UX Friction, Logic Fragility. | **RESOLVED** |
| **P3: Medium** | AUDIT-007, AUDIT-008, AUDIT-015 | Compliance, Usability. | **RESOLVED** |

### 3.3 Strategic Recommendations

#### 1. Human-Centric Design (Fixing Internal Transfers)
The current "Internal Transfer" implementation is a developer-centric prototype, not a user-facing feature.
*   **Action:** Refactor `ScenarioForm` to support a `select` type field.
*   **Action:** Update `ScenarioConfig` to use account dropdowns.
*   **Action:** Filter dropdowns to prevent selecting the same account for Source and Destination.

#### 2. Input Hardening (Defense in Depth)
The system currently trusts frontend inputs too much.
*   **Action:** Integrate `zod` schema validation in `ScenarioLogic` and IPC handlers.
*   **Action:** Explicitly reject negative numbers, zero values, and non-finite numbers.

#### 3. Automated Assurance
Manual testing is insufficient for financial logic.
*   **Action:** Create a dedicated test suite for "Internal Transfers" covering:
    *   Valid transfers.
    *   Self-transfers (Source = Dest).
    *   Negative amounts.
    *   Decimal rounding (ensure no fractional cents are lost).

## 2.1 Audit Findings (Phase 2 - Backend & Architecture)

### [AUDIT-310] - Double-Entry Integrity Failure (Input Validation)
- **Category:** Data Integrity
- **Section:** 6. Data Integrity & Validation
- **Location:** `electron/handlers/transactionHandler.ts`
- **Severity:** Critical
- **Description:** The `add-transaction-group` handler validates that individual entry amounts are positive integers, but it fails to validate that the transaction group itself is balanced (i.e., `SUM(Debits) == SUM(Credits)`). A compromised or buggy frontend could insert unbalanced transactions, permanently corrupting the ledger.
- **Suggested Fix:** Add a validation step before the database transaction to sum all entries and ensure the net difference is zero (or matches a specific checksum).

### [AUDIT-311] - Missing Database Constraints (Positive Amounts)
- **Category:** Data Integrity
- **Section:** 6. Data Integrity & Validation
- **Location:** `electron/db/schema.sql`
- **Severity:** High
- **Description:** The database schema defines `amount` as `INTEGER` but lacks a `CHECK (amount > 0)` constraint. While the application layer currently checks this, a "Defense in Depth" approach requires the database to reject negative values to prevent direct SQL manipulation or future bug regressions.
- **Suggested Fix:** Add `CHECK (amount > 0)` to the `transactions` table definition.

### [AUDIT-312] - Unrestricted Account Renaming (System Accounts)
- **Category:** Business Logic
- **Section:** 3. Functional Logic
- **Location:** `electron/handlers/accountHandler.ts`
- **Severity:** High
- **Description:** The `update-account` handler allows renaming any account, including system-critical accounts like "Cash" or "OD Account". While the logic uses `slugs` (AUDIT-011) to protect calculation integrity, renaming these accounts can cause severe user confusion (e.g., renaming "Cash" to "Debt").
- **Suggested Fix:** Prevent renaming if the account's `slug` is in a protected list (`cash`, `od_account`, `revenue`, `expenses`).

### [AUDIT-313] - Negative Initial Balance Injection
- **Category:** Data Integrity
- **Section:** 6. Data Integrity & Validation
- **Location:** `electron/handlers/accountHandler.ts`
- **Severity:** High
- **Description:** The `add-account` handler accepts `initialBalance` without validation. It is possible to create an account with a negative opening balance, which may be mathematically valid but semantically incorrect for certain account types (e.g., a physical Cash drawer cannot start with negative cash).
- **Suggested Fix:** Validate `initialBalance >= 0` for Asset accounts.

### [AUDIT-314] - Reconciliation Logic Flaw (Timestamp vs Date mismatch)
- **Category:** Functional Logic
- **Section:** 3. Functional Logic
- **Location:** `electron/handlers/reconciliationHandler.ts`
- **Severity:** Medium
- **Description:** The reconciliation logic takes a `date` string (YYYY-MM-DD) from the frontend but queries transactions using a derived Unix `timestamp`. If the user enters a backdated transaction (e.g., entering yesterday's trade today), the transaction will have *today's* timestamp but *yesterday's* date. This causes the reconciliation logic to potentially exclude relevant transactions or include irrelevant ones depending on the time of execution.
- **Suggested Fix:** Ensure queries filter by the Transaction Group's `date` column, not the `timestamp` of insertion.

### [AUDIT-315] - Performance Risk: Missing Indexes
- **Category:** Performance
- **Section:** 10. Performance
- **Location:** `electron/db/schema.sql`
- **Severity:** Medium
- **Description:** Critical query fields `transaction_groups.date` and `transactions.timestamp` are not indexed. As the dataset grows, dashboard trends and reconciliation queries (which filter by these fields) will trigger full table scans, causing UI lag.
- **Suggested Fix:** Add `CREATE INDEX idx_groups_date ON transaction_groups(date);` and `CREATE INDEX idx_tx_timestamp ON transactions(timestamp);`.

### [AUDIT-316] - Ephemeral Error Logging
- **Category:** Reliability
- **Section:** 14. Observability
- **Location:** `electron/utils/ipcHelper.ts`
- **Severity:** Low
- **Description:** Errors are caught and logged via `console.error`, which only outputs to the terminal (if visible). In a production environment, these errors are lost, making it impossible to diagnose user-reported crashes or logic failures.
- **Suggested Fix:** Implement a file-based logger (e.g., `electron-log`) to persist errors to a `logs/` directory in the user's data folder.

### [AUDIT-317] - Dashboard Aggregation Performance
- **Category:** Performance
- **Section:** 10. Performance
- **Location:** `electron/handlers/dashboardHandler.ts`
- **Severity:** Medium
- **Description:** The Dashboard logic performs real-time aggregation (`SUM`, `COUNT`) on the entire `transactions` table (joined with groups) for every page load. This is O(N) relative to history size.
- **Suggested Fix:** Implement a caching strategy or use a Materialized View approach (e.g., a `daily_stats` table) updated via Triggers.

---

# SYSTEM AUDIT - Phase 3: Testing, Security, and Strategic Review

## 1. Executive Summary
Phase 3 focused on the "Meta" layer: Security, Testing, and Long-term Maintainability. While the application is functional, it lacks a robust safety net. Security was improved by enforcing CSP and Electron isolation. However, the testing infrastructure is currently unstable (AUDIT-332), and the lack of a Backup/Restore mechanism (AUDIT-333) is a critical user journey gap.

## 2. Audit Findings (Security & Strategy)

### [AUDIT-330] - Missing Content Security Policy (CSP) [RESOLVED]
- **Category:** Security
- **Section:** 9. Security
- **Location:** `index.html`
- **Severity:** High
- **Description:** The application lacked a CSP meta tag, potentially allowing execution of malicious scripts if XSS vulnerabilities were introduced.
- **Resolution:** Added `<meta http-equiv="Content-Security-Policy" ...>` to `index.html` allowing only `self` resources.

### [AUDIT-331] - Implicit Electron Security Configuration [RESOLVED]
- **Category:** Security
- **Section:** 9. Security
- **Location:** `electron/main.ts`
- **Severity:** Medium
- **Description:** `contextIsolation` and `nodeIntegration` were relying on defaults. Explicit configuration is best practice to prevent regressions.
- **Resolution:** Explicitly set `contextIsolation: true` and `nodeIntegration: false` in `main.ts`.

### [AUDIT-332] - Broken Unit Test Runner
- **Category:** Testing
- **Section:** 13. Testing
- **Location:** `src/engines/ScenarioLogic.test.ts`
- **Severity:** High
- **Description:** Although `vitest` is installed, the test runner fails to recognize test suites in `.ts` files, likely due to a configuration mismatch with Vite/Electron. This prevents TDD and automated logic verification.
- **Suggested Fix:** Fix `vite.config.ts` or `vitest.config.ts` to properly handle TypeScript in the Node environment for tests.

### [AUDIT-333] - Missing Backup & Restore User Journey
- **Category:** Strategic / User Journey
- **Section:** 15. Maintenance
- **Location:** `electron/handlers/*`
- **Severity:** Critical
- **Description:** The application relies entirely on a local SQLite file. There is no in-app mechanism for the user to Backup (Export DB) or Restore (Import DB). If the user's computer fails or the DB file is corrupted, all financial data is lost permanently.
- **Suggested Fix:** Implement an "Export Data" button (copies `.db` file to user-selected location) and "Import Data" workflow.

### [AUDIT-334] - Magic Strings in Core Logic
- **Category:** Maintainability
- **Section:** 12. Code Quality
- **Location:** `src/engines/ScenarioLogic.ts`
- **Severity:** Low
- **Description:** Account slugs like `'cash'`, `'od_account'` are defined locally in `ScenarioLogic.ts`. If these slugs change in the DB seed or elsewhere, the logic will break silently.
- **Suggested Fix:** Extract these into a shared `src/constants/accounts.ts` file used by both Seed scripts and Frontend logic.

### [AUDIT-335] - Hardcoded UI Labels
- **Category:** Maintainability
- **Section:** 12. Code Quality
- **Location:** `src/config/scenarioConfig.ts`
- **Severity:** Low
- **Description:** Labels like "Cash Given to Customer (₹)" are hardcoded. This makes potential localization or terminology changes difficult.
- **Suggested Fix:** Move labels to a resource file.

---

## 2.2 Audit Findings (Phase 4 - Recursive Deep Dive)

### [AUDIT-401] - Dependency Toolchain Mismatch
- **Category:** Configuration / Build
- **Section:** 4. Architecture & Config
- **Location:** `package.json`
- **Severity:** Medium
- **Description:** The `scripts` section defines `"rebuild": "electron-rebuild"`, but the `devDependencies` installs `@electron/rebuild`. This package naming mismatch means the `npm run rebuild` command may fail or rely on a globally installed version of the deprecated `electron-rebuild` package, leading to unpredictable native module compilation (specifically for `better-sqlite3`).
- **Suggested Fix:** Update the script to use `electron-rebuild` (if using the wrapper) or call the executable provided by `@electron/rebuild` directly, ensuring consistency.

### [AUDIT-402] - Unsafe IPC Error Type Casting
- **Category:** Type Safety
- **Section:** 4. Architecture & Config
- **Location:** `electron/utils/ipcHelper.ts`
- **Severity:** Low
- **Description:** The `handleIpcRequest` utility catches errors and returns `createErrorResponse(error) as any`. This `as any` cast completely erases type safety for the return value, potentially allowing the backend to return an error shape that the frontend does not expect or handle correctly.
- **Suggested Fix:** Define a strict `IpcErrorResponse` interface and ensure `createErrorResponse` returns it, removing the `any` cast.

### [AUDIT-403] - React Context Performance (Value Instability)
- **Category:** Performance
- **Section:** 10. Performance
- **Location:** `src/contexts/DataContext.tsx`, `src/contexts/ThemeContext.tsx`, `src/contexts/ToastContext.tsx`
- **Severity:** High
- **Description:** The Context Providers (`DataProvider`, `ThemeProvider`, `ToastProvider`) pass a new object literal as the `value` prop on every render (e.g., `value={{ accounts, stats... }}`). This breaks object reference equality, forcing every consumer component (and often the entire component tree) to re-render whenever the Provider renders, even if the actual data hasn't changed. This negates the benefits of `React.memo` and causes unnecessary layout thrashing.
- **Suggested Fix:** Wrap the context value object in `useMemo()` to ensure reference stability.

### [AUDIT-404] - Ledger Integrity Failure (Unbalanced Transactions)
- **Category:** Data Integrity
- **Section:** 6. Data Integrity & Validation
- **Location:** `electron/handlers/transactionHandler.ts`
- **Severity:** Critical
- **Description:** While `transactionHandler` validates individual entry amounts, it fails to verify the fundamental accounting equation: `Sum(Debits) == Sum(Credits)`. If a frontend bug or a malicious IPC call sends a transaction group where debits do not equal credits, the backend will accept it. This permanently corrupts the General Ledger, making the Trial Balance impossible to zero out.
- **Suggested Fix:** Implement a pre-commit validation step in the `db.transaction` block that sums all entries (Debit +, Credit -) and throws an error if the net result is not zero.

### [AUDIT-405] - Stale Data Propagation (Missing Refresh Triggers)
- **Category:** State Management
- **Section:** 11. State Management
- **Location:** `src/pages/Settings.tsx`, `src/pages/Accounts.tsx`
- **Severity:** Medium
- **Description:** Updates to Accounts (e.g., renaming) or Settings do not consistently trigger a `refreshData()` call in the global `DataContext`. Consequently, other views like the Transaction List or Dashboard may display stale Account Names or IDs until a full page reload occurs.
- **Suggested Fix:** Ensure that all mutation handlers (`update-account`, `save-setting`) explicitly call `refreshData()` from the `useData` hook upon success.

### [AUDIT-406] - Fragile Parameter Validation (Manual vs Schema)
- **Category:** Code Quality
- **Section:** 12. Code Quality
- **Location:** `src/engines/ScenarioLogic.ts`
- **Severity:** Medium
- **Description:** Input validation is currently performed via manual `if` checks (e.g., `if (params.amount === undefined)`). This is verbose, error-prone, and inconsistent across different scenarios. As the application grows, this manual validation will become a maintenance burden and a source of bugs (e.g., forgetting to check for `NaN` or `Infinity`).
- **Suggested Fix:** Adopt a schema validation library like `Zod` to define strict input shapes for each Scenario Type and parse inputs automatically.

---

## 2.3 Audit Findings (Phase 5 - Stress & Scale Simulation)

### [AUDIT-501] - Missing Early Return Guard in Frontend Submission
- **Category:** Concurrency / UX
- **Section:** 8. User Experience (UX)
- **Location:** `src/pages/Transactions.tsx`
- **Severity:** Low
- **Description:** The `handleScenarioSubmit` function manages an `isSubmitting` state to disable the UI button, but it lacks an explicit early return guard (`if (isSubmitting) return`) at the start of the function. This theoretically allows multiple invocations of the submission logic if the function is triggered programmatically, via keyboard events, or if the UI update lags behind a rapid double-click.
- **Suggested Fix:** Add `if (isSubmitting) return;` at the very beginning of the `handleScenarioSubmit` function.

### [AUDIT-502] - Missing Database Index on `transaction_groups.date`
- **Category:** Performance
- **Section:** 10. Performance
- **Location:** `electron/db/schema.sql`, `electron/handlers/dashboardHandler.ts`
- **Severity:** Medium
- **Description:** The Dashboard's "Daily Profit" and "Trend Analysis" queries heavily filter `transaction_groups` by the `date` column. Currently, `transaction_groups.date` is not indexed. This forces SQLite to perform a Full Table Scan on `transaction_groups` (and potentially `transactions` via joins) every time the dashboard loads. As the history grows, this will cause significant performance degradation.
- **Suggested Fix:** Add `CREATE INDEX IF NOT EXISTS idx_tg_date ON transaction_groups(date);`.

### [AUDIT-503] - Missing Foreign Key Index on `transactions.group_id`
- **Category:** Performance
- **Section:** 10. Performance
- **Location:** `electron/db/schema.sql`
- **Severity:** Medium
- **Description:** Almost every read query involving transactions joins the `transactions` table with `transaction_groups` using the `group_id` foreign key. While `better-sqlite3` enforces FK constraints, SQLite does not automatically index foreign key columns. Lack of an index here means joins can become inefficient (scanning the child table) as the dataset grows.
- **Suggested Fix:** Add `CREATE INDEX IF NOT EXISTS idx_transactions_group_id ON transactions(group_id);`.


---

# 3. Final Risk Assessment & Remediation Strategy

### 3.1 Overall System Health Score: 5/10 (Critical Logic Gaps)
The application has improved significantly from the initial audit (Score 4/10). Critical accounting logic errors (AUDIT-002, AUDIT-112) and security gaps (AUDIT-330) have been resolved. However, the lack of automated testing (AUDIT-332) and the absence of a Backup strategy (AUDIT-333) mean the system is effectively a "Black Box" that is risky to modify and risky to rely on for long-term business data.

### 3.2 Top 3 Critical Fixes (Post-Audit)

1.  **Implement Backup/Restore (AUDIT-333):** 
    *   *Why:* Without this, a single hardware failure destroys the business's financial history. This is the single highest real-world risk.
    *   *Action:* Create `backupHandler.ts` to copy `database.db` to a user-selected path.

2.  **Fix Test Infrastructure (AUDIT-332):**
    *   *Why:* We cannot safely refactor or "harden" input validation without working tests. The current "Manual QA" approach is not scalable.
    *   *Action:* Debug `vitest` config to ensure it can run `ScenarioLogic.test.ts`.

3.  **Enforce Input Hardening (AUDIT-017 / AUDIT-310):**
    *   *Why:* Preventing bad data (negative numbers, unbalanced transactions) is easier than fixing corrupted ledgers later.
    *   *Action:* Implement the `Zod` validation schemas and DB constraints identified in Phase 2.

### 3.3 Roadmap to Beta
1.  **Week 1:** Fix Backup/Restore & Test Runner.
2.  **Week 2:** Implement Input Hardening & DB Constraints.
3.  **Week 3:** User Acceptance Testing (UAT) focusing on the "Internal Transfer" flow.

