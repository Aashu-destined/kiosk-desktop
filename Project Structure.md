# Project Structure

This document tracks the directory layout of the Kiosk Transaction Manager.

## Root Directory
| Folder | Description |
|---|---|
| `electron/` | Backend (Main Process) logic and database handlers. |
| `src/` | Frontend (Renderer Process) UI code. |
| `plans/` | Architectural blueprints and logic documentation. |

## Electron Backend (`electron/`)
*   `db/`
    *   `schema.sql`: Database table definitions (Double-entry bookkeeping).
    *   `index.ts`: Database connection and initialization.
*   `handlers/`
    *   `accountHandler.ts`: Account balance and management IPC.
    *   `dashboardHandler.ts`: Dashboard statistics and metrics IPC.
    *   `reconciliationHandler.ts`: Daily cash verification IPC.
    *   `settingsHandler.ts`: Application configuration IPC.
    *   `transactionHandler.ts`: IPC handlers for processing transaction groups.
*   `main.ts`: Entry point.
*   `preload.ts`: Context Bridge.

## React Frontend (`src/`)
*   `engines/`
    *   `ScenarioLogic.ts`: **Core Business Logic**. Translates user scenarios into ledger entries.
*   `components/`
    *   `Layout.tsx`: Main application shell with sidebar.
    *   `ScenarioSelector.tsx`: Grid UI for selecting transaction types.
    *   `ScenarioForms.tsx`: Dynamic inputs based on selected scenario.
    *   `Sidebar.tsx`: Navigation and reconciliation panel.
    *   `Starfield.tsx`: Animated background for celestial themes.
    *   `ThemeToggle.tsx`: Theme switcher component.
*   `pages/`
    *   `Accounts.tsx`: View for managing business accounts.
    *   `Dashboard.tsx`: Financial overview and charts.
    *   `Settings.tsx`: User preferences and app config.
    *   `Transactions.tsx`: Main transaction management view.
*   `types/`
    *   `ipc.d.ts`: Shared TypeScript interfaces.