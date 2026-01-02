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

// Seed Default Accounts if they don't exist
const seedAccounts = [
    { name: 'Cash', type: 'ASSET' },
    { name: 'OD Account', type: 'LIABILITY' },
    { name: 'Bank Account', type: 'ASSET' },
    { name: 'Revenue', type: 'REVENUE' },
    { name: 'Expenses', type: 'EXPENSE' }
];

const insertAccount = db.prepare('INSERT OR IGNORE INTO accounts (name, type) VALUES (@name, @type)');

const initTransaction = db.transaction(() => {
    for (const account of seedAccounts) {
        insertAccount.run(account);
    }
});

initTransaction();

console.log('Database initialized successfully at', dbPath);

export default db;