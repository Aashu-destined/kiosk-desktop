# Core Logic Update Plan

## Objective
Align the application's transaction logic with the user's specific business rules for a Kiosk shop, handling "Cash" (In-Hand), "Bank Account" (PhonePe/Digital), and "OD Account" (Kiosk Settlement).

## 1. Terminology & Accounting Principles
The user employs "Bank Statement" terminology. We will map this to standard Double-Entry Accounting internally.

| User Term | Meaning | Internal Accounting Action | Target Account Type |
| :--- | :--- | :--- | :--- |
| **Debit** | Money Out / Withdrawn | **CREDIT** | Asset (Cash/Bank) |
| **Credit** | Money In / Deposit | **DEBIT** | Asset (Cash/Bank) |
| **OD Credit** | Money In to OD | **DEBIT** | Liability (OD) [Reduces Debt/Increases Value] |
| **OD Debit** | Money Out from OD | **CREDIT** | Liability (OD) [Increases Debt/Reduces Value] |

## 2. Database Schema Changes
*   **No structural changes required.** The current `accounts`, `transaction_groups`, and `transactions` tables are sufficient.
*   **Data Updates:**
    *   Rename "Savings Account" to **"Bank Account"** to match user terminology.
    *   Ensure "OD Account" exists.

## 3. Transaction Logic Specifications (ScenarioLogic.ts)

We will refactor `src/engines/ScenarioLogic.ts` to implement the following scenarios.

### 3.1. Kiosk Transactions
*   **Accounts Involved:** `Cash` (Physical), `OD Account` (Settlement).
*   **User Rule:** Profit sits in OD Account.

#### A. Kiosk Withdrawal (Customer takes Cash)
*   **Inputs:** `amount` (Cash Given), `total_settled` (Amount hitting OD).
*   **Logic:**
    1.  **CREDIT Cash** `amount` (Money leaves drawer).
    2.  **DEBIT OD** `total_settled` (Money enters OD).
    3.  **CREDIT Revenue** `total_settled - amount` (Profit).
*   *Note:* If `total_settled` = `amount`, profit is 0 (On-Us might be 0 fee).

#### B. Kiosk Deposit (Customer gives Cash)
*   **Inputs:** `amount` (Cash Received), `total_settled` (Amount deducted from OD).
*   **Logic:**
    1.  **DEBIT Cash** `amount` (Money enters drawer).
    2.  **CREDIT OD** `total_settled` (Money leaves OD).
    3.  **CREDIT Revenue** `amount - total_settled` (Profit).

### 3.2. PhonePe/UPI Transactions
*   **Accounts Involved:** `Cash` (Physical), `Bank Account` (Digital).
*   **User Rule:** Profit sits in Bank Account.

#### A. PhonePe Withdrawal (Customer sends UPI, takes Cash)
*   **Inputs:** `amount` (Cash Given), `total_received` (Amount hitting Bank).
*   **Logic:**
    1.  **CREDIT Cash** `amount` (Money leaves drawer).
    2.  **DEBIT Bank Account** `total_received` (Money enters Bank).
    3.  **CREDIT Revenue** `total_received - amount` (Profit).

#### B. PhonePe Deposit (Customer gives Cash, we send UPI)
*   **Inputs:** `amount` (Cash Received), `total_sent` (Amount leaving Bank).
*   **Logic:**
    1.  **DEBIT Cash** `amount` (Money enters drawer).
    2.  **CREDIT Bank Account** `total_sent` (Money leaves Bank).
    3.  **CREDIT Revenue** `amount - total_sent` (Profit).

### 3.3. General Services (Print, Form Filling, etc.)
This handles complex cases where payment and cost can be split between Cash and Digital.

*   **Inputs:**
    *   `cash_in`: Amount received in Cash.
    *   `digital_in`: Amount received in Bank.
    *   `cash_out`: Cost paid in Cash (if any).
    *   `digital_out`: Cost paid from Bank (e.g., online form fee).
*   **Logic:**
    1.  If `cash_in` > 0: **DEBIT Cash** `cash_in`.
    2.  If `digital_in` > 0: **DEBIT Bank Account** `digital_in`.
    3.  If `cash_out` > 0: **CREDIT Cash** `cash_out`.
    4.  If `digital_out` > 0: **CREDIT Bank Account** `digital_out`.
    5.  **Calculate Net:** `(cash_in + digital_in) - (cash_out + digital_out)`.
    6.  **CREDIT Revenue** `Net Amount`.

## 4. UI Implications
*   **Scenario Selector:** Update options to match these flows:
    *   "Kiosk Withdrawal"
    *   "Kiosk Deposit"
    *   "UPI/PhonePe Withdrawal"
    *   "UPI/PhonePe Deposit"
    *   "General Service / Sale"
*   **Form Inputs:** Dynamic fields based on the selected scenario (e.g., "Amount to Customer" vs "Amount Settled in Bank").

## 5. Implementation Steps
1.  **Update DB Seeds:** Rename 'Savings Account' to 'Bank Account'.
2.  **Refactor `ScenarioLogic.ts`:**
    *   Remove hardcoded assumptions.
    *   Implement the explicit double-entry logic defined above.
    *   Ensure strict type checking for required params.
3.  **Update Frontend (Settings/Transactions):** Ensure account names align with the new logic.

## 6. Verification
*   **Test Case 1 (Kiosk W/D):** Withdraw 1000, Give 990. -> Cash -990, OD +1000, Rev +10.
*   **Test Case 2 (UPI W/D):** Receive 500, Give 480. -> Cash -480, Bank +500, Rev +20.
*   **Test Case 3 (Service):** Form Fill. Take 100 Cash. Pay 50 Govt Fee from Bank. -> Cash +100, Bank -50, Rev +50.