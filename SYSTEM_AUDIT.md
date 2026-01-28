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

### [AUDIT-113] - PhonePe Withdrawal Profit Allocation Mismatch [OPEN]
- **Category:** Business Logic
- **Section:** 3. Functional Logic
- **Location:** `src/engines/ScenarioLogic.ts`
- **Severity:** High
- **Description:** The `PHONEPAY_WITHDRAWAL` logic currently credits profit to the **Cash Account** (attempting to mimic Kiosk logic), but `core_logic_live.md` (Sec 3) explicitly states that for PhonePe transactions, the difference (profit) should be credited to the **Bank Account**.
- **Impact:** Incorrect profit tracking; Profit ends up in Cash (physically impossible as funds are in Bank) requiring manual transfers.

### [AUDIT-114] - Unbalanced Ledger Entries in Withdrawals [OPEN]
- **Category:** Data Integrity
- **Section:** 6. Data Integrity & Validation
- **Location:** `src/engines/ScenarioLogic.ts`
- **Severity:** Critical
- **Description:** The logic for `KIOSK_WITHDRAWAL_ON_US`, `KIOSK_WITHDRAWAL_OFF_US`, and `PHONEPAY_WITHDRAWAL` generates unbalanced ledger entries. The code appends a profit entry (`Debit Cash`, `Credit Revenue`) without adjusting the main settlement entry or ensuring the total debits equal total credits. This results in `Total Debits = Settlement + Profit` vs `Total Credits = Settlement` (specifically for cases where profit is added on top of full settlement).
- **Impact:** Fundamental accounting failure; Trial Balance will not zero.

### [AUDIT-115] - Internal Transfer Logic/Expectation Mismatch (OD Liability)
- **Category:** Business Logic / UX
- **Section:** 3. Functional Logic
- **Location:** `src/engines/ScenarioLogic.ts`
- **Severity:** High (User Confusion)
- **Description:** The user expects withdrawing from an OD (Liability) account to *decrease* the balance. However, mathematically, withdrawing from a Liability *increases* the debt balance. The system currently correctly implements the accounting logic (Credit Liability = Increase), but this conflicts with the user's mental model.
- **Steps to Reproduce:**
    1. Select "Internal Transfer".
    2. Source: OD Account (Liability).
    3. Destination: Cash (Asset).
    4. Amount: 1000.
    5. Result: OD Balance increases by 1000.
- **Expected vs. Actual:** User expected OD to decrease. Actual: OD increased.
- **Impact:** User believes the system is miscalculating, leading to distrust.
- **Suggested Fix:**
    1. Clarify OD Account type (Asset vs Liability). If user views OD as "Bank Balance" (Asset) that can go negative, change type to ASSET.
    2. Or, add UI hints explaining that for Liabilities, "Increase" means "More Debt".


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
