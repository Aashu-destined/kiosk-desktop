# Comprehensive System Audit Report

## 1. Architecture & General Maintenance

| Severity | Category | Location | Issue | Suggested Fix |
|:--:|:--:|:--|:--|:--|
| **Low** | Maintenance | `electron/handlers/exampleHandler.ts` | **Dead Code (Unused IPC):** `handleGetAppVersion` is registered but never called by the frontend. | Remove the handler file, unregister in `main.ts`, and clean up `ipc.d.ts`. |
| **Low** | Maintenance | Root Directory | **File Clutter:** Test scripts (`test-app.js`, etc.) and docs are loose in the root. | Move scripts to `scripts/` and docs to `docs/` or `assets/`. |
| **Low** | Architecture | `Project Structure.md` | **Documentation Deviation:** File structure docs do not match actual codebase (e.g., example handler). | Update documentation to reflect reality or remove the dead code. |

## 2. Functional Logic & Backend

| Severity | Category | Location | Issue | Suggested Fix |
|:--:|:--:|:--|:--|:--|
| **High** | Database | `electron/db/index.ts` | **Missing Foreign Key Enforcement:** SQLite FKs are not enabled (`PRAGMA foreign_keys = ON` is missing). | Execute `db.pragma('foreign_keys = ON');` on connection init. |
| **Medium** | Functional | `electron/handlers/dashboardHandler.ts` | **Timezone Mismatch:** Dashboard calculates "Today" using UTC, causing data discrepancies for users in other timezones. | Pass client local date or use SQLite `localtime` modifier. |
| **Medium** | Data Integrity | `schema.sql` | **Floating Point Currency:** Money stored as `REAL`, leading to potential precision errors. | Migrate to `INTEGER` (cents) or use rigid rounding logic. |
| **Medium** | Security | `transactionHandler.ts` | **Missing IPC Input Validation:** Handler assumes `entries` is an array; crashes on malformed input. | Add strict input validation (e.g., Zod) before processing. |
| **Low** | Security | `electron/preload.ts` | **Generic IPC Exposure:** `invoke` allows arbitrary IPC calls from renderer. | Expose specific, typed API methods instead of generic bridge. |
| **Low** | Performance | `transactionHandler.ts` | **N+1 Query Issue:** Fetches transaction groups then queries transactions for *each* group individually. | Use `JOIN` or batch `WHERE IN` query. |

## 3. UI/UX & Frontend

| Severity | Category | Location | Issue | Suggested Fix |
|:--:|:--:|:--|:--|:--|
| **Critical** | Frontend Code | `src/engines/ScenarioLogic.ts` | **Hardcoded Account Dependencies:** Logic relies on specific string names (e.g., "OD Account"). | Refactor to use database-stored `account_type` enums/flags. |
| **Medium** | UX | Global | **Blocking Alerts:** Uses `window.alert()` for feedback, freezing the UI. | Replace with non-blocking Toast notifications. |
| **Medium** | Accessibility | `src/components/ThemeToggle.tsx` | **Missing Labels:** Mobile view hides text; missing `aria-label` for screen readers. | Add `aria-label` to buttons. |
| **Medium** | UI | `src/components/Sidebar.tsx` | **Non-Responsive Sidebar:** Fixed width causes layout issues on mobile/tablet. | Implement collapsible or drawer-style sidebar for small screens. |
| **Medium** | Frontend Code | Global | **No i18n:** All text is hardcoded English. | Implement `react-i18next` for localization support. |
| **Low** | Performance | `src/App.tsx` | **No Code Splitting:** All pages load in the main bundle. | Implement `React.lazy` and `Suspense` for route-based splitting. |
| **Low** | Styling | `src/components/ScenarioSelector.tsx` | **Hardcoded Colors:** Logic uses specific Tailwind colors (e.g., `emerald-500`) instead of theme vars. | Abstract colors into `tailwind.config.js` semantic names. |