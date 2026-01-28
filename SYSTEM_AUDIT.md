# SYSTEM AUDIT - Phase 1: Backend, Data Layer, and Core Logic

## 1. Executive Summary
This audit focuses on the backend integrity, database reliability, and core business logic of the `kiosk-desktop` application. While basic accounting logic appears to be directionally correct following previous fixes, significant risks remain regarding data precision, database constraints, and timezone handling. The application relies on floating-point arithmetic for financial calculations, which is prone to rounding errors. Additionally, foreign key constraints are not enforced, risking data orphans, and the reconciliation logic contains fragile hardcoded dependencies. Recent comparisons with `core_logic_live.md` have confirmed discrepancies in profit allocation logic and missing features for internal transfers.

---

## 2. Audit Findings (Backend & Logic)

### [AUDIT-001] - Reconciliation Schema Mismatch
- **Category:** Data Integrity
- **Section:** 3. Functional Logic
- **Location:** `electron/handlers/reconciliationHandler.ts` / `electron/db/schema.sql`
- **Severity:** Critical
- **Description:** Previous reports indicate a crash where `reconciliationHandler.ts` attempts to query a `source_account_id` column which does not exist in the `transactions` schema. While recent code analysis shows `account_id` being used, this critical path must be verified against the live database structure to prevent runtime failures.
- **Impact:** Complete failure of the Reconciliation workflow; application crash.
- **Suggested Fix:** Verify `reconciliationHandler.ts` strictly uses `account_id` and ensure database migrations have run correctly.

### [AUDIT-002] - Accounting Logic Inversion (Liability Accounts)
- **Category:** Business Logic
- **Section:** 3. Functional Logic
- **Location:** `src/engines/ScenarioLogic.ts`
- **Severity:** Critical
- **Description:** The user's mental model for Liability accounts (OD) follows an inverted structure where "Credit" (Money In) is perceived as an increase in available funds (or "Good"), whereas standard accounting treats Credit on Liability as an increase in Debt. The current implementation uses standard accounting (Debit to decrease Liability/Debt), which mathematically works but conflicts with the user's terminology "OD account will be credited".
- **Impact:** Confusion in reporting; Potential for users to misinterpret "Debits" as "Losses" when they are actually Repayments/Settlements.
- **Suggested Fix:** Add a presentation layer translation or strictly adhere to the user's "Inverted" model if they demand "Credit" to mean "Increase OD Balance".

### [AUDIT-101] - Floating Point Precision Errors in Financial Calculations
- **Category:** Data Integrity
- **Section:** 6. Data Integrity & Validation
- **Location:** `src/engines/ScenarioLogic.ts` (Lines 116, 171, 195, 227), `electron/db/schema.sql` (Line 6)
- **Severity:** High
- **Description:** The application uses standard JavaScript `number` (IEEE 754 floating point) and SQLite `REAL` for all monetary values. Financial applications must use integer-based math (storing cents) or decimal data types to avoid precision loss.
- **Steps to Reproduce:**
    1. Perform a series of transactions with decimal amounts.
    2. Accumulated rounding errors may result in balances like `100.000000000001`.
- **Impact:** Accounting discrepancies; users seeing confusing balances; inability to balance books perfectly.
- **Suggested Fix:** Migrate database schema to store amounts as `INTEGER` (cents) or use a library like `decimal.js`.

### [AUDIT-102] - Missing Foreign Key Enforcement
- **Category:** Data Integrity
- **Section:** 6. Data Integrity & Validation
- **Location:** `electron/db/index.ts`
- **Severity:** High
- **Description:** `better-sqlite3` does not enable Foreign Key constraints by default. The application initialization does not execute `PRAGMA foreign_keys = ON`.
- **Impact:** Silent data corruption; Transaction history pointing to non-existent accounts.
- **Suggested Fix:** Add `db.pragma('foreign_keys = ON');` immediately after database connection initialization.

### [AUDIT-103] - Hardcoded Account Dependency in Reconciliation
- **Category:** Functional Logic
- **Section:** 3. Functional Logic
- **Location:** `electron/handlers/reconciliationHandler.ts`
- **Severity:** High
- **Description:** The reconciliation handler explicitly queries for an account named `'Cash'`. If the user renames the "Cash" account, the reconciliation feature will fail or default to an incorrect account.
- **Suggested Fix:** Update query to use `slug`: `SELECT id FROM accounts WHERE slug = 'cash'`.

### [AUDIT-104] - Timezone-Unaware Date Handling
- **Category:** Functional Logic
- **Section:** 3. Functional Logic
- **Location:** `src/engines/ScenarioLogic.ts`
- **Severity:** Medium
- **Description:** The application generates dates using `new Date().toISOString().split('T')[0]` (UTC). For users in timezones ahead of UTC (e.g., India +5:30), late-night transactions may be recorded on the previous day.
- **Suggested Fix:** Use local date generation.

### [AUDIT-105] - Stale Reconciliation Snapshots
- **Category:** Data Integrity
- **Section:** 11. State Management
- **Location:** `electron/handlers/reconciliationHandler.ts`
- **Severity:** Medium
- **Description:** `daily_records` stores a snapshot of `cash_closing_calculated`. If past transactions are edited, this snapshot becomes stale.
- **Suggested Fix:** Invalidate/flag `daily_records` when historical transactions are modified.

### [AUDIT-106] - Zero-Trust Input Validation Failure
- **Category:** Data Integrity
- **Section:** 6. Data Integrity & Validation
- **Location:** `electron/handlers/transactionHandler.ts`
- **Severity:** Medium
- **Description:** API endpoints trust frontend payloads implicitly (e.g., negative amounts).
- **Suggested Fix:** Implement schema validation (e.g., `zod`) in IPC handlers.

### [AUDIT-107] - Reconciliation Read Isolation Failure (Race Condition)
- **Category:** State Management
- **Section:** 11. State Management
- **Location:** `electron/handlers/reconciliationHandler.ts`
- **Severity:** Medium
- **Description:** Read-Compute sequence is not atomic. New transactions during computation can skew the Opening Balance calculation.
- **Suggested Fix:** Wrap read operations in a `db.transaction`.

### [AUDIT-108] - Ambiguous Profit Logic for Off-Us Withdrawals
- **Category:** Functional Logic
- **Section:** 3. Functional Logic
- **Location:** `src/engines/ScenarioLogic.ts`
- **Severity:** Low (Ambiguity)
- **Description:** `ScenarioLogic` leaves profit in OD (Settlement - Cash Given). `core_logic_live.md` suggests profit should be credited to Cash.
- **Impact:** Potential mismatch between physical cash handling and system accounting.
- **Suggested Fix:** Clarify if user physically withdraws profit in cash.

### [AUDIT-109] - Dashboard Logic Fragility (Hardcoded Account Name)
- **Category:** Functional Logic
- **Section:** 3. Functional Logic
- **Location:** `electron/handlers/dashboardHandler.ts`
- **Severity:** Medium
- **Description:** Dashboard looks for account named `'Cash'`. Renaming fails the query.
- **Suggested Fix:** Use `slug = 'cash'`.

### [AUDIT-110] - Data Loss in On-Us Withdrawals
- **Category:** Functional Logic
- **Section:** 3. Functional Logic
- **Location:** `src/engines/ScenarioLogic.ts`
- **Severity:** High
- **Description:** `KIOSK_WITHDRAWAL_ON_US` ignores `total_settled` input, assuming it equals `amount`. Any difference (fee/loss) is silently discarded.
- **Suggested Fix:** Use `total_settled` to calculate profit/loss.

### [AUDIT-111] - Missing Business Logic: Internal Transfers
- **Category:** Functional Logic
- **Section:** 3. Functional Logic
- **Location:** `src/engines/ScenarioLogic.ts`
- **Severity:** High
- **Description:** No scenario exists for "Internal Transfer" (rebalancing Cash/Bank/OD) as required by `core_logic_live.md`.
- **Suggested Fix:** Implement `INTERNAL_TRANSFER` scenario.

### [AUDIT-112] - Profit Allocation Logic Mismatch (Cash vs OD)
- **Category:** Business Logic
- **Section:** 3. Functional Logic
- **Location:** `src/engines/ScenarioLogic.ts`
- **Severity:** Medium
- **Description:** Requirement: "difference amount will be credited to cash account". Implementation: Profit remains in OD.
- **Suggested Fix:** Confirm user intent; potentially add auto-transfer.

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

---

# 3. Risk Assessment & Remediation Strategy

### 3.1 Executive Summary
*   **Overall System Health Score:** 2/10 (Critical / Unstable)
*   **Assessment:** The application allows users to unknowingly destroy the transaction engine (AUDIT-011) and lacks basic liquidity management (AUDIT-111). Accounting logic inversions (AUDIT-002) pose a risk of financial misreporting.

### 3.2 Prioritization Matrix

| Priority | Finding ID(s) | Impact |
| :--- | :--- | :--- |
| **P0: Critical** | AUDIT-001, AUDIT-002, AUDIT-011, AUDIT-111 | Crashes, Data Corruption, Logic Failures. |
| **P1: Urgent** | AUDIT-101, AUDIT-102, AUDIT-110, AUDIT-112 | Financial Inaccuracy, Data Integrity. |
| **P2: High** | AUDIT-006, AUDIT-012, AUDIT-103, AUDIT-109 | UX Friction, Logic Fragility. |
| **P3: Medium** | AUDIT-007, AUDIT-008, AUDIT-015 | Compliance, Usability. |
