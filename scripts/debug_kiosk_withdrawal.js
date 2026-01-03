const fs = require('fs');
const path = require('path');

// --- Mocking the Environment ---

// Mock Accounts
const ACC = {
    CASH: 'Cash',
    OD: 'OD Account',
    BANK: 'Bank Account',
    REVENUE: 'Revenue',
    EXPENSE: 'Expenses'
};

const mockAccounts = [
    { id: 1, name: 'Cash', type: 'Asset' },
    { id: 2, name: 'OD Account', type: 'Liability' }, // Or Asset, depending on setup
    { id: 3, name: 'Bank Account', type: 'Asset' },
    { id: 4, name: 'Revenue', type: 'Revenue' },
    { id: 5, name: 'Expenses', type: 'Expense' }
];

const findAccount = (accounts, type) => {
    const account = accounts.find(a => a.name === type);
    if (!account) throw new Error(`Account ${type} not found`);
    return account.id;
};

// --- The Logic Under Test (Ported from src/engines/ScenarioLogic.ts) ---

const generateLedgerEntries = (scenario, params, accounts) => {
    const date = new Date().toISOString().split('T')[0];
    const { customerName, description } = params;

    const cashId = findAccount(accounts, ACC.CASH);
    const odId = findAccount(accounts, ACC.OD);
    const bankId = findAccount(accounts, ACC.BANK);
    const revenueId = findAccount(accounts, ACC.REVENUE);

    let entries = [];
    let groupDesc = description || '';

    const validateParams = () => {
        if (params.amount === undefined || params.total_settled === undefined) {
            throw new Error("Missing parameters: amount or total_settled");
        }
    };

    switch (scenario) {
        case 'KIOSK_WITHDRAWAL_OFF_US':
            // Logic from lines 96-150 of ScenarioLogic.ts
            validateParams();
            const settledOffUs = Number(params.total_settled);
            const cashGivenOffUs = Number(params.amount);
            const profitOffUs = settledOffUs - cashGivenOffUs;

            entries = [
                { account_id: odId, type: 'DEBIT', amount: settledOffUs, description: `Bank Settlement (In) - Off-us` },
                { account_id: cashId, type: 'CREDIT', amount: cashGivenOffUs, description: 'Cash Out to Customer' }, 
            ];

            if (profitOffUs > 0) {
                entries.push({ account_id: revenueId, type: 'CREDIT', amount: profitOffUs, description: 'Service Revenue' });
            } else if (profitOffUs < 0) {
                entries.push({ account_id: revenueId, type: 'DEBIT', amount: Math.abs(profitOffUs), description: 'Service Loss' });
            }

            groupDesc = `Kiosk Withdrawal (Off-us): ${cashGivenOffUs}`;
            break;
            
        default:
            console.log("Scenario not implemented in debug script");
    }

    return {
        scenario_type: scenario,
        entries
    };
};

// --- Execution ---

console.log("--- DEBUGGING KIOSK WITHDRAWAL (OFF-US) ---");
console.log("Scenario: Customer withdraws 1000 Cash. Settlement to OD is 1010. Profit is 10.");

const params = {
    amount: 1000,
    total_settled: 1010
};

const result = generateLedgerEntries('KIOSK_WITHDRAWAL_OFF_US', params, mockAccounts);

console.log("\nGenerated Ledger Entries:");
result.entries.forEach(entry => {
    const accountName = mockAccounts.find(a => a.id === entry.account_id).name;
    console.log(`- Account: ${accountName.padEnd(15)} | Type: ${entry.type.padEnd(6)} | Amount: ${entry.amount}`);
});

console.log("\n--- ANALYSIS ---");
const revenueEntry = result.entries.find(e => e.account_id === findAccount(mockAccounts, ACC.REVENUE));
const cashEntry = result.entries.find(e => e.account_id === findAccount(mockAccounts, ACC.CASH) && e.type === 'DEBIT'); // Looking for Cash Debit (Increase)

console.log(`Profit Amount: ${params.total_settled - params.amount}`);
console.log(`Logic credits Profit to: ${revenueEntry ? 'Revenue (Correct for Code)' : 'Unknown'}`);

if (!cashEntry && revenueEntry) {
    console.log("\n[!] CONFLICT DETECTED:");
    console.log("    Rule says: 'difference amount will be credited to cash account' (Money In -> Cash)");
    console.log("    Code does: Credits Revenue.");
    console.log("    Result: The profit of 10 never hits the Cash account.");
} else {
    console.log("\n[?] No conflict? Check logic.");
}