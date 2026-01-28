const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// --- 1. SETUP TEST ENVIRONMENT ---
console.log("=== REPRODUCING AUDIT-011 (Account Renaming Fragility) ===");

const TEST_DB_PATH = path.join(__dirname, 'reproduce_audit_011.db');
if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);

const db = new Database(TEST_DB_PATH);

// Load Schema
const schemaPath = path.join(__dirname, '../electron/db/schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);

// Seed Accounts (Initial State)
const seedAccounts = [
    { name: 'Cash', type: 'ASSET' },
    { name: 'OD Account', type: 'ASSET' }, // Changed to ASSET per previous fix
    { name: 'Bank Account', type: 'ASSET' },
    { name: 'Revenue', type: 'REVENUE' },
    { name: 'Expenses', type: 'EXPENSE' }
];

const insertAccount = db.prepare('INSERT INTO accounts (name, type) VALUES (@name, @type)');
seedAccounts.forEach(acc => insertAccount.run(acc));
console.log(`[INFO] Seeded default accounts: Cash, OD Account, etc.`);

// --- 2. SIMULATE USER ACTION: RENAMING 'Cash' ---
console.log(`[ACTION] User renames 'Cash' to 'My Register 1'...`);
db.prepare('UPDATE accounts SET name = ? WHERE name = ?').run('My Register 1', 'Cash');

// Verify renaming
const renamedAccount = db.prepare('SELECT * FROM accounts WHERE name = ?').get('My Register 1');
if (renamedAccount) {
    console.log(`[INFO] Account successfully renamed in DB to: ${renamedAccount.name}`);
} else {
    console.error(`[ERROR] Failed to rename account.`);
    process.exit(1);
}

// --- 3. EXECUTE LOGIC (Simulating ScenarioLogic.ts) ---

// Mocking the core logic from src/engines/ScenarioLogic.ts
// The issue is that the code looks for specific hardcoded strings.

const ACC = {
    CASH: 'Cash',
    OD: 'OD Account',
    BANK: 'Bank Account',
    REVENUE: 'Revenue',
    EXPENSE: 'Expenses'
};

const accounts = db.prepare('SELECT * FROM accounts').all();

const findAccount = (accountsList, type) => {
    // Logic from ScenarioLogic.ts:
    // const account = accounts.find(a => a.name === type) || accounts.find(a => a.type === type);
    
    console.log(`[LOGIC] Looking for account with name: '${type}'...`);
    
    // Exact match first, then by type (but type usually doesn't match the name string 'Cash' != 'ASSET')
    const account = accountsList.find(a => a.name === type) || accountsList.find(a => a.type === type);
    
    if (!account) {
        throw new Error(`Account '${type}' not found`);
    }
    return account.id;
};

try {
    console.log(`[TEST] Attempting to generate ledger entries for 'KIOSK_WITHDRAWAL_ON_US'...`);
    
    // Scenario requires Cash and OD
    const cashId = findAccount(accounts, ACC.CASH);
    const odId = findAccount(accounts, ACC.OD);
    
    console.log(`[SUCCESS] Found Cash ID: ${cashId}, OD ID: ${odId}`);
    console.log("=== TEST FAILED (Issue NOT Reproduced) ===");

} catch (error) {
    console.log(`[EXPECTED ERROR] ${error.message}`);
    console.log("=== TEST PASSED (Issue Reproduced: Logic broke after renaming) ===");
}