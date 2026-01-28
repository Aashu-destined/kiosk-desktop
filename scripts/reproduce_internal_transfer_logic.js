
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Path to the database
const dbPath = path.join(process.env.APPDATA || process.env.HOME + '/AppData/Roaming', 'kiosk-desktop', 'kiosk.db');

console.log(`Connecting to database at: ${dbPath}`);
const db = new Database(dbPath);

// 1. Check Account Types and Initial Balances
const odAccount = db.prepare("SELECT * FROM accounts WHERE slug = 'od_account'").get();
const cashAccount = db.prepare("SELECT * FROM accounts WHERE slug = 'cash'").get();

console.log('--- Initial State ---');
console.log('OD Account:', odAccount);
console.log('Cash Account:', cashAccount);

if (!odAccount || !cashAccount) {
    console.error('Accounts not found. Please run the app to seed the database.');
    process.exit(1);
}

// 2. Define Scenario Params (Simulate Internal Transfer OD -> Cash)
const AMOUNT = 50000; // 500.00
const scenario = 'INTERNAL_TRANSFER';
const params = {
    amount: AMOUNT,
    fromAccountId: odAccount.id,
    toAccountId: cashAccount.id,
    description: 'Test Transfer OD -> Cash'
};

// 3. Generate Ledger Entries (Simulated Logic from ScenarioLogic.ts)
// entries = [
//     { account_id: fromId, type: 'CREDIT', amount: transferAmount, description: 'Transfer Out' },
//     { account_id: toId, type: 'DEBIT', amount: transferAmount, description: 'Transfer In' }
// ];

const entries = [
    { account_id: odAccount.id, type: 'CREDIT', amount: AMOUNT, description: 'Transfer Out (Simulated)' },
    { account_id: cashAccount.id, type: 'DEBIT', amount: AMOUNT, description: 'Transfer In (Simulated)' }
];

console.log('--- Transaction Logic ---');
console.log('Scenario:', scenario);
console.log(`Transferring ${AMOUNT/100} FROM ${odAccount.name} (${odAccount.type}) TO ${cashAccount.name} (${cashAccount.type})`);
console.log('Entries:', entries);

// 4. Apply Transaction to DB (Simulating TransactionHandler)
const insertGroup = db.prepare(`
    INSERT INTO transaction_groups (scenario_type, date, description)
    VALUES (?, ?, ?)
`);

const insertTransaction = db.prepare(`
    INSERT INTO transactions (group_id, account_id, type, amount, description)
    VALUES (?, ?, ?, ?, ?)
`);

db.transaction(() => {
    const groupResult = insertGroup.run(scenario, new Date().toISOString(), params.description);
    const groupId = groupResult.lastInsertRowid;

    for (const entry of entries) {
        insertTransaction.run(groupId, entry.account_id, entry.type, entry.amount, entry.description);
    }
})();

// 5. Check Final Balances
const odAccountFinal = db.prepare("SELECT * FROM accounts WHERE id = ?").get(odAccount.id);
const cashAccountFinal = db.prepare("SELECT * FROM accounts WHERE id = ?").get(cashAccount.id);

console.log('--- Final State ---');
console.log('OD Account:', odAccountFinal);
console.log('Change:', (odAccountFinal.current_balance - odAccount.current_balance));

console.log('Cash Account:', cashAccountFinal);
console.log('Change:', (cashAccountFinal.current_balance - cashAccount.current_balance));

// 6. Verify User Report
// User says: Source (OD) Increases. Destination (Cash) Increases.
const sourceChange = odAccountFinal.current_balance - odAccount.current_balance;
const destChange = cashAccountFinal.current_balance - cashAccount.current_balance;

console.log('--- Verification ---');
console.log(`Source Change: ${sourceChange} (${sourceChange > 0 ? 'INCREASED' : 'DECREASED'})`);
console.log(`Destination Change: ${destChange} (${destChange > 0 ? 'INCREASED' : 'DECREASED'})`);

if (sourceChange > 0 && destChange > 0) {
    console.log('CONFIRMED: Both accounts increased.');
} else {
    console.log('DISPROVED: Results do not match user report.');
}
c