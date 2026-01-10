# Project Brief: Kiosk Transaction Manager

## Core Goals
The Kiosk Transaction Manager is a robust desktop application designed to replace manual Excel tracking for Kiosk shops. Its primary goals are to:
1.  **Eliminate Accounting Complexity:** Replace manual debit/credit entries with a "Scenario Engine" that understands business events.
2.  **Ensure Financial Accuracy:** Implement a double-entry bookkeeping system under the hood to ensure all accounts balance.
3.  **Provide Real-time Intelligence:** Offer instant visibility into Cash-in-Hand, Daily Profits, and Bank Balances.
4.  **Enhance User Experience:** Provide a modern, responsive interface with advanced theming capabilities (Light, Dark, Celestial, Obsidian Flux).

## Key Features
*   **Scenario Engine:** A high-level abstraction layer that translates user actions (e.g., "Kiosk Withdrawal") into precise accounting ledger entries.
*   **Financial Tracking:**
    *   **Kiosk Withdrawal:** Tracks OD Bank Settlement vs. Cash Given vs. Profit.
    *   **PhonePe/UPI Integration:** Tracks money received in personal/business accounts vs. cash given to customers.
    *   **Transfers:** Seamless handling of internal and external money transfers.
*   **Reconciliation System:** A dedicated workflow to verify physical cash against system records at the end of the day to identify and record variances.
*   **Interactive Dashboard:** Real-time metrics for Cash, Profit, and Account Balances.
*   **Advanced Theme System:** A persistent, multi-theme UI architecture supporting immersive visual modes.