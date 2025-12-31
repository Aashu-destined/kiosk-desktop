# Kiosk Transaction Manager - Software Blueprint

## 1. System Architecture Overview

**Technology Stack:**
*   **Backend:** Electron (Main Process) with `better-sqlite3`
    *   *Reasoning:* Ensures local data privacy, offline capability, and fast performance without the overhead of a separate server. Direct SQL access is robust for financial transactions.
*   **Frontend:** React (Renderer Process) with TypeScript & Tailwind CSS
    *   *Reasoning:* Component-based architecture allows for a dynamic "Scenario Engine" UI. TypeScript ensures type safety for financial calculations.
*   **Database:** SQLite
    *   *Reasoning:* ACID compliant, serverless, and perfectly suited for single-user desktop applications handling relational financial data.

## 2. Database Schema Design

The schema needs to support double-entry bookkeeping principles where a single business event (e.g., "Withdrawal") generates multiple ledger entries (debits/credits).

### Core Tables

#### `accounts`
Tracks the three primary pillars of the business.
*   `id`: INTEGER PK
*   `name`: TEXT (Cash, OD Account, Savings, Revenue/Profit, Expenses)
*   `type`: TEXT (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)
*   `current_balance`: REAL

#### `transaction_groups` (New)
Represents a single customer interaction or business event. This groups individual ledger entries.
*   `id`: INTEGER PK
*   `scenario_type`: TEXT (e.g., 'KIOSK_WITHDRAWAL', 'PHONEPAY_TO_SAVINGS')
*   `customer_name`: TEXT (Optional)
*   `description`: TEXT
*   `timestamp`: INTEGER (Unix Timestamp in seconds - critical for ordering)
*   `date`: TEXT (ISO String for partitioning/searching)

#### `transactions` (Ledger Entries)
Individual movements of money linked to a group.
*   `id`: INTEGER PK
*   `group_id`: INTEGER FK -> transaction_groups(id)
*   `account_id`: INTEGER FK -> accounts(id)
*   `type`: TEXT ('DEBIT' or 'CREDIT')
*   `amount`: REAL
*   `description`: TEXT (e.g., "Principal", "Service Fee", "Change")

#### `daily_records`
For End-of-Day reconciliation.
*   `id`: INTEGER PK
*   `date`: TEXT
*   `cash_opening`: REAL
*   `cash_closing`: REAL
*   `notes`: TEXT

## 3. Core Workflow

### A. Daily Opening
1.  System prompts for **Physical Cash Count**.
2.  System retrieves previous day's closing balance.
3.  If mismatch, create a "Discrepancy" transaction entry automatically or force manual adjustment.
4.  Set `cash_opening` for the new `daily_record`.

### B. The "Scenario Engine" (Transaction Input)
Instead of manual debits/credits, the user selects a scenario. The engine calculates the entries.

**Logic Flow:**
1.  User Selects **Scenario** (e.g., "Kiosk Withdrawal").
2.  User Enters **Input Variables** (e.g., Withdrawal Amount: ₹1200).
3.  **Engine Calculation:**
    *   Determine Fee (e.g., ₹20).
    *   Identify Accounts Involved (Cash, OD, Profit).
    *   Generate Ledger Entries (See `scenarios.md` for logic).
4.  **Review & Confirm:** User sees the net effect before saving.

### C. Liquidity Management & Alerts
*   **Thresholds:** Set minimum limits for Cash (e.g., ₹5,000) and OD Limit.
*   **Real-time Checks:** After every transaction, check `accounts.current_balance`.
*   **Alert:** "Low Cash! Withdraw from Bank" or "High Cash! Deposit to OD".

### D. End-of-Day (EOD) Reporting
1.  **Profit Summary:** Sum of all `transactions` linked to 'Revenue' account for the day.
2.  **Cash Reconciliation:**
    *   `Calculated Cash` = Opening + Credits (In) - Debits (Out).
    *   User inputs `Physical Cash`.
    *   System calculates `Variance`.

## 4. Technical Implementation Details

### Handling "Change" (Scenario 5)
*   **Input:** Total Price (₹30), Amount Tendered (₹100).
*   **Logic:**
    1.  **Credit Revenue:** ₹30 (Profit/Sales).
    2.  **Debit Cash:** ₹30 (The net increase in cash drawer).
    *   *Alternative Granular View:* Credit Revenue ₹30, Debit Cash ₹100 (In), Credit Cash ₹70 (Out).
    *   *Preferred Approach:* Net movement is usually simpler for kiosks, but Granular is better for auditing. We will use **Net Movement** for simplicity unless "Cash Drawer Tracking" is a strict requirement.
    *   *Refined Logic for Granular:*
        *   Credit Service Sales: ₹30
        *   Debit Cash (Drawer): ₹100
        *   Credit Cash (Drawer): ₹70 (Change)
        *   *Net Effect:* Cash +30, Sales +30.

### Timestamp Handling
*   Use `Date.now()` (milliseconds) or `unixepoch()` (seconds) for sorting.
*   Store a human-readable `date` string (YYYY-MM-DD) for grouping and reports.
*   Ensure all entries in a `transaction_group` share the exact same timestamp.

### Business Intelligence
*   **Demand Analysis:** Count `transaction_groups` by `scenario_type`.
*   **Liquidity Traps:** Analyze daily `OD Account` balance trends. If OD is constantly maxed out despite profits, it indicates capital is stuck in receivables or personal withdrawals.

## 5. Scaling Plan
*   **Data Export:** CSV/Excel export for accountant.
*   **Cloud Sync:** Future update to sync SQLite db to a cloud Postgres instance for remote monitoring.
*   **Multi-User:** Switch to a server-based DB if staff is hired.