# Kiosk Transaction Manager - Project Brief

## 1. The Foundation

The **Kiosk Transaction Manager** is a robust, local-first desktop application engineered to replace manual spreadsheet tracking with professional-grade financial integrity.

### Technical Architecture
*   **Core Framework**: Built on **Electron**, facilitating a secure, offline-capable desktop environment.
*   **Frontend**: Utilizes **React** with **TypeScript** for type-safe interaction, styled with **Tailwind CSS**.
*   **Backend & Storage**: Leverages **SQLite** (`better-sqlite3`) for a serverless, relational database that ensures ACID compliance for all financial data.
*   **Data Flow**: Operates on a strict separation of concerns where the Renderer process (UI) communicates with the Main process (Database logic) via secure **IPC Handlers**.

### Conceptual Data Model
The system is built on **Double-Entry Bookkeeping** principles. It distinguishes between:
*   **Transaction Groups**: The high-level business event (e.g., "Customer withdrew ₹1000").
*   **Ledger Entries**: The specific debit/credit atomic records that satisfy the accounting equation (Assets = Liabilities + Equity).

---

## 2. High-Level Overview

This application serves as a "Financial Operating System" for Kiosk shops. Its primary innovation is the **Scenario Engine**.

Unlike traditional accounting software that requires manual input of debits and credits, this system presents users with familiar real-world actions (Scenarios). When a user selects a scenario—such as a "Kiosk Withdrawal" or "PhonePe Transfer"—the engine automatically calculates the necessary splits across Cash, Bank, and Profit accounts.

This approach democratizes professional accounting, allowing shop owners to maintain audit-ready books without requiring specialized financial knowledge.

---

## 3. Core Requirements and Goals

### Primary Objectives
1.  **Eliminate Manual Errors**: Replace error-prone mental math and paper logs with automated, rule-based transaction processing.
2.  **Real-Time Visibility**: Provide instant insight into critical metrics:
    *   **Cash-in-Hand**: The theoretical amount of physical cash in the drawer.
    *   **Daily Profit**: Net revenue generated from service fees.
    *   **Liquidity**: Current balances of Settlement/OD accounts.
3.  **Daily Reconciliation**: Enforce a daily workflow where the physical cash count is verified against system records to immediately identify and record discrepancies.

### Key Features
*   **Scenario Engine**: Pre-programmed logic maps user inputs to multi-leg financial transactions.
*   **Theme System**: A sophisticated UI offering multiple persistent themes (Light, Dark, Celestial, Obsidian Flux) to suit various lighting environments and user preferences.
*   **Data Persistence**: Secure local storage of all financial history with support for database backups.
*   **Audit Trail**: Every movement of money is timestamped and grouped, providing complete traceability from a high-level event down to individual ledger entries.