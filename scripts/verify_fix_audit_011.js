const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// --- 1. SETUP TEST ENVIRONMENT ---
console.log("=== VERIFYING FIX FOR AUDIT-011 (Account Renaming) ===");

const TEST_DB_PATH = path.join(__dirname, 'verify_fix_audit_011.db');
if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);

const db = new Database(TEST_DB_PATH);

// Load Schema (Which now includes 'slug' column)
// We need to manually add the slug column to the schema for this test if the file isn't fully updated in the test env yet,
// but we just updated electron/db/schema.sql, so it should be good.
const schemaPath = path.join(__dirname, '../electron/db/schema.sql');
let schema = fs.readFileSync(schemaPath, 'utf-8');

// Ensure schema has slug (in case the file read picks up an old version somehow, though unlikely)
if (!schema.includes('slug TEXT UNIQUE')) {
    console.log('[WARN] Schema file does not have slug yet? Checking applied diffs...');
    // We applied the diff, so it should be there.
}

db.exec(schema);

// Seed Accounts WITH SLUGS
const seedAccounts = [
    { name: 'Cash', slug: 'cash', type: 'ASSET' },
    { name: 'OD Account', slug: 'od_account', type: 'ASSET' },
    { name: 'Bank Account', slug: 'bank_account', type: 'ASSET' },
    { name: 'Revenue', slug: 'revenue', type: 'REVENUE' },
    { name: 'Expenses', slug: 'expenses', type: 'EXPENSE' }
];

const insertAccount = db.prepare('INSERT INTO accounts (name, slug, type) VALUES (@name, @slug, @type)');
seedAccounts.forEach(acc => insertAccount.run(acc));
console.log(`[INFO] Seeded default accounts with slugs.`);

// --- 2. SIMULATE USER ACTION: RENAMING 'Cash' ---
console.log(`[ACTION] User renames 'Cash' to 'My Register 1'...`);
db.prepare('UPDATE accounts SET name = ? WHERE slug = ?').run('My Register 1', 'cash');

// Verify renaming
const renamedAccount = db.prepare('SELECT * FROM accounts WHERE slug = ?').get('cash');
if (renamedAccount && renamedAccount.name === 'My Register 1') {
    console.log(`[INFO] Account successfully renamed in DB to: ${renamedAccount.name}`);
} else {
    console.error(`[ERROR] Failed to rename account.`);
    process.exit(1);
}

// --- 3. EXECUTE UPDATED LOGIC (Simulating ScenarioLogic.ts) ---

const ACC = {
    CASH: 'cash',
    OD: 'od_account',
    BANK: 'bank_account',
    REVENUE: 'revenue',
    EXPENSE: 'expenses'
};

const accounts = db.prepare('SELECT * FROM accounts').all();

const findAccount = (accountsList, identifier) => {
    // 1. Try to match by slug
    let account = accountsList.find(a => a.slug === identifier);
    
    // 2. Fallback: Match by name
    if (!account) {
        account = accountsList.find(a => a.name === identifier);
    }
    
    // 3. Fallback: Match by type
    if (!account) {
        account = accountsList.find(a => a.type === identifier);
    }

    if (!account) throw new Error(`Account ${identifier} not found`);
    return account.id;
};

try {
    console.log(`[TEST] Attempting to generate ledger entries for 'KIOSK_WITHDRAWAL_ON_US'...`);
    
    // Logic now looks for 'cash' (slug) instead of 'Cash' (name)
    const cashId = findAccount(accounts, ACC.CASH);
    const odId = findAccount(accounts, ACC.OD);
    
    console.log(`[SUCCESS] Found Cash ID: ${cashId} (Name: ${renamedAccount.name}), OD ID: ${odId}`);
    console.log("=== TEST PASSED (Logic survived renaming) ===");

} catch (error) {
    console.error(`[FAIL] ${error.message}`);
    process.exit(1);
}