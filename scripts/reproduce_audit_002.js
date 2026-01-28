const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// Wait for app to be ready to ensure native modules load correctly in Electron environment
app.whenReady().then(() => {
    console.log('Running reproduction script inside Electron...');
    
    try {
        const Database = require('better-sqlite3');
        
        // Setup in-memory DB
        const db = new Database(':memory:');

        // 1. Setup Schema (from electron/db/schema.sql)
        db.exec(`
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                type TEXT NOT NULL,
                current_balance REAL NOT NULL DEFAULT 0.0
            );

            CREATE TABLE IF NOT EXISTS transaction_groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scenario_type TEXT NOT NULL,
                date TEXT NOT NULL,
                customer_name TEXT,
                description TEXT,
                timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id INTEGER NOT NULL REFERENCES transaction_groups(id) ON DELETE CASCADE,
                account_id INTEGER NOT NULL REFERENCES accounts(id),
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                description TEXT,
                timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
            );

            -- The Logic Trigger
            CREATE TRIGGER IF NOT EXISTS update_balance_after_insert
            AFTER INSERT ON transactions
            BEGIN
                UPDATE accounts 
                SET current_balance = CASE 
                    WHEN NEW.type = 'DEBIT' AND type IN ('ASSET', 'EXPENSE') THEN current_balance + NEW.amount
                    WHEN NEW.type = 'CREDIT' AND type IN ('ASSET', 'EXPENSE') THEN current_balance - NEW.amount
                    WHEN NEW.type = 'CREDIT' AND type IN ('LIABILITY', 'EQUITY', 'REVENUE') THEN current_balance + NEW.amount
                    WHEN NEW.type = 'DEBIT' AND type IN ('LIABILITY', 'EQUITY', 'REVENUE') THEN current_balance - NEW.amount
                    ELSE current_balance
                END
                WHERE id = NEW.account_id;
            END;
        `);

        // 2. Seed Accounts (As per Audit Description: OD is LIABILITY)
        console.log("Seeding Accounts...");
        const insertAccount = db.prepare("INSERT INTO accounts (name, type, current_balance) VALUES (?, ?, ?)");
        const odId = insertAccount.run('OD Account', 'LIABILITY', 0.0).lastInsertRowid;
        const cashId = insertAccount.run('Cash', 'ASSET', 10000.0).lastInsertRowid; // Start with cash to dispense

        // 3. Define the Logic (from src/engines/ScenarioLogic.ts)
        // We mimic the KIOSK_WITHDRAWAL_ON_US logic
        const amountOnUs = 1000;
        const entries = [
            { account_id: odId, type: 'DEBIT', amount: amountOnUs, description: 'Bank Settlement (In) - On-us' },
            { account_id: cashId, type: 'CREDIT', amount: amountOnUs, description: 'Cash Disbursement' },
        ];

        console.log("\n--- PRE-TRANSACTION STATE ---");
        const getBalance = db.prepare("SELECT name, type, current_balance FROM accounts WHERE id = ?");
        console.log(getBalance.get(odId));
        console.log(getBalance.get(cashId));

        // 4. Execute Transaction
        console.log(`\n--- EXECUTING KIOSK WITHDRAWAL (${amountOnUs}) ---`);
        const insertGroup = db.prepare("INSERT INTO transaction_groups (scenario_type, date, description) VALUES (?, ?, ?)");
        const groupId = insertGroup.run('KIOSK_WITHDRAWAL_ON_US', new Date().toISOString(), 'Test').lastInsertRowid;

        const insertTx = db.prepare("INSERT INTO transactions (group_id, account_id, type, amount, description) VALUES (?, ?, ?, ?, ?)");
        entries.forEach(e => {
            insertTx.run(groupId, e.account_id, e.type, e.amount, e.description);
            console.log(`Posted: ${e.type} ${e.amount} to ${e.account_id === odId ? 'OD Account' : 'Cash'}`);
        });

        // 5. Verify Results
        console.log("\n--- POST-TRANSACTION STATE ---");
        const odState = getBalance.get(odId);
        const cashState = getBalance.get(cashId);

        console.log(odState);
        console.log(cashState);

        // 6. Analysis
        console.log("\n--- ANALYSIS ---");
        
        let success = true;

        if (odState.current_balance < 0) {
            console.log(`[FAIL] OD Account Balance is NEGATIVE (${odState.current_balance}).`);
            console.log("       Logic: Money In (Debit) to Liability (Start 0) -> Balance Decreases.");
            console.log("       Interpretation: If OD is 'Debt', we now have 'Negative Debt' (Asset).");
            console.log("       Problem: Visually confusing if user expects 'Funds Available' to be positive.");
            success = false;
        } else {
            console.log(`[PASS] OD Account Balance is POSITIVE (${odState.current_balance}).`);
        }

        if (odState.type === 'LIABILITY' && odState.current_balance > 0) {
            console.log("       Note: Positive Balance in Liability = Debt Exists.");
        }
        
        // Exit based on analysis
        // Note: For reproduction, 'failure' to pass validation means we successfully reproduced the bug.
        // But here we want to output info.
        
        app.quit();
        process.exit(0);

    } catch (error) {
        console.error('An error occurred:', error);
        app.quit();
        process.exit(1);
    }
});
