# Product Context

## The "Scenario Engine" Concept
Traditional accounting software requires users to understand Debits and Credits. The Kiosk Transaction Manager abstracts this complexity. The user selects **"What happened"** (a Scenario), and the system determines the accounting implications.

### Why this matters
Kiosk operators deal with complex split transactions. For example, a withdrawal involves:
1.  Money entering the bank account (Settlement).
2.  Cash leaving the drawer (Given to customer).
3.  Commission earned (Revenue).

The Scenario Engine handles these multi-leg transactions automatically based on simple inputs like "Amount" and "Fee".

## Detailed Scenario Breakdown

### 1. Kiosk Withdrawal (AEPS/Software)
*   **Context:** Customer withdraws money using the shop's fingerprint scanner.
*   **Flow:**
    *   Bank settles money into the **OD Account** (Liability).
    *   Shop owner gives **Physical Cash** to the customer.
    *   Service fee is collected (Revenue).

### 2. PhonePe to Savings
*   **Context:** Customer sends money to the owner's personal UPI (Savings) instead of cash.
*   **Flow:**
    *   Money enters **Savings Account**.
    *   **Physical Cash** is given to the customer.
    *   Difference is Profit.

### 3. Money Transfers (Internal & External)
*   **Context:** Moving funds between own accounts (e.g., Bank to Cash) or sending to others.
*   **Flow:**
    *   **Internal:** Debit Destination Account (Money In), Credit Source Account (Money Out).
    *   **External:** Tracks the movement of funds between Cash, Savings, and External entities, capturing the profit margin (commission).

### 4. Service Sales
*   **Context:** General sales like Printing or Xerox.
*   **Flow:**
    *   Increases **Cash**.
    *   Increases **Revenue**.
    *   Can optionally track Tender vs Change given.

## Reconciliation Workflow
Reconciliation is the process of verifying that the Physical Cash in the drawer matches the System's calculated Cash Balance.

1.  **System Calculation:** The system sums all Cash Debits and Credits to determine the `cash_closing_calculated`.
2.  **Physical Count:** The user counts the actual notes and coins and enters the `cash_physical_count`.
3.  **Variance Recording:** The system calculates the `difference` (Variance).
4.  **Audit:** This record is saved daily to track unaccounted losses or surpluses.
