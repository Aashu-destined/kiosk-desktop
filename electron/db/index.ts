import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
// @ts-ignore
import schema from './schema.sql?raw';

const dbPath = path.join(app.getPath('userData'), 'kiosk.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Execute Schema
db.exec(schema);

// Migration: Add slug column if it doesn't exist (for existing DBs)
try {
    const tableInfo = db.prepare("PRAGMA table_info(accounts)").all() as any[];
    const hasSlug = tableInfo.some(col => col.name === 'slug');
    if (!hasSlug) {
        db.exec('ALTER TABLE accounts ADD COLUMN slug TEXT');
        db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_slug ON accounts(slug)');
        console.log('Added slug column to accounts table');
    }
} catch (error) {
    console.error('Migration (slug) failed:', error);
    throw error;
}

// Migration AUDIT-101: Convert REAL to INTEGER (cents/paise)
try {
    const dbVersion = db.prepare("SELECT value FROM settings WHERE key = 'db_version'").get() as { value: string } | undefined;
    
    if (!dbVersion || parseInt(dbVersion.value) < 2) {
        console.log('Migrating database to integer-based financial calculations...');
        
        db.transaction(() => {
            // Update accounts
            db.prepare("UPDATE accounts SET current_balance = CAST(ROUND(current_balance * 100) AS INTEGER)").run();
            
            // Update transactions
            db.prepare("UPDATE transactions SET amount = CAST(ROUND(amount * 100) AS INTEGER)").run();
            
            // Update daily_records
            db.prepare("UPDATE daily_records SET cash_opening = CAST(ROUND(cash_opening * 100) AS INTEGER)").run();
            db.prepare("UPDATE daily_records SET cash_closing_calculated = CAST(ROUND(cash_closing_calculated * 100) AS INTEGER) WHERE cash_closing_calculated IS NOT NULL").run();
            db.prepare("UPDATE daily_records SET cash_physical_count = CAST(ROUND(cash_physical_count * 100) AS INTEGER) WHERE cash_physical_count IS NOT NULL").run();
            db.prepare("UPDATE daily_records SET difference = CAST(ROUND(difference * 100) AS INTEGER) WHERE difference IS NOT NULL").run();
            
            // Set/Update version
            db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('db_version', '2')").run();
        })();
        
        console.log('Database migration to integer successful.');
    }
} catch (error) {
    console.error('Migration (AUDIT-101) failed:', error);
    // We don't throw here to allow seed logic to run, but in a real app we might
}

// Seed Default Accounts if they don't exist
const seedAccounts = [
    { name: 'Cash', slug: 'cash', type: 'ASSET' },
    { name: 'OD Account', slug: 'od_account', type: 'ASSET' },
    { name: 'Bank Account', slug: 'bank_account', type: 'ASSET' },
    { name: 'Revenue', slug: 'revenue', type: 'REVENUE' },
    { name: 'Expenses', slug: 'expenses', type: 'EXPENSE' }
];

const insertAccount = db.prepare('INSERT OR IGNORE INTO accounts (name, slug, type) VALUES (@name, @slug, @type)');
const updateSlug = db.prepare('UPDATE accounts SET slug = @slug WHERE name = @name AND slug IS NULL');

const initTransaction = db.transaction(() => {
    for (const account of seedAccounts) {
        insertAccount.run(account);
        // Backfill slug for existing accounts if they match the name
        updateSlug.run(account);
    }
});

initTransaction();

console.log('Database initialized successfully at', dbPath);

export default db;