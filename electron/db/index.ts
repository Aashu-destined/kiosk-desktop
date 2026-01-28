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
    console.error('Migration failed:', error);
    // Ensure we don't proceed with invalid schema
    throw error;
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