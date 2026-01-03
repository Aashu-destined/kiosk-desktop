const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// --- 1. SETUP TEST ENVIRONMENT ---

console.log("=== STARTING INTEGRATION TEST ===");

const TEST_DB_PATH = path.join(__dirname, 'integration_test.db');
if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);

const db = new Database(TEST_DB_PATH);
console.log(`[INFO] Created test database at ${TEST_DB_PATH}`);

// Load Schema
const schemaPath = path.join(__dirname, '../electron/db/schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);
console.log(`[INFO] Schema applied.`);

// Seed Accounts
const seedAccounts = [
    { name: 'Cash', type: 'ASSET' },
    { name: 'OD Account', type: 'LIABILITY' },
    { name: 'Bank Account', type: 'ASSET' },
    { name: 'Revenue', type: 'REVENUE' },
    { name: 'Expenses', type: 'EXPENSE' }
];

const insertAccount = db.prepare('INSERT INTO accounts (name, type) VALUES (@name, @type)');
seedAccounts.forEach(acc => insertAccount.run(acc));
console.log(`[INFO] Seeded ${seedAccounts.length} accounts.`);


// --- 2. LOGIC MOCKS (Replicating ScenarioLogic.ts + transactionHandler.ts) ---

const ACC = {
    CASH: 'Cash',
    OD: 'OD Account',
    BANK: 'Bank Account',
    REVENUE: 'Revenue',
    EXPENSE: 'Expenses'
};

const findAccount = (accounts, name) => {
    return accounts.find(a => a.name === name).id;
};

// Replicating generateLedgerEntries for KIOSK_WITHDRAWAL_OFF_US
const generateEntries = (params, accounts) => {
    // We assume accounts is a list of {id, name, type}
    const cashId = findAccount(accounts, ACC.CASH);
    const odId = findAccount(accounts, ACC.OD);
    const revenueId = findAccount(accounts, ACC.REVENUE);

    const settledOffUs = Number(params.total_settled);
    const cashGivenOffUs = Number(params.amount);
    const profitOffUs = settledOffUs - cashGivenOffUs;

    const entries = [
        { account_id: odId, type: 'DEBIT', amount: settledOffUs }, // OD Asset Increases
        { account_id: cashId, type: 'CREDIT', amount: cashGivenOffUs }, // Cash Asset Decreases
    ];

    if (profitOffUs > 0) {
        entries.push({ account_id: revenueId, type: 'CREDIT', amount: profitOffUs });
    } else if (profitOffUs < 0) {
        entries.push({ account_id: revenueId, type: 'DEBIT', amount: Math.abs(profitOffUs) });
    }

    return entries;
};

const saveTransactionGroup = (scenario, entries) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const insertGroup = db.prepare(`
        INSERT INTO transaction_groups (scenario_type, date, timestamp) VALUES (?, ?, ?)
    `);
    
    const insertTrans = db.prepare(`
        INSERT INTO transactions (group_id, account_id, type, amount, timestamp)
        VALUES (?, ?, ?, ?, ?)
    `);

    const date = new Date().toISOString().split('T')[0];

    const txn = db.transaction(() => {
        const info = insertGroup.run(scenario, date, timestamp);
        const groupId = info.lastInsertRowid;
        
        entries.forEach(e => {
            insertTrans.run(groupId, e.account_id, e.type, e.amount, timestamp);
        });
        return groupId;
    });

    return txn();
};

// --- 3. RUN TEST SCENARIO ---

// Step A: Get Initial Balances
const getBalance = (name) => {
    const row = db.prepare('SELECT current_balance FROM accounts WHERE name = ?').get(name);
    return row ? row.current_balance : 0;
};

const initialCash = getBalance(ACC.CASH);
const initialOD = getBalance(ACC.OD);
const initialRevenue = getBalance(ACC.REVENUE);

console.log(`[PRE-TEST] Cash: ${initialCash}, OD: ${initialOD}, Revenue: ${initialRevenue}`);

// Step B: Execute Logic (Kiosk Withdrawal Off-Us)
// Customer withdraws 1000. Settlement is 1010. Profit 10.
const params = { amount: 1000, total_settled: 1010 };
const allAccounts = db.prepare('SELECT * FROM accounts').all();
const entries = generateEntries(params, allAccounts);

console.log(`[ACTION] Running KIOSK_WITHDRAWAL_OFF_US with Amount: 1000, Settled: 1010`);
saveTransactionGroup('KIOSK_WITHDRAWAL_OFF_US', entries);

// Step C: Verify Final Balances
const finalCash = getBalance(ACC.CASH);
const finalOD = getBalance(ACC.OD);
const finalRevenue = getBalance(ACC.REVENUE);

console.log(`[POST-TEST] Cash: ${finalCash}, OD: ${finalOD}, Revenue: ${finalRevenue}`);

// --- 4. ASSERTIONS ---

let passed = true;

// 1. Cash should decrease by 1000 (Asset Credit)
if (finalCash !== initialCash - 1000) {
    console.error(`[FAIL] Cash Balance mismatch. Expected ${initialCash - 1000}, got ${finalCash}`);
    passed = false;
}

// 2. OD should increase by 1010 (Liability Debit -> Wait, OD is usually Liability, but code treats as Asset/Bank in this context? 
// Let's check schema/seed. Seed says 'LIABILITY'.
// Trigger logic:
// NEW.type = 'DEBIT' AND type IN ('LIABILITY', ...) THEN current_balance - NEW.amount
// NEW.type = 'CREDIT' AND type IN ('LIABILITY', ...) THEN current_balance + NEW.amount
// 
// Logic in generateEntries: OD DEBIT 1010.
// If OD is LIABILITY, DEBIT means DECREASE in liability (paying it off).
// If OD is ASSET (Positive balance means we have money), DEBIT means INCREASE.
//
// In this specific domain (Kiosk), "OD Account" often functions as a settlement wallet. 
// If it's seeded as LIABILITY, then a DEBIT of 1010 means we owe 1010 LESS (or have 1010 MORE).
// Ideally, money coming IN (Settlement) should be a DEBIT to a BANK/WALLET asset, or DEBIT to LIABILITY (reducing debt).
// 
// Let's check the assertion based on the DB Trigger logic for LIABILITY:
// Start 0. Debit 1010. End should be -1010.
if (finalOD !== initialOD - 1010) {
     // NOTE: This highlights a potential confusion in the project: Is "OD Account" a Liability or an Asset in the user's mind?
     // If the user treats it as "My Settlement Wallet", it behaves like an Asset. 
     // But the seed says 'LIABILITY'.
     // Let's assume the DB Trigger logic is correct for now.
    console.error(`[FAIL] OD Balance mismatch. Expected ${initialOD - 1010}, got ${finalOD}`);
    passed = false;
}

// 3. Revenue should increase by 10 (Revenue Credit)
// Trigger: CREDIT Revenue -> Increase.
if (finalRevenue !== initialRevenue + 10) {
    console.error(`[FAIL] Revenue Balance mismatch. Expected ${initialRevenue + 10}, got ${finalRevenue}`);
    passed = false;
}

if (passed) {
    console.log("=== TEST PASSED ===");
    process.exit(0);
} else {
    console.log("=== TEST FAILED ===");
    process.exit(1);
}