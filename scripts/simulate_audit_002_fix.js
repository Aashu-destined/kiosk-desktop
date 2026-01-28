// Mocking the behavior with the proposed fix (OD = ASSET)

const ACCOUNTS = [
    { id: 1, name: 'Cash', type: 'ASSET', balance: 10000 },
    { id: 2, name: 'OD Account', type: 'ASSET', balance: 0 }, // CHANGED FROM LIABILITY TO ASSET
    { id: 3, name: 'Bank Account', type: 'ASSET', balance: 5000 },
    { id: 4, name: 'Revenue', type: 'REVENUE', balance: 0 },
];

const updateBalance = (account, type, amount) => {
    let change = 0;
    // Logic from schema.sql
    if (type === 'DEBIT' && ['ASSET', 'EXPENSE'].includes(account.type)) {
        change = amount; // Increase
    } else if (type === 'CREDIT' && ['ASSET', 'EXPENSE'].includes(account.type)) {
        change = -amount; // Decrease
    } else if (type === 'CREDIT' && ['LIABILITY', 'EQUITY', 'REVENUE'].includes(account.type)) {
        change = amount; // Increase
    } else if (type === 'DEBIT' && ['LIABILITY', 'EQUITY', 'REVENUE'].includes(account.type)) {
        change = -amount; // Decrease
    }
    
    account.balance += change;
    return change;
};

// Scenario Logic (from src/engines/ScenarioLogic.ts)
const runScenario = () => {
    console.log("--- SIMULATION WITH FIX: OD ACCOUNT AS ASSET ---");
    console.log("Initial State:", ACCOUNTS.map(a => `${a.name} (${a.type}): ${a.balance}`));

    const amountOnUs = 1000;
    const odId = 2;
    const cashId = 1;

    // Logic from ScenarioLogic.ts (Unchanged)
    const entries = [
        { account_id: odId, type: 'DEBIT', amount: amountOnUs, description: `Bank Settlement (In) - On-us` },
        { account_id: cashId, type: 'CREDIT', amount: amountOnUs, description: 'Cash Disbursement' },
    ];

    console.log("\nGenerated Entries:");
    entries.forEach(e => console.log(`- ${e.type} ${e.amount} to Account ${e.account_id}`));

    console.log("\nApplying to Database (Mock)...");
    entries.forEach(e => {
        const acc = ACCOUNTS.find(a => a.id === e.account_id);
        const change = updateBalance(acc, e.type, e.amount);
        console.log(`  > Applied ${e.type} to ${acc.name}. Balance Change: ${change > 0 ? '+' : ''}${change}. New Balance: ${acc.balance}`);
    });

    console.log("\nFinal State:", ACCOUNTS.map(a => `${a.name} (${a.type}): ${a.balance}`));

    const odAcc = ACCOUNTS.find(a => a.id === odId);
    if (odAcc.balance === 1000) {
        console.log("\n[SUCCESS] OD Account Balance Increased to 1000.");
        console.log("This matches the expected behavior for 'Funds Received'.");
    } else {
        console.log(`\n[FAIL] OD Account Balance is ${odAcc.balance}. Expected 1000.`);
    }
};

runScenario();