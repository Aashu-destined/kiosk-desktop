# Kiosk Transaction Manager (Desktop)

A robust desktop application designed to replace manual Excel tracking for Kiosk shops. Built with **Electron**, **React**, **TypeScript**, and **SQLite**.

## Key Features

### 🚀 The Scenario Engine
Forget manual debits and credits. Simply select what happened:
*   **Kiosk Withdrawal**: Tracks OD Bank Settlement vs. Cash Given vs. Profit.
*   **PhonePe to Savings**: Tracks money received in personal UPI vs. Cash given to customer.
*   **Money Transfers**: Handles internal and external transfers seamlessly.

### 📊 Financial Intelligence
*   **Double-Entry Bookkeeping**: Every transaction is recorded with precise accounting standards under the hood.
*   **Real-time Dashboard**: Monitor Cash-in-Hand, Daily Profits, and Bank Balances.
*   **Reconciliation**: Tool to verify physical cash against system records at the end of the day.

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/kiosk-transaction-manager.git
    cd kiosk-transaction-manager
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start Development Mode:
    ```bash
    npm run dev
    ```

## Documentation
*   [User Booklet](USER_BOOKLET.md): Guide on how to use the software.
*   [Architecture](ARCHITECTURE.md): Technical design and system logic.
*   [Scenarios](plans/scenarios.md): Detailed accounting rules.