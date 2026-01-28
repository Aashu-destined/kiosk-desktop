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

---

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
