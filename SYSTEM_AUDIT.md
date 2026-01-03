# SYSTEM AUDIT - Phase 1: Backend, Data Layer, and Core Logic

## 1. Executive Summary
This audit identifies several critical and high-severity issues in the `kiosk-desktop` backend and core logic. The most significant finding is a complete functional failure in the reconciliation logic due to schema mismatches, followed by reversed accounting entries for Liability accounts (OD) which will result in incorrect financial reporting.

---

## 2. Audit Findings

### [AUDIT-001] - Reconciliation Handler Critical Failure (Schema Mismatch)
*   **Category:** Functional Logic / Data Integrity
*   **Section:** 6. Data Integrity & Validation / 10. API & Integration Reliability
*   **Location:** `electron/handlers/reconciliationHandler.ts` (Lines 71-72, 88-90)
*   **Severity:** CRITICAL
*   **Description:** The reconciliation handler attempts to query the `transactions` table using columns `source_account_id` and `destination_account_id`. However, the schema defined in `electron/db/schema.sql` only contains `account_id`. This will cause the reconciliation feature to crash 100% of the time.
*   **Steps to Reproduce:**
    1. Open the Reconciliation page.
    2. Attempt to fetch or save a daily record.
*   **Expected vs. Actual:**
    *   **Expected:** Successful retrieval of transactions for the specified account.
    *   **Actual:** SQLite error: "no such column: source_account_id".
*   **Impact:** Complete loss of reconciliation functionality.
*   **Evidence:**
    ```sql
    -- schema.sql (Line 17)
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL REFERENCES transaction_groups(id) ON DELETE CASCADE,
        account_id INTEGER NOT NULL REFERENCES accounts(id),
        ...
    );
    ```
    ```typescript
    // reconciliationHandler.ts (Line 71)
    AND (source_account_id = ? OR destination_account_id = ?)
    ```
*   **Suggested Fix:** Update the query in `reconciliationHandler.ts` to use `account_id` and interpret the impact based on the `type` column (DEBIT/CREDIT).

---

### [AUDIT-002] - Reversed Accounting Logic for Liability Accounts
*   **Category:** Core Logic
*   **Section:** 3. Functional Logic / 11. State Management
*   **Location:** `src/engines/ScenarioLogic.ts` (Lines 89, 126, 164)
*   **Severity:** HIGH
*   **Description:** The application seeds the "OD Account" as a `LIABILITY`. In standard accounting, a Credit increases a Liability (increases debt). However, `ScenarioLogic.ts` uses `DEBIT` when money is "settled" into the OD account (increasing debt), which the schema trigger actually interprets as *decreasing* the balance (Line 52 of `schema.sql`).
*   **Steps to Reproduce:** Perform a Kiosk Withdrawal.
*   **Expected vs. Actual:**
    *   **Expected:** OD balance increases (Credit to Liability).
    *   **Actual:** OD balance decreases (Debit to Liability).
*   **Impact:** Financial statements and account balances will be mathematically inverted for the OD account.
*   **Evidence:**
    ```typescript
    // ScenarioLogic.ts (Line 89)
    entries = [
        { account_id: odId, type: 'DEBIT', amount: amountOnUs, ... },
    ];
    ```
    ```sql
    -- schema.sql (Line 52)
    WHEN NEW.type = 'DEBIT' AND type IN ('LIABILITY'...) THEN current_balance - NEW.amount
    ```
*   **Suggested Fix:** Align `ScenarioLogic.ts` with standard double-entry rules: use CREDIT to increase Liability/Revenue and DEBIT to increase Asset/Expense.

---

### [AUDIT-003] - Data Persistence Gaps (Missing Triggers)
*   **Category:** Data Integrity
*   **Section:** 6. Data Integrity & Validation
*   **Location:** `electron/db/schema.sql`
*   **Severity:** MEDIUM
*   **Description:** The database only has an `AFTER INSERT` trigger for balance updates. If a transaction is ever manually updated or deleted via the DB or future features, the `accounts` table balance will become permanently desynchronized.
*   **Impact:** Risk of silent data corruption and incorrect balances over time.
*   **Evidence:** Only `update_balance_after_insert` exists (Line 44).
*   **Suggested Fix:** Implement `AFTER UPDATE` and `AFTER DELETE` triggers on the `transactions` table to maintain balance integrity.

---

### [AUDIT-004] - IPC Error Handling Weakness
*   **Category:** Error Handling
*   **Section:** 7. Error Handling & Observability / 10. API Reliability
*   **Location:** `electron/handlers/*.ts`
*   **Severity:** LOW
*   **Description:** Handlers use generic `try-catch` blocks that log to the terminal but throw the raw error to the renderer. This lacks structured error codes or user-friendly messaging, making it difficult for the UI to handle specific failure modes (e.g., database lock, constraint violation).
*   **Impact:** Poor user experience during failures; difficult debugging for production issues.
*   **Suggested Fix:** Implement a standardized IPC response wrapper `{ success: boolean, data?: any, error?: { code: string, message: string } }`.

---

### [AUDIT-005] - N+1 Query in Transaction History
*   **Category:** Maintainability & Technical Debt
*   **Section:** 16. Maintainability
*   **Location:** `electron/handlers/transactionHandler.ts` (Lines 85-88)
*   **Severity:** LOW
*   **Description:** Fetching transaction groups iterates through each group and performs a separate query to fetch its entries. While acceptable for small datasets, this is inefficient.
*   **Impact:** Performance degradation as the transaction history grows.
*   **Evidence:**
    ```typescript
    const groupsWithEntries = groups.map((group: any) => ({
        ...group,
        entries: getEntries.all(group.id)
    }));
    ```
*   **Suggested Fix:** Use a single SQL `JOIN` or `IN` clause to fetch all entries for the retrieved groups in one go.

---

# SYSTEM AUDIT - Phase 2: Frontend, User Interface, and User Experience

## 1. Executive Summary
Phase 2 of the audit focuses on the React-based frontend. While the UI is visually modern (utilizing Tailwind CSS and glassmorphism), significant performance bottlenecks were identified in the animation logic. Furthermore, the UX is hampered by synchronous UI-blocking alerts, and the application fails several critical WCAG accessibility standards regarding form control labeling.

---

## 2. Audit Findings (Frontend/UX)

### [AUDIT-006] - Visual Instability & Performance Degradation (Math.random in Render)
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

### [AUDIT-007] - Main-Thread Blocking Feedback (Synchronous Alerts)
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

### [AUDIT-008] - Accessibility Non-Compliance (Missing Form Labels)
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

### [AUDIT-009] - Visual Inconsistency (Theme Variable Bypass)
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

### [AUDIT-010] - UX Friction: Global Loading State Flickering
*   **Category:** Performance / UX
*   **Section:** 4. Performance & Optimization (Frontend)
*   **Location:** `src/contexts/DataContext.tsx` (Line 27, 43)
*   **Severity:** MEDIUM
*   **Description:** The `refreshData` function sets `isLoading` to `true` globally every time it is called. Since this is triggered after every transaction (Lines 46-47 of `Transactions.tsx`), it causes a full-page loading state even when data is already present.
*   **Impact:** Causes visual "flashing" of the dashboard; disrupts user focus; makes the app feel slower than it is.
*   **Suggested Fix:** Implement "Background Refresh" logic where `isLoading` is only set to true if no data currently exists in the state.

---

## 2.3 Findings Summary

### Phase 1 (Critical Backend/Logic)
*   **Reconciliation:** Broken due to column name mismatch.
*   **Accounting:** OD Account (Liability) logic is inverted.
*   **Persistence:** Balance integrity is not guaranteed for non-insert operations.

### Phase 2 (Frontend/UX)
*   **Performance:** Background animations cause layout thrashing (Math.random).
*   **UX:** Blocking alerts disrupt user flow.
*   **Accessibility:** Critical WCAG gaps in form controls.
*   **Theme:** Dashboard chart ignores active theme variables.

---

# 3. Risk Assessment & Remediation Strategy

### 3.1 Executive Summary
*   **Overall System Health Score:** 3/10 (Critical)
*   **Concise Summary:** The `kiosk-desktop` application is currently in a high-risk state. While the visual layer provides a modern appearance, the underlying core logic and data handlers suffer from critical failures that prevent key features from functioning (Reconciliation) or cause significant data inaccuracy (Accounting Logic). Combined with high-severity performance and accessibility issues, the system requires immediate remediation before it can be considered production-ready.

### 3.2 Prioritization Matrix

| Priority | Category | Finding ID(s) | Impact / Rationale |
| :--- | :--- | :--- | :--- |
| **P0: Immediate** | **Quick Wins** | AUDIT-001, AUDIT-006 | Restores basic functionality (Reconciliation) and fixes severe visual jitter/performance issues. |
| **P1: Urgent** | **Structural Refactors** | AUDIT-002, AUDIT-008 | Corrects fundamental financial accounting logic and ensures legal/accessibility compliance. |
| **P2: Necessary** | **UX/DX Improvements** | AUDIT-007, AUDIT-010, AUDIT-004 | Improves application flow, responsiveness, and error resilience through better state/feedback management. |
| **P3: Strategic** | **Long-term Roadmap** | AUDIT-003, AUDIT-005, AUDIT-009 | Hardens data integrity against manual edits, optimizes scaling performance, and maintains design consistency. |

### 3.3 Strategic Recommendations

#### 3.3.1 Improving the Testing Strategy
*   **Unit Testing:** Expand Vitest coverage specifically for `ScenarioLogic.ts` and database handlers. Every accounting scenario should have a corresponding test case verifying balance delta directions.
*   **Integration Testing:** Implement IPC-level integration tests to verify the bridge between Renderer and Main processes without requiring a full GUI.
*   **E2E Testing:** Introduce Playwright for critical "Golden Path" user journeys (e.g., performing a transaction and verifying the dashboard update).

#### 3.3.2 Hardening the Data Integrity Layer
*   **Atomic Transactions:** Ensure all multi-step database operations (like scenario execution) are wrapped in SQLite `BEGIN TRANSACTION` / `COMMIT` blocks to prevent partial state updates.
*   **Integrity Triggers:** Implement the missing `AFTER UPDATE` and `AFTER DELETE` triggers on the `transactions` table to prevent account balance drift during manual data corrections.

#### 3.3.3 Modernizing the UX/UI Pattern
*   **Asynchronous Feedback:** Replace all synchronous `window.alert()` calls with a non-blocking toast notification system (e.g., `sonner` or `react-hot-toast`).
*   **Accessible Controls:** Adopt a headless UI library (like Radix UI) for complex components to ensure WCAG 2.1 AA compliance without sacrificing visual style.
*   **Stable Animations:** Move all random visual logic (stars/comets) into `useEffect` or dedicated animation refs to prevent re-render "teleportation."

#### 3.3.4 Improving Observability
*   **Structured Logging:** Replace generic `console.log` in Electron handlers with a structured logger (e.g., `pino` or `winston`) that writes to a local file for post-mortem analysis.
*   **Standardized IPC Responses:** Implement a global IPC response wrapper that includes consistent error codes and metadata, allowing the UI to react intelligently to specific failure modes.

#### 3.3.5 CI/CD Pipeline Improvements
*   **Automated Quality Gates:** Configure GitHub Actions to run linters, TypeScript type-checks, and the test suite on every pull request. This is the primary defense against "Breaking Changes" like the schema mismatch found in Phase 1.
*   **Build Artifacts:** Automate the packaging process to ensure that the executable is always built from a clean, tested environment.
