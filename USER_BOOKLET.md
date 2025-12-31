# User Booklet: Kiosk Transaction Manager

Welcome to your new **Kiosk Transaction Manager**! This guide will help you understand how to use the "Scenario Engine" to track your daily business operations accurately.

---

## 1. Getting Started

When you open the application, you will see two main areas:
1.  **Sidebar (Left)**: Navigation buttons (Dashboard, Transactions, Accounts, Settings) and Daily Reconciliation tool.
2.  **Main View (Right)**: The workspace for your selected task.

---

## 2. Adding Transactions (The Scenario Engine)

We have simplified accounting by using "Scenarios". Instead of thinking about debits and credits, you just tell the system *what happened*.

To start, click **Transactions** in the sidebar. You will see icons for common activities.

### Scenario A: Kiosk Withdrawal (Fingerprint/AEPS)
*Customer withdraws money using your system. You give them cash.*
1.  Click **Kiosk Withdrawal**.
2.  Enter **Withdrawal Amount** (e.g., ₹1000).
3.  Enter **Service Fee** (e.g., ₹10).
4.  (Optional) Enter Customer Name.
5.  Click **Process Transaction**.
    *   *System Action:* Increases your OD Bank Balance, Decreases your Cash Drawer, Records ₹10 Profit.

### Scenario B: PhonePe to Savings
*Customer sends money to your personal Savings UPI. You give them cash.*
1.  Click **PhonePe -> Savings**.
2.  Enter **Total Received** (e.g., ₹5050).
3.  Enter **Cash Given** (e.g., ₹5000).
4.  Click **Process**.
    *   *System Action:* Increases Savings Balance (₹5050), Decreases Cash Drawer (₹5000), Records ₹50 Profit.

### Scenario C: Money Transfer
*Customer gives you Cash. You transfer money from your Savings Account.*
1.  Click **Transfer (via Cash)**.
2.  Enter **Total Received** (from customer).
3.  Enter **Transfer Amount** (sent to beneficiary).
4.  Click **Process**.
    *   *System Action:* Increases Cash Drawer, Decreases Savings Balance, Records difference as Profit.

---

## 3. The Dashboard

The Dashboard gives you an instant health check:
*   **Today's Profit**: Total fees earned from all transactions.
*   **Cash Position**: How much physical cash *should* be in your drawer.
*   **Alerts**: Warnings if your OD account is low or Cash is too high.

---

## 4. End of Day Reconciliation

At the end of the day, verify your cash:
1.  Go to the **Sidebar** bottom section.
2.  Read **Expected Closing**: This is what the software calculated.
3.  Count your actual notes and coins. Enter this in **Physical Cash Count**.
4.  Check the **Variance**. It should be **0**.
    *   *If Positive (+):* You have extra money (maybe forgot to record a deposit?).
    *   *If Negative (-):* You are missing money (maybe gave too much change?).
5.  Click **Close Day** to save the record.

---

## 5. Frequently Asked Questions

**Q: What if I make a mistake?**
A: Currently, you cannot edit a transaction once saved (for security). You can add a "Correction" transaction (feature coming soon) or ask your admin to fix it in the database.

**Q: How do I add a new Scenario?**
A: Scenarios are built into the code. Contact the developer to add new business logic.