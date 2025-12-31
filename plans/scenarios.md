# Scenario Engine Logic

This document defines the hard-coded logic for the "Scenario Engine". The engine takes user input and generates the corresponding ledger entries.

## Terminology & Accounts
To ensure clarity between "Accounting Terms" and "User Mental Model":
*   **INCREASE (+):** Money added to the account.
*   **DECREASE (-):** Money removed from the account.

**Accounts:**
1.  **CASH:** Physical Cash Drawer
2.  **OD_ACC:** Overdraft Bank Account (Business)
3.  **SAVINGS_ACC:** Personal Savings Bank Account
4.  **REVENUE:** Profit/Service Charges Account

---

## 1. Kiosk Withdrawal (via Software/AEPS)
*Customer withdraws money using the shop's fingerprint scanner/software. Money settles into OD Account. Shop owner gives Physical Cash to customer.*

*   **Inputs:** `Withdrawal Amount ($W)`, `Service Fee ($F)`
*   **Logic:**
    *   **OD_ACC:** INCREASE by `$W` (Money settled from bank)
    *   **CASH:** DECREASE by `$W` (Cash given to customer)
    *   **REVENUE:** INCREASE by `$F` (Service Charge collected)
    *   *Note on Fee:* Usually, if the fee is collected in cash from the customer on top of the withdrawal, it's `Cash Increase $F` -> `Revenue Increase $F`. If the fee is part of the settlement difference, it's calculated differently.
    *   *User Specific Scenario 1:* "Credit 1200 to OD; Debit 1200 from Cash; Credit 20 as Profit".
    *   **Net Action:**
        1.  OD_ACC: +$W
        2.  CASH: -$W
        3.  CASH: +$F (Fee collected from customer in cash) OR REVENUE +$F (if tracked separately) -> *Assumption: Fee is collected in Cash.*

## 2. Withdrawal via PhonePay (to Savings)
*Customer sends money to Owner's Savings via UPI. Owner gives Cash to customer.*

*   **Inputs:** `Total Received ($T)`, `Principal Cash Given ($P)`
    *   *Derived:* `Profit ($F) = $T - $P`
*   **Logic (User Ex 2):** Customer pays 4850 ($T). Cash given 4800 ($P). Profit 50.
    1.  **SAVINGS_ACC:** INCREASE by `$T` (4850)
    2.  **CASH:** DECREASE by `$P` (4800)
    3.  **REVENUE:** INCREASE by `$F` (50) - *Virtual entry for reporting*

## 3. Transfer via Savings (PhonePay)
*Customer pays via UPI to Savings. Owner transfers money out from Savings to an external account.*

*   **Inputs:** `Total Received ($T)`, `Transfer Amount ($X)`
    *   *Derived:* `Profit ($F) = $T - $X`
*   **Logic (User Ex 3):** Customer pays 2020 ($T). Transfer 2000 ($X). Profit 20.
    1.  **SAVINGS_ACC:** INCREASE by `$T` (2020)
    2.  **SAVINGS_ACC:** DECREASE by `$X` (2000)
    3.  **REVENUE:** INCREASE by `$F` (20)

## 4. Transfer via Cash
*Customer gives Cash. Owner transfers money out from Savings.*

*   **Inputs:** `Total Cash Received ($T)`, `Transfer Amount ($X)`
    *   *Derived:* `Profit ($F) = $T - $X`
*   **Logic (User Ex 4):** Customer gives 3240 ($T). Transfer 3200 ($X). Profit 40.
    1.  **CASH:** INCREASE by `$T` (3240)
    2.  **SAVINGS_ACC:** DECREASE by `$X` (3200)
    3.  **REVENUE:** INCREASE by `$F` (40)

## 5. Service Sales (Printing/Xerox)
*General sales where customer pays cash and might need change.*

*   **Inputs:** `Sale Amount ($S)`, `Cash Tendered ($C)`
    *   *Derived:* `Change Given ($G) = $C - $S`
*   **Logic (User Ex 5):** Sale 30 ($S). Given 100 ($C). Change 70 ($G).
    *   *Simple Approach:*
        1.  **CASH:** INCREASE by `$S` (30)
        2.  **REVENUE:** INCREASE by `$S` (30)
    *   *Granular Approach (Auditing Tender):*
        1.  **CASH:** INCREASE by `$C` (100)
        2.  **CASH:** DECREASE by `$G` (70)
        3.  **REVENUE:** INCREASE by `$S` (30)

---

## Technical Data Structure for Scenarios

The `ScenarioDefinition` object in the code will look like this:

```typescript
type AccountType = 'CASH' | 'OD' | 'SAVINGS' | 'REVENUE';

interface LedgerEntryRule {
  account: AccountType;
  operation: 'INCREASE' | 'DECREASE';
  amountVariable: 'TOTAL' | 'PRINCIPAL' | 'FEE' | 'TENDER' | 'CHANGE';
}

interface Scenario {
  id: string;
  name: string;
  inputs: string[]; // e.g. ['amount', 'fee']
  rules: LedgerEntryRule[];
}
```

This data driven approach allows us to add new scenarios easily without rewriting the core calculation engine.