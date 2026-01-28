# System Patterns

## System Architecture

The Kiosk Transaction Manager follows a classic **Electron** architecture, separating the application into two distinct processes:

1.  **Main Process (Backend):**
    *   Runs Node.js.
    *   Manages the SQLite Database (`better-sqlite3`).
    *   Handles IPC requests.
    *   Manages application lifecycle.
2.  **Renderer Process (Frontend):**
    *   Runs React (Vite).
    *   Handles UI/UX.
    *   Communicates with the backend via IPC Bridge (`window.electron`).

## Database Design Patterns
The system uses a **Double-Entry Bookkeeping** pattern implemented via a normalized SQLite schema.

### Core Entities
*   **`accounts`**: The chart of accounts (Assets, Liabilities, Revenue, Expenses).
*   **`transaction_groups`**: Represents a high-level business event (e.g., "Kiosk Withdrawal"). Stores metadata like date, customer name, and scenario type.
*   **`transactions`**: The atomic ledger entries. Multiple entries link to a single group (e.g., Credit OD, Debit Cash, Credit Revenue).
*   **`daily_records`**: Stores reconciliation data.

### Financial Data Patterns (Integer Math)
*   **Storage:** All monetary values are stored as **Integers** (cents/paise) to prevent floating-point precision errors (AUDIT-101).
*   **Calculation:** Math operations are performed on integers.
*   **Display:** Values are formatted to decimal strings only at the UI layer using `formatUtils`.

### Data Flow
1.  **Frontend** calculates the splits based on the Scenario Logic.
2.  **Frontend** sends a structured object (Group + Entries) to the backend.
3.  **Backend** wraps the insertion in a SQL Transaction (`BEGIN` -> `COMMIT`) to ensure atomicity.

## IPC Communication Pattern
Communication follows a **Request-Response** pattern using `ipcMain.handle` and `ipcRenderer.invoke`.

*   **Handlers:** Organized by domain in `electron/handlers/` (e.g., `accountHandler`, `transactionHandler`).
*   **Channels:** Namespaced strings (e.g., `db:add-transaction-group`, `settings:get`).
*   **Bridge:** Exposed via `contextBridge` in `preload.ts` for secure access.

## User Interface Patterns

### Theme System
The application supports hot-swappable visual themes using a combination of **React Context** and **CSS Variables**.

1.  **State Source:** `ThemeContext` manages the active theme (Light/Dark/Celestial/Obsidian) and persists it to `localStorage`.
2.  **DOM Injection:** The active theme is applied as a data attribute to the root element (e.g., `data-theme="celestial"`).
3.  **CSS Variables:** Semantic variables (e.g., `--bg-app`, `--accent-primary`) are defined in `index.css` for each theme attribute.
4.  **Tailwind Abstraction:** `tailwind.config.js` maps utility classes to these variables, decoupling the components from specific color values.

### User Feedback (Toast Notifications)
Non-blocking feedback is provided via a **Toast Notification System** (AUDIT-007).
*   **Provider:** `ToastContext` wraps the application.
*   **Usage:** Components use the `useToast()` hook to trigger success/error messages.
*   **UI:** Toasts appear as floating notifications with animations and auto-dismissal.

### Responsive Layout
*   **Sidebar:** Implements a collapsible pattern to support smaller screens (AUDIT-014). Toggles between full-width (labels + icons) and compact (icons only) modes.
