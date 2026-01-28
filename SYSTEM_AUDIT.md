# SYSTEM AUDIT - Phase 1: Backend, Data Layer, and Core Logic

## 1. Executive Summary
This audit focuses on the backend integrity, database reliability, and core business logic of the `kiosk-desktop` application. While basic accounting logic appears to be directionally correct following previous fixes, significant risks remain regarding data precision, database constraints, and timezone handling. The application relies on floating-point arithmetic for financial calculations, which is prone to rounding errors. Additionally, foreign key constraints are not enforced, risking data orphans, and the reconciliation logic contains fragile hardcoded dependencies and potential for historical drift.

---

## 2. Audit Findings

### [AUDIT-101] - Floating Point Precision Errors in Financial Calculations
- **Category:** Data Integrity
- **Section:** 6. Data Integrity & Validation
- **Location:** `src/engines/ScenarioLogic.ts` (Lines 116, 171, 195, 227), `electron/db/schema.sql` (Line 6)
- **Severity:** High
- **Description:** The application uses standard JavaScript `number` (IEEE 754 floating point) and SQLite `REAL` for all monetary values. Financial applications must use integer-based math (storing cents) or decimal data types to avoid precision loss (e.g., `0.1 + 0.2 !== 0.3`).
- **Steps to Reproduce:**
    1. Perform a series of transactions with decimal amounts (e.g., 10.10, 20.20).
    2. Over time, or with complex multiplication/division (if added), accumulated rounding errors may result in balances like `100.000000000001`.
- **Expected vs. Actual:**
    - **Expected:** Exact precision for all financial operations.
    - **Actual:** Potential for minute drift in balances and profit calculations.
- **Impact:** Accounting discrepancies; users seeing confusing balances (e.g., $0.00000001); inability to balance books perfectly.
- **Evidence:**
    ```typescript
    // ScenarioLogic.ts
    const profitOffUs = settledOffUs - cashGivenOffUs; // Floating point subtraction
    ```
    ```sql
    // schema.sql
    current_balance REAL NOT NULL DEFAULT 0.0
    ```
- **Suggested Fix:** Migrate database schema to store amounts as `INTEGER` (cents) and update frontend/backend logic to divide by 100 for display, or use a library like `decimal.js` for calculations.

### [AUDIT-102] - Missing Foreign Key Enforcement
- **Category:** Data Integrity
- **Section:** 6. Data Integrity & Validation
- **Location:** `electron/db/index.ts`
- **Severity:** High
- **Description:** While `schema.sql` defines `REFERENCES` clauses, `better-sqlite3` does not enable Foreign Key constraints by default. The application initialization does not execute `PRAGMA foreign_keys = ON`.
- **Steps to Reproduce:**
    1. Manually insert a transaction with an invalid `account_id` via a script or potential bug in `transactionHandler`.
    2. Delete an account that has transactions.
- **Expected vs. Actual:**
    - **Expected:** Database rejects the insertion or cascades the deletion.
    - **Actual:** Database accepts invalid references; Deleting an account leaves "orphaned" transactions, corrupting the ledger.
- **Impact:** Silent data corruption; Transaction history pointing to non-existent accounts.
- **Evidence:**
    ```typescript
    // electron/db/index.ts
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    // Missing: db.pragma('foreign_keys = ON');
    ```
- **Suggested Fix:** Add `db.pragma('foreign_keys = ON');` immediately after database connection initialization.

### [AUDIT-103] - Hardcoded Account Dependency in Reconciliation
- **Category:** Functional Logic
- **Section:** 3. Functional Logic
- **Location:** `electron/handlers/reconciliationHandler.ts` (Lines 24-27)
- **Severity:** High
- **Description:** The reconciliation handler explicitly queries for an account named `'Cash'`. Although `ScenarioLogic` uses robust slug-based lookup, this specific handler bypasses that safety mechanism. If the user renames the "Cash" account (which is permitted), the reconciliation feature will fail or default to an incorrect account.
- **Steps to Reproduce:**
    1. Rename the "Cash" account to "Main Register" in the Accounts tab.
    2. Attempt to load the Reconciliation page.
- **Expected vs. Actual:**
    - **Expected:** System identifies the cash account via its immutable `slug`.
    - **Actual:** System fails to find 'Cash', falls back to the first account in the list (which might be 'Bank Account'), causing completely wrong reconciliation data.
- **Impact:** Feature failure after valid user customization; Potential for reconciling the wrong account.
- **Evidence:**
    ```typescript
    // reconciliationHandler.ts
    const cashAccount = db.prepare("SELECT id FROM accounts WHERE name = 'Cash'").get();
    ```
- **Suggested Fix:** Update query to use `slug`: `SELECT id FROM accounts WHERE slug = 'cash'`.

### [AUDIT-104] - Timezone-Unaware Date Handling
- **Category:** Functional Logic
- **Section:** 3. Functional Logic
- **Location:** `src/engines/ScenarioLogic.ts` (Line 67), `electron/handlers/dashboardHandler.ts` (Line 9)
- **Severity:** Medium
- **Description:** The application generates dates using `new Date().toISOString().split('T')[0]`. This returns the **UTC** date. For users in timezones ahead of UTC (e.g., India +5:30), transactions made early in the morning (e.g., 04:00 AM) will be recorded as the *previous day*.
- **Steps to Reproduce:**
    1. Set system time to 04:00 AM IST (22:30 UTC previous day).
    2. Create a transaction.
- **Expected vs. Actual:**
    - **Expected:** Transaction recorded with the current local date.
    - **Actual:** Transaction recorded with the previous date.
- **Impact:** Discrepancy between physical reality (Shop open on Tuesday) and digital records (Monday); Confusion in daily reconciliation.
- **Suggested Fix:** Use local date generation: `const date = new Date().toLocaleDateString('en-CA')` (YYYY-MM-DD in local time) or a library like `date-fns`.

### [AUDIT-105] - Stale Reconciliation Snapshots
- **Category:** Data Integrity
- **Section:** 11. State Management
- **Location:** `electron/handlers/reconciliationHandler.ts`
- **Severity:** Medium
- **Description:** The `daily_records` table stores a snapshot of `cash_closing_calculated`. If a user edits or deletes a transaction from a past date, the `accounts` balance updates (via triggers), but the `daily_records` snapshot for that day remains unchanged and incorrect.
- **Steps to Reproduce:**
    1. Complete reconciliation for Day X.
    2. Edit a transaction from Day X that changes the cash balance.
- **Expected vs. Actual:**
    - **Expected:** Reconciliation record flags itself as "Out of Sync" or updates.
    - **Actual:** Reconciliation record shows the old calculated balance, which now disagrees with the sum of transactions.
- **Impact:** Historical reports may contradict the live ledger; False sense of security in closed records.
- **Suggested Fix:** Either prevent editing transactions for "Closed" days, or implement a hook to invalidate/flag `daily_records` when historical transactions are modified.

### [AUDIT-106] - Zero-Trust Input Validation Failure
- **Category:** Data Integrity
- **Section:** 6. Data Integrity & Validation
- **Location:** `electron/handlers/transactionHandler.ts`
- **Severity:** Medium
- **Description:** The API endpoint `db:add-transaction-group` trusts the frontend payload implicitly. It does not validate that `amount` is positive, that `date` is valid/reasonable, or that the referenced accounts actually exist (relying on DB constraints which are currently disabled, see AUDIT-102).
- **Steps to Reproduce:**
    1. Send an IPC message to `db:add-transaction-group` with `amount: -500`.
- **Expected vs. Actual:**
    - **Expected:** Backend rejects the negative amount.
    - **Actual:** Backend records the transaction, potentially reversing the accounting logic (Debit -500 becomes a Credit effectively).
- **Impact:** Malicious or buggy frontend code can corrupt the ledger; unintentional reversals.
- **Suggested Fix:** Implement a schema validation library (like `zod`) in the IPC handler to enforce positive amounts, valid dates, and required fields before touching the database.

### [AUDIT-107] - Reconciliation Read Isolation Failure (Race Condition)
- **Category:** State Management
- **Section:** 11. State Management
- **Location:** `electron/handlers/reconciliationHandler.ts` (Lines 46-92)
- **Severity:** Medium
- **Description:** The reconciliation logic performs a "Read-Compute" sequence that is not atomic. It reads the `current_balance` (Step 1) and then queries `transactions` (Step 2) to back-calculate the opening balance. If a new transaction is inserted between Step 1 and Step 2, the `transactions` query will include it, but the `current_balance` snapshot will not.
- **Steps to Reproduce:**
    1. High-frequency environment (or unlucky timing).
    2. Request Reconciliation data.
    3. Simultaneously insert a transaction.
- **Expected vs. Actual:**
    - **Expected:** Consistent snapshot of data.
    - **Actual:** Calculated Opening Balance is incorrect (shifted by the amount of the intervening transaction).
- **Impact:** Reconciliation numbers that don't add up; Phantom discrepancies.
- **Suggested Fix:** Wrap the entire read operation in a `db.transaction(() => { ... })` block (even for reads) to ensure SQLite provides a SERIALIZABLE isolation snapshot.

### [AUDIT-108] - Ambiguous Profit Logic for Off-Us Withdrawals
- **Category:** Functional Logic
- **Section:** 3. Functional Logic
- **Location:** `src/engines/ScenarioLogic.ts` (Lines 150-158) vs `core_logic_live.md` (Section 3)
- **Severity:** Low (Ambiguity)
- **Description:** `ScenarioLogic.ts` calculates profit for Kiosk Withdrawals as `Settled (OD) - Cash Given`. If positive, it credits Revenue. However, `core_logic_live.md` Section 3 states "when transaction is done through kiyosk then difference amount will be credited to cash account". The code leaves the profit asset in the OD account (as part of the settlement), whereas the requirement suggests the user expects the profit to be associated with Cash (possibly implying fees are collected in cash separately?).
- **Impact:** Potential mismatch between physical cash handling (User expectations) and system accounting.
- **Suggested Fix:** Clarify with the user: Does "credited to cash account" mean they physically collect the fee in cash? If so, the logic needs to adjust `cashGiven` vs `amount` inputs. If not, the documentation terminology is likely imprecise.

### [AUDIT-109] - Dashboard Logic Fragility (Hardcoded Account Name)
- **Category:** Functional Logic
- **Section:** 3. Functional Logic
- **Location:** `electron/handlers/dashboardHandler.ts` (Lines 28-38)
- **Severity:** Medium
- **Description:** The Dashboard attempts to fetch the "Current Cash Position" by looking for an account named `'Cash'`. If this account is renamed (e.g., to "Shop Safe"), the query fails and falls back to summing *all* Asset accounts (including Bank and OD).
- **Steps to Reproduce:**
    1. Rename "Cash" account.
    2. View Dashboard.
- **Expected vs. Actual:**
    - **Expected:** Dashboard shows the balance of the physical cash account.
    - **Actual:** Dashboard shows the total value of the business (Cash + Bank + OD), which is a completely different metric, without any indication that the context has changed.
- **Impact:** Misleading financial snapshot.
- **Suggested Fix:** Use `slug = 'cash'` for the lookup.

### [AUDIT-110] - Data Loss in On-Us Withdrawals
- **Category:** Functional Logic
- **Section:** 3. Functional Logic
- **Location:** `src/engines/ScenarioLogic.ts` (Lines 92-102)
- **Severity:** High
- **Description:** In `KIOSK_WITHDRAWAL_ON_US`, the logic completely ignores the `total_settled` input parameter when creating ledger entries. It uses `amount` (Cash Given) for both the Cash credit and the OD debit. If there is a difference (e.g., a fee charged to the OD account, or a data entry discrepancy), that difference is silently discarded, leading to an incorrect OD balance.
- **Steps to Reproduce:**
    1. Submit an On-Us Withdrawal: Amount = 100, Total Settled = 105.
- **Expected vs. Actual:**
    - **Expected:** OD Debit = 105, Cash Credit = 100, Difference (5) = Expense/Loss.
    - **Actual:** OD Debit = 100, Cash Credit = 100. The 5 unit difference is lost from the records.
- **Impact:** Bank reconciliation will fail; OD balance will be understated.
- **Suggested Fix:** Use `total_settled` for the OD entry and calculate the difference as profit/loss, similar to the Off-Us logic.

---

# SYSTEM AUDIT - Phase 2: Frontend, User Interface, and User Experience

## 1. Executive Summary
Phase 2 of the audit focuses on the React-based frontend. While the UI is visually modern (utilizing Tailwind CSS and glassmorphism), significant performance bottlenecks were identified in the animation logic. Furthermore, the UX is hampered by synchronous UI-blocking alerts, and the application fails several critical WCAG accessibility standards regarding form control labeling.

---

## 2. Audit Findings (Frontend/UX)

### [AUDIT-006] - Visual Instability & Performance Degradation (Math.random in Render) [RESOLVED]
*   **Category:** Performance / UI Reliability
*   **Section:** 4. Performance & Optimization (Frontend) / 8. Performance & Load Behavior
*   **Location:** `src/components/Starfield.tsx` (Lines 33-34)
*   **Severity:** HIGH
*   **Description:** The component uses `Math.random()` directly within the render loop to determine the `top` and `left` positions of comet elements. In React, any state update (including the periodic addition of new comets) triggers a re-render, causing all existing comets to "teleport" to new random coordinates every few seconds.
*   **Steps to Reproduce:**
    1. Open the application.
    2. Observe the background "comets".
    3. Notice existing comets jump to new positions when a new comet appears.
*   **Expected vs. Actual:**
    *   **Expected:** Comets should maintain their trajectory/origin once spawned.
    *   **Actual:** Comets jitter and relocate on every component update.
*   **Impact:** Poor visual quality; unnecessary style recalculations and layout thrashing.
*   **Evidence:**
    ```typescript
    // Starfield.tsx (Line 33)
    style={{
        top: `${Math.random() * 40}%`,
        left: `${Math.random() * 60 + 40}%`,
    }}
    ```
*   **Suggested Fix:** Move random coordinate generation to the `useEffect` block where comets are created, and store the coordinates alongside the `id` in the state array.

---

### [AUDIT-007] - Main-Thread Blocking Feedback (Synchronous Alerts) [RESOLVED]
*   **Category:** User Experience (UX)
*   **Section:** 2. User Experience (UX) / 17. User Journey
*   **Location:** `src/components/Sidebar.tsx` (Lines 65, 69), `src/pages/Transactions.tsx` (Lines 49, 53)
*   **Severity:** MEDIUM
*   **Description:** The application uses `window.alert()` for critical user feedback (e.g., "Reconciliation saved!", "Failed to save transaction").
*   **Impact:** Freezes the entire browser UI until the user interacts; breaks the immersion of a desktop-like experience; perceived as "primitive" design.
*   **Evidence:**
    ```typescript
    // Sidebar.tsx (Line 65)
    alert('Reconciliation saved!');
    ```
*   **Suggested Fix:** Implement a non-blocking "Toast" notification system or an inline status message.

---

### [AUDIT-008] - Accessibility Non-Compliance (Missing Form Labels) [RESOLVED]
*   **Category:** Accessibility / Compliance
*   **Section:** 14. Compliance & Standards (WCAG)
*   **Location:** `src/components/ScenarioForms.tsx` (Line 25), `src/components/Sidebar.tsx` (Line 117, 137)
*   **Severity:** HIGH
*   **Description:** Several input elements (date pickers, number inputs) lack associated `<label>` elements or `aria-label` attributes.
*   **Impact:** Screen reader users cannot identify the purpose of form fields, making the application unusable for visually impaired users.
*   **Evidence:**
    ```tsx
    // Sidebar.tsx (Line 117) - Missing label association
    <input type="date" value={recDate} ... />
    ```
*   **Suggested Fix:** Use proper `htmlFor` associations on labels and ensure every interactive element has an accessible name.

---

### [AUDIT-009] - Visual Inconsistency (Theme Variable Bypass) [RESOLVED]
*   **Category:** User Interface (UI)
*   **Section:** 1. User Interface (UI)
*   **Location:** `src/pages/Dashboard.tsx` (Line 70)
*   **Severity:** LOW
*   **Description:** Chart bars in the Dashboard use hardcoded Tailwind classes (`bg-blue-100`, `hover:bg-blue-200`) instead of the semantic theme colors defined in `tailwind.config.js` (e.g., `accent` or `comet`).
*   **Impact:** If the user switches to a theme with a different primary color (e.g., "Obsidian" which uses Violet), the chart remains blue, creating a disjointed UI.
*   **Evidence:**
    ```tsx
    // Dashboard.tsx (Line 70)
    <div className="w-full bg-blue-100 rounded-t hover:bg-blue-200 ..." ... />
    ```
*   **Suggested Fix:** Replace hardcoded colors with `bg-accent/20` and `hover:bg-accent/40` or similar semantic variables.

---

### [AUDIT-010] - UX Friction: Global Loading State Flickering [RESOLVED]
*   **Category:** Performance / UX
*   **Section:** 4. Performance & Optimization (Frontend)
*   **Location:** `src/contexts/DataContext.tsx` (Line 27, 43)
*   **Severity:** MEDIUM
*   **Description:** The `refreshData` function sets `isLoading` to `true` globally every time it is called. Since this is triggered after every transaction (Lines 46-47 of `Transactions.tsx`), it causes a full-page loading state even when data is already present.
*   **Impact:** Causes visual "flashing" of the dashboard; disrupts user focus; makes the app feel slower than it is.
*   **Suggested Fix:** Implement "Background Refresh" logic where `isLoading` is only set to true if no data currently exists in the state.

---

# SYSTEM AUDIT - Phase 3: Deep Dive UI/UX & User Journey

## 1. Executive Summary
Phase 3 expands the audit to cover the comprehensive User Journey, focusing on the resilience of the interface and the continuity of user tasks. The most critical finding is a logic fragility where renaming a default account destroys the entire transaction engine. Additionally, the application suffers from destructive state loss when switching tabs, forcing users to restart tasks if they navigate away.

## 2. Audit Findings (UI/UX Deep Dive)

### [AUDIT-011] - Critical Logic Fragility (Account Renaming) [RESOLVED]
*   **Category:** User Journey / User Error Protection
*   **Section:** 3. Functional Logic
*   **Location:** `src/engines/ScenarioLogic.ts` (Lines 25-39), `src/pages/Accounts.tsx`
*   **Severity:** CRITICAL
*   **Description:** The application's core logic (`ScenarioLogic.ts`) relies on hardcoded strings (`"Cash"`, `"OD Account"`) to identify accounts for ledger entries. However, the `Accounts` page allows users to rename any account. If a user renames "Cash" to "Register 1", `findAccount` will fail, throwing an error and making it impossible to record ANY transactions.
*   **Steps to Reproduce:**
    1. Go to "Accounts" tab.
    2. Click Edit on the "Cash" account.
    3. Rename it to "My Cash".
    4. Go to "Transactions" tab and try to submit a "Kiosk Deposit".
*   **Expected vs. Actual:**
    *   **Expected:** The system tracks the cash movement for the renamed account OR prevents renaming of system-critical accounts.
    *   **Actual:** Transaction fails with `Error: Account Cash not found`.
*   **Impact:** Complete system paralysis triggered by a standard user action.
*   **Evidence:**
    ```typescript
    // ScenarioLogic.ts
    const ACC = { CASH: 'Cash', ... };
    const findAccount = ... accounts.find(a => a.name === type)
    ```
*   **Suggested Fix:** Add a `is_system` or `slug` flag to the `accounts` table. Look up accounts by this immutable flag/slug instead of the mutable `name`. Prevent users from deleting/renaming system accounts in the UI.

---

### [AUDIT-012] - Destructive State Loss on Tab Switch [RESOLVED]
*   **Category:** User Experience (UX)
*   **Section:** 17. User Journey
*   **Location:** `src/App.tsx` (Lines 27-30)
*   **Severity:** HIGH
*   **Description:** The application uses conditional rendering (`{activeTab === 'transactions' && ...}`) to display pages. This unmounts the component completely when switching tabs. If a user is half-way through filling out a form in "Transactions" and checks "Accounts" to verify a balance, their entire form state is destroyed.
*   **Impact:** High friction for power users; loss of data; frustration.
*   **Evidence:**
    ```tsx
    // App.tsx
    {activeTab === 'transactions' && <Transactions />}
    ```
*   **Suggested Fix:** Use a routing library (React Router) with layout persistence, or simple CSS hiding (`style={{ display: activeTab === '...' ? 'block' : 'none' }}`) to keep components mounted (though less performant), or ideally move form state to a global context/store if persistence is needed.

---

### [AUDIT-013] - Extensive Theming Violations (Hardcoded Colors) [RESOLVED]
*   **Category:** User Interface (UI)
*   **Section:** 1. User Interface (UI)
*   **Location:** `src/pages/Settings.tsx` (Line 99), `src/pages/Accounts.tsx` (Line 93)
*   **Severity:** LOW
*   **Description:** Despite having a robust theming engine (`ThemeContext` + Tailwind variables), several pages use hardcoded color classes (e.g., `bg-blue-600`, `text-red-500`). This breaks the visual immersion when using non-blue themes like "Obsidian" (Violet) or "Celestial" (Sky).
*   **Impact:** Inconsistent visual identity; "broken" feel when changing themes.
*   **Evidence:**
    ```tsx
    // Accounts.tsx
    className="... bg-blue-600 text-white ..."
    ```
*   **Suggested Fix:** strict usage of `bg-accent`, `text-destructive`, `bg-primary`, etc. Scan codebase for standard color names (`blue-`, `red-`, `green-`) and replace with semantic tokens.

---

### [AUDIT-014] - Non-Responsive Layout (Fixed Sidebar) [RESOLVED]
*   **Category:** User Interface (UI)
*   **Section:** 1. User Interface (UI)
*   **Location:** `src/components/Sidebar.tsx` (Line 85)
*   **Severity:** MEDIUM
*   **Description:** The sidebar has a fixed width of `w-80` (320px). On smaller screens (tablets or resized windows), this consumes a significant portion of the viewport, squeezing the main content.
*   **Impact:** Poor usability on non-fullscreen desktop windows.
*   **Suggested Fix:** Make the sidebar collapsible (icon-only mode) or use a responsive width (`w-64` on md, `w-20` on sm).

---

### [AUDIT-015] - Accessibility Gaps (Icon-Only Buttons) [RESOLVED]
*   **Category:** Accessibility
*   **Section:** 14. Compliance & Standards (WCAG)
*   **Location:** `src/pages/Accounts.tsx` (Line 191), `src/pages/Settings.tsx` (Line 141)
*   **Severity:** MEDIUM
*   **Description:** Action buttons (Edit, Delete/Trash, Save) rely solely on Lucide icons without `aria-label` text. Screen readers will likely announce them as "button" or ignore them.
*   **Impact:** Unnavigable for visually impaired users.
*   **Evidence:**
    ```tsx
    <button onClick={...}><Trash2 size={18} /></button>
    ```
*   **Suggested Fix:** Add `aria-label="Delete Transaction Type"` to these buttons.

---

# 3. Risk Assessment & Remediation Strategy

### 3.1 Executive Summary
*   **Overall System Health Score:** 2/10 (Critical / Unstable)
*   **Updated Assessment:** The discovery of [AUDIT-011] (Account Renaming fragility) significantly lowers the system's reliability score. The application allows users to unknowingly destroy the entire transaction processing engine through a standard UI action. Combined with the previously identified data integrity issues, the system is **not production ready**.

### 3.2 Prioritization Matrix

| Priority | Category | Finding ID(s) | Impact / Rationale |
| :--- | :--- | :--- | :--- |
| **P0: Critical** | **System Stability** | AUDIT-001, AUDIT-011 | Fixes crashes and prevents users from breaking the app logic via simple edits. |
| **P1: Urgent** | **Financial Integrity** | AUDIT-002, AUDIT-003 | Ensures money is counted correctly and data persists safely. |
| **P2: High** | **User Journey** | AUDIT-012, AUDIT-006 | Prevents data loss during navigation and fixes jarring visual bugs. |
| **P3: Medium** | **Compliance & Standards** | AUDIT-008, AUDIT-015 | WCAG compliance is legally required in many jurisdictions. |
| **P4: Low** | **Polish** | AUDIT-009, AUDIT-013, AUDIT-014 | Visual consistency and layout improvements. |
