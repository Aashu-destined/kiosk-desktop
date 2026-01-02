# Kiosk Transaction Manager Architecture

This document outlines the foundational architecture for the Kiosk Transaction Manager.

## 1. System Overview

The application is built on **Electron** (backend/main process) and **React** (frontend/renderer process). Data is stored locally using **SQLite** (`better-sqlite3`).

## 2. Theme Management System

The application utilizes a flexible multi-theme architecture managed via React Context and CSS Variables, allowing for dynamic visual updates without component re-renders.

*   **Architecture:**
    *   **State:** Managed by `ThemeContext`, which synchronizes with `localStorage` for persistence and respects system preferences.
    *   **Implementation:** Semantic CSS variables (e.g., `--bg-app`, `--text-primary`) are injected into the document root via data attributes (e.g., `data-theme="celestial"`).
    *   **Tailwind Integration:** The `tailwind.config.js` maps semantic names to these CSS variables, ensuring the UI remains theme-agnostic.
    *   **Animations:** Specialized components like `Starfield.tsx` provide immersive backgrounds for specific themes.

*   **Available Themes:**
    1.  **Light:** Professional, high-contrast business theme.
    2.  **Dark:** Standard slate-based dark mode.
    3.  **Celestial:** Premium immersive night theme with deep gradients, "Comet" accents, and an animated starfield (see `plans/theme_celestial_night.md`).
    4.  **Obsidian Flux:** Ultra-dark, high-performance theme designed for low-light environments (see `plans/theme_obsidian_flux.md`).

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

The bridge between the Renderer and Main processes is organized into functional handlers, each exposed via specific IPC channels.

### Handlers & Channels

#### `transactionHandler`
Handles the core "Scenario Engine" logic and double-entry ledger records.
*   **`db:add-transaction-group`**: Commits a business event and its associated ledger entries.
*   **`db:get-transaction-groups`**: Retrieves history with filtering support.

#### `accountHandler`
Manages the chart of accounts and balances.
*   **`db:get-accounts`**: Returns the list of all accounts with their current balances.

#### `dashboardHandler`
Provides aggregated data for the dashboard view.
*   **`db:get-dashboard-stats`**: Calculates "Today's Profit" and current "Cash Position".

#### `reconciliationHandler`
Handles the end-of-day cash counting logic.
*   **`db:get-daily-record`**: Fetches reconciliation data for a specific date.
*   **`db:save-daily-record`**: Persists the physical count and calculated variance.

#### `settingsHandler`
Manages application-wide persistent settings.
*   **`settings:get`** / **`settings:set`**: Key-value storage for app behavior.

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