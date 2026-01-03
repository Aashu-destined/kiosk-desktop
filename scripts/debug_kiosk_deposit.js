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
    { id: 2, name: 'OD Account', type: 'Liability' }, 
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
    const { description } = params;

    const cashId = findAccount(accounts, ACC.CASH);
    const odId = findAccount(accounts, ACC.OD);
    const revenueId = findAccount(accounts, ACC.REVENUE);

    let entries = [];
    let groupDesc = description || '';

    const validateParams = () => {
        if (params.amount === undefined || params.total_settled === undefined) {
            throw new Error("Missing parameters: amount or total_settled");
        }
    };

    switch (scenario) {
        case 'KIOSK_DEPOSIT':
            // Logic from lines 152-174 of ScenarioLogic.ts
            // 1. Debit Cash with the Full Cash Received.
            // 2. Credit OD Account with the Settlement Amount.
            // 3. Credit Revenue with the Profit Amount.
            validateParams();
            const cashTakenKiosk = Number(params.amount);
            const deductedFromODKiosk = Number(params.total_settled);
            const profitKioskDep = cashTakenKiosk - deductedFromODKiosk;

            entries = [
                { account_id: cashId, type: 'DEBIT', amount: cashTakenKiosk, description: 'Cash Received' },
                { account_id: odId, type: 'CREDIT', amount: deductedFromODKiosk, description: 'Bank Settlement (Out)' },
            ];

            if (profitKioskDep > 0) {
                entries.push({ account_id: revenueId, type: 'CREDIT', amount: profitKioskDep, description: 'Service Revenue' });
            } else if (profitKioskDep < 0) {
                entries.push({ account_id: revenueId, type: 'DEBIT', amount: Math.abs(profitKioskDep), description: 'Service Loss' });
            }

            groupDesc = `Kiosk Deposit: ${cashTakenKiosk}`;
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

console.log("--- DEBUGGING KIOSK DEPOSIT ---");
console.log("Context: Examining undefined logic for Kiosk Deposits.");
console.log("Scenario: Customer gives 1000 Cash to Deposit. Settlement deducted from OD is 990. Profit is 10.");

const params = {
    amount: 1000,        // Cash received from customer
    total_settled: 990   // Amount deducted from OD (to send to customer's account presumably?)
};

try {
    const result = generateLedgerEntries('KIOSK_DEPOSIT', params, mockAccounts);

    console.log("\nGenerated Ledger Entries:");
    result.entries.forEach(entry => {
        const accountName = mockAccounts.find(a => a.id === entry.account_id).name;
        console.log(`- Account: ${accountName.padEnd(15)} | Type: ${entry.type.padEnd(6)} | Amount: ${entry.amount} | Desc: ${entry.description}`);
    });

    console.log("\n--- ANALYSIS ---");
    console.log("Physical Interpretation:");
    console.log(`1. Customer hands over ${params.amount} Cash. (Debit Cash)`);
    console.log(`2. Kiosk system (via OD) sends money to Customer's destination.`);
    console.log(`   Logic assumes OD is CREDITED (Money Out of OD)? Wait.`);
    
    // In code: { account_id: odId, type: 'CREDIT', ... }
    // Liability Credit = Increase in Liability (Bad). 
    // Asset Credit = Decrease in Asset (Money Out).
    // If OD is Liability: Credit means we owe MORE.
    // If OD is Asset (Negative balance usually): Credit means we used money.
    
    // Let's check the terminology in ScenarioLogic.ts again.
    // Line 46: User "Debit" (Money Out) -> Code/DB "CREDIT"
    // So 'CREDIT' to OD means Money LEAVING the OD account.
    
    console.log("   Code executes 'CREDIT' to OD Account. (Money Out / Liability Increase)");
    console.log(`   Amount: ${params.total_settled}`);
    
    const profit = params.amount - params.total_settled;
    console.log(`3. Profit: ${profit}. Credited to Revenue.`);

    console.log("\n--- ISSUE VERIFICATION ---");
    console.log("Does this exist in core_logic_live.md?");
    console.log("Rule 1.1 checks 'through kiyosk': Only 'Money withdrawn' is listed.");
    console.log("Rule 1.1 checks 'through phonepay': 'Money withdrawn' and 'Money deposit' are listed.");
    console.log("CONCLUSION: Kiosk Deposit is NOT defined in the business rules.");

} catch (e) {
    console.error(e);
}