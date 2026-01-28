const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('Reproducing AUDIT-001: Reconciliation Handler Schema Mismatch');

const dbPath = path.join(__dirname, 'reproduce_audit_001.db');

try {
    // 1. Setup clean DB
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
    }
    const db = new Database(dbPath);

    // 2. Apply Schema (Subset relevant to issue)
    // Using the schema exactly as defined in electron/db/schema.sql for the relevant tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            type TEXT NOT NULL, -- 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'
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
            type TEXT NOT NULL, -- 'DEBIT' or 'CREDIT'
            amount REAL NOT NULL,
            description TEXT,
            timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );
    `);

    // 3. Seed Data
    db.prepare("INSERT INTO accounts (name, type) VALUES ('Cash', 'ASSET')").run();
    const accountId = 1;
    
    // 4. Attempt the faulty query from reconciliationHandler.ts
    // The handler uses: AND (source_account_id = ? OR destination_account_id = ?)
    
    console.log('Attempting to execute the faulty query from electron/handlers/reconciliationHandler.ts...');
    
    const startTimestamp = 0;
    const targetAccountId = accountId;

    // This corresponds to lines 68-72 in reconciliationHandler.ts
    const stmt = db.prepare(`
        SELECT * FROM transactions 
        WHERE timestamp >= ? 
        AND (source_account_id = ? OR destination_account_id = ?)
    `);
    
    const results = stmt.all(startTimestamp, targetAccountId, targetAccountId);

    console.log('ERROR: Query succeeded unexpectedly! The bug is NOT reproduced.');

} catch (error) {
    if (error.message.includes('no such column: source_account_id')) {
        console.log('SUCCESS: Bug reproduced!');
        console.log('Caught expected error:', error.message);
    } else {
        console.log('FAILED: Caught unexpected error:', error);
    }
} finally {
    // Cleanup
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
    }
}