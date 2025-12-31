# Implementation Checklist

## 1. Database Setup (Backend)
- [x] Create `electron/db/schema.sql` with `transactions` and `settings` tables.
- [x] Create `electron/db/index.ts` to initialize `better-sqlite3`.
    - [x] Ensure it creates the database file (e.g., `kiosk.db`) in `app.getPath('userData')`.
    - [x] Run the schema creation script on startup.

## 2. IPC Handlers (Backend)
- [x] Create `electron/handlers/transactionHandler.ts`.
    - [x] Implement `getTransactions(limit, offset)`.
    - [x] Implement `addTransaction(amount, type, description)`.
    - [x] Implement `updateTransactionStatus(id, status)`.
- [x] Create `electron/handlers/settingsHandler.ts`.
    - [x] Implement `getSettings()`.
    - [x] Implement `saveSetting(key, value)`.

## 3. Main Process Integration
- [x] Update `electron/main.ts` to register IPC handlers.
    - [x] Import handlers.
    - [x] Use `ipcMain.handle` to bind channels defined in `ARCHITECTURE.md`.

## 4. Preload & Types
- [x] Update `electron/preload.ts` (if necessary) to ensure `invoke` is properly exposed (it seems to be already).
- [x] Create `src/types/ipc.d.ts` (or similar) to define the `Transaction` interface and IPC return types.
- [x] Add global type augmentation for `window.ipcRenderer`.

## 5. Frontend Verification
- [x] Update `src/App.tsx`.
    - [x] Add a simple "Add Transaction" button.
    - [x] Add a list to display transactions fetched from `db:get-transactions`.
    - [x] Verify data persistence by restarting the app.