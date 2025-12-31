# Kiosk Transaction Manager Architecture

This document outlines the foundational architecture for the Kiosk Transaction Manager.

## 1. System Overview

The application is built on **Electron** (backend/main process) and **React** (frontend/renderer process). Data is stored locally using **SQLite** (`better-sqlite3`).

## 2. Theme Management System

The application utilizes a flexible multi-theme architecture supporting **Light**, **Dark**, and **Celestial** modes, managed via React Context and CSS Variables.

*   **Architecture:**
    *   **State:** managed by `ThemeContext` (persisted in `localStorage`).
    *   **Implementation:** Semantic CSS variables (e.g., `--bg-app`, `--text-primary`) injected via data attributes (`data-theme="celestial"`).
    *   **Tailwind Integration:** Tailwind config maps semantic names to these CSS variables, allowing components to remain theme-agnostic.

*   **Available Themes:**
    1.  **Light:** Professional, high-contrast business theme.
    2.  **Dark:** Standard slate-based dark mode.
    3.  **Celestial:** Premium immersive night theme with deep gradients and "Comet" accents (see `plans/theme_celestial_night.md`).

## 3. Database Schema (SQLite)

We use a normalized schema that separates high-level business events (`transaction_groups`) from low-level accounting entries (`transactions`).

### Tables

#### `accounts`
Tracks the primary financial pillars.
*   `id`: INTEGER PK
*   `name`: TEXT UNIQUE (e.g., 'Cash', 'OD Account', 'Savings', 'Revenue')
*   `type`: TEXT (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)
*   `current_balance`: REAL DEFAULT 0.0

#### `transaction_groups`
Represents a single customer interaction or business event.
*   `id`: INTEGER PK
*   `scenario_type`: TEXT NOT NULL (e.g., 'KIOSK_WITHDRAWAL')
*   `date`: TEXT NOT NULL (ISO Date String)
*   `customer_name`: TEXT
*   `description`: TEXT
*   `timestamp`: INTEGER NOT NULL (Unix timestamp)

#### `transactions`
The individual ledger entries linked to a group.
*   `id`: INTEGER PK
*   `group_id`: INTEGER REFERENCES transaction_groups(id)
*   `account_id`: INTEGER REFERENCES accounts(id)
*   `type`: TEXT ('DEBIT' or 'CREDIT')
*   `amount`: REAL NOT NULL
*   `description`: TEXT

#### `daily_records`
End-of-Day reconciliation records.
*   `id`: INTEGER PK
*   `date`: TEXT UNIQUE
*   `cash_opening`: REAL
*   `cash_closing_calculated`: REAL
*   `cash_physical_count`: REAL
*   `difference`: REAL
*   `notes`: TEXT

#### `settings`
Key-value storage for app configuration.

## 4. Scenario Engine Logic

The frontend will not send raw debits/credits. Instead, it sends a "Scenario Request".

**Example Flow:**
1.  **User Action:** Selects "Kiosk Withdrawal", inputs Amount (1200) and Fee (20).
2.  **Frontend:** Calculates the splits based on defined rules (see `plans/scenarios.md`).
3.  **IPC Call:** Sends `db:add-transaction-group` with:
    ```json
    {
      "scenario": "KIOSK_WITHDRAWAL",
      "entries": [
        { "accountId": 2, "type": "CREDIT", "amount": 1200 }, // OD
        { "accountId": 1, "type": "DEBIT", "amount": 1200 },  // Cash
        { "accountId": 4, "type": "CREDIT", "amount": 20 }    // Revenue
      ]
    }
    ```
4.  **Backend:** Wraps these insertions in a SQL Transaction to ensure atomicity.

## 5. IPC Interface

### Channels

#### Transactions
*   **`db:add-transaction-group`**
    *   **Args:** `{ scenario: string, date: string, description?: string, entries: Array<{accountId: number, type: 'DEBIT'|'CREDIT', amount: number}> }`
    *   **Returns:** `Promise<{ success: true, groupId: number }>`
*   **`db:get-transaction-groups`**
    *   **Args:** `{ limit?: number, offset?: number, startDate?: string, endDate?: string }`
    *   **Returns:** `Promise<TransactionGroupWithEntries[]>`

#### Accounts
*   **`db:get-accounts`**
    *   **Args:** `void`
    *   **Returns:** `Promise<Account[]>`

#### Reconciliation
*   **`db:get-daily-record`**
*   **`db:save-daily-record`**

## 6. Project Structure

```
kiosk-desktop/
├── electron/
│   ├── db/
│   │   ├── index.ts        # DB Connection
│   │   └── schema.sql      # Updated Schema
│   ├── handlers/
│   │   ├── transactionHandler.ts # Handles logic for scenarios/groups
│   │   └── ...
│   ├── main.ts
│   └── preload.ts
├── src/
│   ├── components/
│   │   ├── ScenarioSelector.tsx  # Grid of buttons for scenarios
│   │   └── ScenarioForms/        # Specific forms for each scenario
│   ├── engines/
│   │   └── ScenarioLogic.ts      # Client-side logic to generate ledger entries
│   └── ...