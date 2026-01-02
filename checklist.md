# Implementation Checklist

## 1. Database Setup (Backend)
- [x] Create `electron/db/schema.sql` with double-entry schema.
    - [x] `accounts` table (Asset, Liability, Equity, Revenue, Expense).
    - [x] `transaction_groups` for atomic scenarios.
    - [x] `transactions` for ledger entries (Debit/Credit).
    - [x] `daily_records` for reconciliation.
    - [x] `settings` for app configuration.
- [x] Create `electron/db/index.ts` to initialize `better-sqlite3`.
    - [x] Automatic database file creation in `userData`.
    - [x] Automated schema migration/initialization on startup.
- [x] Implement Database Triggers.
    - [x] Automatic account balance updates on transaction insert.

## 2. IPC Handlers (Backend)
- [x] `transactionHandler.ts`: Transaction group management and retrieval.
- [x] `accountHandler.ts`: CRUD operations for accounts.
- [x] `settingsHandler.ts`: App settings persistence.
- [x] `dashboardHandler.ts`: Aggregated stats for the dashboard.
- [x] `reconciliationHandler.ts`: Daily opening/closing balance management.

## 3. Main Process Integration
- [x] Update `electron/main.ts` to register all IPC handlers.
- [x] Preload script (`electron/preload.ts`) exposing `ipcRenderer.invoke`.

## 4. Preload & Types
- [x] `src/types/ipc.d.ts`: Comprehensive TypeScript interfaces for all DB entities.
- [x] Global type augmentation for `window.ipcRenderer`.

## 5. Core Logic Engine
- [x] `src/engines/ScenarioLogic.ts`: Implementation of business scenarios.
    - [x] Kiosk Withdrawal (On-us / Off-us).
    - [x] Kiosk Deposit.
    - [x] PhonePe Withdrawal / Deposit.
    - [x] General Service Sale.
    - [x] Double-entry mapping logic.

## 6. Frontend UI Implementation
- [x] Navigation: Functional Sidebar with active state tracking.
- [x] Dashboard: Real-time stats, profit analysis, and alerts.
- [x] Accounts: Management of cash, bank, and OD accounts.
- [x] Transactions: Scenario-based entry forms and transaction history.
- [x] Settings: Application configuration and data management.
- [x] Reconciliation: Daily cash count and difference tracking.

## 7. Theme System
- [x] `ThemeContext.tsx`: Robust theme management.
- [x] Support for Multiple Themes:
    - [x] Light Mode.
    - [x] Dark Mode.
    - [x] Celestial Night (with starfield animations).
    - [x] Obsidian Flux.
- [x] Persistence: Theme preference saved to `localStorage`.
- [x] System Sync: Automatic detection of OS color scheme.
