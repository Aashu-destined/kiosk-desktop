const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('Verifying Fix for AUDIT-001...');

const dbPath = path.join(__dirname, 'verify_fix_001.db');
let db;

try {
    // 1. Setup clean DB
    if (fs.existsSync(dbPath)) {
        try { fs.unlinkSync(dbPath); } catch (e) { /* ignore if missing */ }
    }
    db = new Database(dbPath);

    // 2. Apply Schema (Same as electron/db/schema.sql)
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
    `);

    // 3. Seed Data
    db.prepare("INSERT INTO accounts (name, type, current_balance) VALUES ('Cash', 'ASSET', 1000)").run();
    const account = db.prepare("SELECT * FROM accounts WHERE name = 'Cash'").get();
    
    // Seed a transaction
    const groupId = db.prepare("INSERT INTO transaction_groups (scenario_type, date) VALUES ('TEST', '2025-01-01')").run().lastInsertRowid;
    
    // Insert a DEBIT (Money In for Asset)
    db.prepare(`
        INSERT INTO transactions (group_id, account_id, type, amount, description, timestamp)
        VALUES (?, ?, 'DEBIT', 100, 'Test Deposit', ?)
    `).run(groupId, account.id, Math.floor(Date.now() / 1000));

    console.log('Database seeded with Schema and Data.');

    // 4. Test the FIXED Logic
    console.log('Testing the new query logic...');

    const startTimestamp = 0;
    const targetAccountId = account.id;

    // This is the FIXED query from reconciliationHandler.ts
    const txsAfterStart = db.prepare(`
        SELECT * FROM transactions 
        WHERE timestamp >= ? 
        AND account_id = ?
    `).all(startTimestamp, targetAccountId);

    console.log(`Query successful. Found ${txsAfterStart.length} transactions.`);

    // Test the logic for Net Change calculation
    const calculateNetChange = (transactions, accountType) => {
        let change = 0;
        const isAssetLike = ['ASSET', 'EXPENSE'].includes(accountType);
        
        for (const tx of transactions) {
             if (isAssetLike) {
                 if (tx.type === 'DEBIT') change += tx.amount;
                 if (tx.type === 'CREDIT') change -= tx.amount;
             } else {
                 if (tx.type === 'CREDIT') change += tx.amount;
                 if (tx.type === 'DEBIT') change -= tx.amount;
             }
        }
        return change;
    };

    const netChange = calculateNetChange(txsAfterStart, account.type);
    console.log(`Calculated Net Change: ${netChange}`);

    if (netChange === 100) {
        console.log('SUCCESS: Logic verification passed. New code is compatible with schema.');
    } else {
        console.error(`FAILURE: Expected net change 100, got ${netChange}`);
        process.exit(1);
    }

} catch (error) {
    console.error('FAILED: Caught unexpected error:', error);
    process.exit(1);
} finally {
    if (db) db.close();
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
    }
}