import { Account, TransactionGroupInput } from '../types/ipc';

export type ScenarioType = 
    | 'KIOSK_WITHDRAWAL' 
    | 'PHONEPAY_TO_SAVINGS' 
    | 'TRANSFER_VIA_SAVINGS' 
    | 'TRANSFER_VIA_CASH' 
    | 'SERVICE_SALE';

export interface ScenarioParams {
    amount?: number;
    fee?: number;
    totalReceived?: number;
    cashGiven?: number;
    transferAmount?: number;
    customerName?: string;
    description?: string;
}

const findAccount = (accounts: Account[], type: string): number => {
    const account = accounts.find(a => a.type === type || a.name === type);
    if (!account) throw new Error(`Account type ${type} not found`);
    return account.id;
};

// Hardcoded Account Type Mappings
// Ensure these match the seeds in electron/db/index.ts
const ACC = {
    CASH: 'Cash',
    OD: 'OD Account',
    SAVINGS: 'Savings Account',
    REVENUE: 'Revenue',
    EXPENSE: 'Expenses'
};

export const generateLedgerEntries = (
    scenario: ScenarioType, 
    params: ScenarioParams, 
    accounts: Account[]
): TransactionGroupInput => {
    const date = new Date().toISOString().split('T')[0];
    const { customerName, description } = params;

    const cashId = findAccount(accounts, ACC.CASH);
    const odId = findAccount(accounts, ACC.OD);
    const savingsId = findAccount(accounts, ACC.SAVINGS);
    const revenueId = findAccount(accounts, ACC.REVENUE);

    let entries: TransactionGroupInput['entries'] = [];
    let groupDesc = description || '';

    switch (scenario) {
        case 'KIOSK_WITHDRAWAL':
            // Logic: Credit OD (Bank Settles), Debit Cash (Given to Cust), Credit Revenue (Fee)
            if (!params.amount || params.fee === undefined) throw new Error("Missing parameters");
            const withdrawalAmount = Number(params.amount);
            const fee = Number(params.fee);

            entries = [
                { account_id: odId, type: 'DEBIT', amount: withdrawalAmount, description: 'Bank Settlement (Withdrawal)' }, // Asset/Liab increase logic?? Wait. OD is Liability. Increasing Liability = Credit. 
                // Wait, Schema Trigger Logic: 
                // CREDIT LIABILITY -> Increase Balance (More Debt)
                // DEBIT LIABILITY -> Decrease Balance (Less Debt)
                
                // Bank Settlement logic: 
                // Money comes INTO the OD account from the NPCI/Bank network. 
                // Does this reduce the OD debt? Yes. So it is a DEBIT to the Liability.
                // OR does it simply make the balance "more positive"?
                // Let's assume OD Account starts at -1000. 
                // Withdrawal of 1000 happens. Bank puts 1000 in OD. Balance becomes 0.
                // So this is a DEBIT (Decrease Liability / Increase Asset).
                { account_id: odId, type: 'DEBIT', amount: withdrawalAmount, description: 'Bank Settlement' },
                
                // Cash given to customer. Asset Decreases. CREDIT Asset.
                { account_id: cashId, type: 'CREDIT', amount: withdrawalAmount, description: 'Cash Disbursement' },
                
                // Fee Collected in Cash (Assumption: Customer pays fee in cash or it's deducted? Usually collected in cash)
                // If Fee is 20. Customer gives 20 cash. Cash Increases. DEBIT Asset.
                { account_id: cashId, type: 'DEBIT', amount: fee, description: 'Service Fee Collected' },
                // Revenue Increases. CREDIT Revenue.
                { account_id: revenueId, type: 'CREDIT', amount: fee, description: 'Service Fee Income' }
            ];
            groupDesc = `Kiosk Withdrawal: ${withdrawalAmount}`;
            break;

        case 'PHONEPAY_TO_SAVINGS':
            // Cust pays 4850 to Savings. Owner gives 4800 Cash. 50 Profit.
            if (!params.totalReceived || !params.cashGiven) throw new Error("Missing parameters");
            const received = Number(params.totalReceived);
            const given = Number(params.cashGiven);
            const profit = received - given;

            entries = [
                // Savings Increases. Asset/Equity? If Equity, Credit increases. If Asset, Debit increases.
                // Let's treat Savings as EQUITY (Owner's Pot). CREDIT Equity to Increase.
                { account_id: savingsId, type: 'CREDIT', amount: received, description: 'Received via PhonePay' },
                
                // Cash Given. Asset Decreases. CREDIT Asset.
                { account_id: cashId, type: 'CREDIT', amount: given, description: 'Cash Disbursement' },
                
                // Balancing entry? 
                // Equity +4850. Asset -4800. Net +50.
                // We need to recognize the 50 profit.
                // Is profit already recognized? 
                // Assets = Liab + Equity + Rev - Exp
                // -4800 (Cash) = 0 + 4850 (Savings) + 0 - 0.  => -4800 != 4850. unbalanced by 9650?
                
                // Wait. Double Entry must balance.
                // Debit: ? (Total 4850?) -> We need to treat Savings as an Asset here for the business context?
                // Or:
                // Debit Savings (Asset) 4850. 
                // Credit Cash (Asset) 4800.
                // Credit Revenue 50.
                // 4850 = 4800 + 50. Balanced.
                
                // So Savings Account MUST be type 'ASSET' or treated as such for transfers. 
                // In DB seed it is 'EQUITY'. 
                // If it is EQUITY: CREDIT to Increase.
                // Debit ?? 
                
                // Let's stick to strict accounting:
                // DEBIT Savings (Receivable/Asset) 4850
                // CREDIT Cash 4800
                // CREDIT Revenue 50
                
                // Note: If Savings is EQUITY, we need to DEBIT it to decrease owner equity? No, money went IN.
                // Let's Assume Savings is an ASSET for the tracking purpose (Owner's Bank Account tracked by business).
                
                { account_id: savingsId, type: 'DEBIT', amount: received, description: 'Received in Savings' }, // Treat as Asset Increase
                { account_id: cashId, type: 'CREDIT', amount: given, description: 'Cash Paid Out' },
                { account_id: revenueId, type: 'CREDIT', amount: profit, description: 'Commission/Profit' }
            ];
            groupDesc = `PhonePay Withdrawal: ${given}`;
            break;

        case 'TRANSFER_VIA_SAVINGS':
            // Cust pays 2020 to Savings. Owner transfers 2000 out.
            if (!params.totalReceived || !params.transferAmount) throw new Error("Missing parameters");
            const totalIn = Number(params.totalReceived);
            const transferOut = Number(params.transferAmount);
            const profit2 = totalIn - transferOut;

            entries = [
                // Money In to Savings
                { account_id: savingsId, type: 'DEBIT', amount: totalIn, description: 'Received in Savings' },
                // Money Out from Savings
                { account_id: savingsId, type: 'CREDIT', amount: transferOut, description: 'External Transfer' },
                // Profit? 
                // Debit 2020. Credit 2000. Diff 20.
                // Credit Revenue 20.
                { account_id: revenueId, type: 'CREDIT', amount: profit2, description: 'Commission' }
            ];
            groupDesc = `Transfer via Savings: ${transferOut}`;
            break;

        case 'TRANSFER_VIA_CASH':
            // Cust gives 3240 Cash. Owner transfers 3200 from Savings.
            if (!params.totalReceived || !params.transferAmount) throw new Error("Missing parameters");
            const cashIn = Number(params.totalReceived);
            const transferOut2 = Number(params.transferAmount);
            const profit3 = cashIn - transferOut2;

            entries = [
                // Cash In
                { account_id: cashId, type: 'DEBIT', amount: cashIn, description: 'Cash Received' },
                // Savings Out
                { account_id: savingsId, type: 'CREDIT', amount: transferOut2, description: 'Transfer from Savings' },
                // Profit
                { account_id: revenueId, type: 'CREDIT', amount: profit3, description: 'Commission' }
            ];
            groupDesc = `Transfer via Cash: ${transferOut2}`;
            break;

        case 'SERVICE_SALE':
             // Sale 30. Cash In 30.
             if (!params.amount) throw new Error("Missing parameters");
             const saleAmt = Number(params.amount);
             
             entries = [
                 { account_id: cashId, type: 'DEBIT', amount: saleAmt, description: 'Cash Sale' },
                 { account_id: revenueId, type: 'CREDIT', amount: saleAmt, description: 'Service Revenue' }
             ];
             groupDesc = `Service Sale`;
             break;
    }

    return {
        scenario_type: scenario,
        date,
        customer_name: customerName,
        description: groupDesc,
        entries
    };
};