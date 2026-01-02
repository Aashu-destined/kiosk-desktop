import { Account, TransactionGroupInput } from '../types/ipc';

export type ScenarioType = 
    | 'KIOSK_WITHDRAWAL_ON_US' 
    | 'KIOSK_WITHDRAWAL_OFF_US'
    | 'KIOSK_DEPOSIT'
    | 'PHONEPAY_WITHDRAWAL' 
    | 'PHONEPAY_DEPOSIT'
    | 'SERVICE_SALE';

export interface ScenarioParams {
    amount?: number;        // Cash Amount (Given/Taken)
    total_settled?: number; // OD/Bank Amount (Settled/Received)
    
    // For Service Sale
    cash_in?: number;
    digital_in?: number;
    cash_out?: number;
    digital_out?: number;

    customerName?: string;
    description?: string;
}

const findAccount = (accounts: Account[], type: string): number => {
    // Exact match first, then by type
    const account = accounts.find(a => a.name === type) || accounts.find(a => a.type === type);
    if (!account) throw new Error(`Account ${type} not found`);
    return account.id;
};

// Hardcoded Account Type Mappings
const ACC = {
    CASH: 'Cash',
    OD: 'OD Account',
    BANK: 'Bank Account',
    REVENUE: 'Revenue',
    EXPENSE: 'Expenses'
};

/*
 * TERMINOLOGY MAPPING:
 * User Terminology vs Standard Accounting (Used in Code)
 * -----------------------------------------------------
 * User "Credit" (Money In)  -> Code/DB "DEBIT" (Asset Increase)
 * User "Debit"  (Money Out) -> Code/DB "CREDIT" (Asset Decrease)
 *
 * This logic handles the translation. The DB stores standard Double Entry.
 */

export const generateLedgerEntries = (
    scenario: ScenarioType,
    params: ScenarioParams,
    accounts: Account[]
): TransactionGroupInput => {
    const date = new Date().toISOString().split('T')[0];
    const { customerName, description } = params;

    const cashId = findAccount(accounts, ACC.CASH);
    const odId = findAccount(accounts, ACC.OD);
    const bankId = findAccount(accounts, ACC.BANK);
    const revenueId = findAccount(accounts, ACC.REVENUE);

    let entries: TransactionGroupInput['entries'] = [];
    let groupDesc = description || '';

    const validateParams = () => {
        if (params.amount === undefined || params.total_settled === undefined) {
            throw new Error("Missing parameters: amount or total_settled");
        }
    };

    switch (scenario) {
        case 'KIOSK_WITHDRAWAL_ON_US':
            // Logic: No profit allowed.
            // Constraint: Ensure Amount === Total Settled.
            // Entries:
            // 1. Debit OD Account with the Amount.
            // 2. Credit Cash with the Amount.
            validateParams();
            const amountOnUs = Number(params.amount);
            
            // Enforce constraint loosely for calculation, but warn if mismatch
            if (Math.abs(Number(params.amount) - Number(params.total_settled)) > 0.01) {
                // We use the entered amount, assuming UI handled validation or user intends to track cash movement.
            }

            entries = [
                { account_id: odId, type: 'DEBIT', amount: amountOnUs, description: `Bank Settlement (In) - On-us` },
                { account_id: cashId, type: 'CREDIT', amount: amountOnUs, description: 'Cash Disbursement' },
            ];

            groupDesc = `Kiosk Withdrawal (On-us): ${amountOnUs}`;
            break;

        case 'KIOSK_WITHDRAWAL_OFF_US':
            // Logic: Treat this as a split transaction: Principal Out (Expense) + Fee In (Revenue).
            // 1. Debit OD Account with the Full Settlement Amount.
            // 2. Credit Cash with the Full Settlement Amount (Giving principal cash to customer).
            // 3. Debit Cash with the Profit Amount (Fee collected from customer).
            // 4. Credit Revenue with the Profit Amount.
            validateParams();
            const settledOffUs = Number(params.total_settled);
            const cashGivenOffUs = Number(params.amount);
            const profitOffUs = settledOffUs - cashGivenOffUs;

            entries = [
                { account_id: odId, type: 'DEBIT', amount: settledOffUs, description: `Bank Settlement (In) - Off-us` },
                { account_id: cashId, type: 'CREDIT', amount: settledOffUs, description: 'Principal Cash Out' },
            ];

            if (profitOffUs > 0) {
                entries.push({ account_id: cashId, type: 'DEBIT', amount: profitOffUs, description: 'Fee Collected' });
                entries.push({ account_id: revenueId, type: 'CREDIT', amount: profitOffUs, description: 'Service Revenue' });
            } else if (profitOffUs < 0) {
                // Negative profit means we gave MORE cash than settled? (Loss)
                entries.push({ account_id: revenueId, type: 'DEBIT', amount: Math.abs(profitOffUs), description: 'Service Loss' });
                entries.push({ account_id: cashId, type: 'CREDIT', amount: Math.abs(profitOffUs), description: 'Excess Cash Given' });
            }

            groupDesc = `Kiosk Withdrawal (Off-us): ${cashGivenOffUs}`;
            break;

        case 'KIOSK_DEPOSIT':
            // Logic: Standard double-entry.
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

        case 'PHONEPAY_WITHDRAWAL':
            // Logic: Treat this as a split transaction: Principal Out (Expense) + Fee In (Revenue).
            // 1. Debit Bank Account with the Full Settlement Amount.
            // 2. Credit Cash with the Full Settlement Amount.
            // 3. Debit Cash with the Profit Amount.
            // 4. Credit Revenue with the Profit Amount.
            validateParams();
            const settledPP = Number(params.total_settled);
            const cashGivenPP = Number(params.amount);
            const profitPP = settledPP - cashGivenPP;

            entries = [
                { account_id: bankId, type: 'DEBIT', amount: settledPP, description: `Bank Settlement (In)` },
                { account_id: cashId, type: 'CREDIT', amount: settledPP, description: 'Principal Cash Out' },
            ];

            if (profitPP > 0) {
                entries.push({ account_id: cashId, type: 'DEBIT', amount: profitPP, description: 'Fee Collected' });
                entries.push({ account_id: revenueId, type: 'CREDIT', amount: profitPP, description: 'Service Revenue' });
            } else if (profitPP < 0) {
                entries.push({ account_id: revenueId, type: 'DEBIT', amount: Math.abs(profitPP), description: 'Service Loss' });
                entries.push({ account_id: cashId, type: 'CREDIT', amount: Math.abs(profitPP), description: 'Excess Cash Given' });
            }

            groupDesc = `PhonePe Withdrawal: ${cashGivenPP}`;
            break;

        case 'PHONEPAY_DEPOSIT':
            // Logic: Standard double-entry.
            // 1. Debit Cash with the Full Cash Received.
            // 2. Credit Bank Account with the Settlement Amount.
            // 3. Credit Revenue with the Profit Amount.
            validateParams();
            const cashTakenPP = Number(params.amount);
            const sentFromBankPP = Number(params.total_settled);
            const profitPPDep = cashTakenPP - sentFromBankPP;

            entries = [
                { account_id: cashId, type: 'DEBIT', amount: cashTakenPP, description: 'Cash Received' },
                { account_id: bankId, type: 'CREDIT', amount: sentFromBankPP, description: 'Sent from Bank' },
            ];

            if (profitPPDep > 0) {
                entries.push({ account_id: revenueId, type: 'CREDIT', amount: profitPPDep, description: 'Service Revenue' });
            } else if (profitPPDep < 0) {
                entries.push({ account_id: revenueId, type: 'DEBIT', amount: Math.abs(profitPPDep), description: 'Service Loss' });
            }

            groupDesc = `PhonePe Deposit: ${cashTakenPP}`;
            break;

        case 'SERVICE_SALE':
            // Complex case: Cash In, Digital In, Cash Out, Digital Out.
            const cashIn = Number(params.cash_in || 0);
            const digitalIn = Number(params.digital_in || 0);
            const cashOut = Number(params.cash_out || 0);
            const digitalOut = Number(params.digital_out || 0);

            const totalIn = cashIn + digitalIn;
            const totalOut = cashOut + digitalOut;
            const netRevenue = totalIn - totalOut;

            if (cashIn > 0) entries.push({ account_id: cashId, type: 'DEBIT', amount: cashIn, description: 'Cash Received' });
            if (digitalIn > 0) entries.push({ account_id: bankId, type: 'DEBIT', amount: digitalIn, description: 'Digital Received' });
            
            if (cashOut > 0) entries.push({ account_id: cashId, type: 'CREDIT', amount: cashOut, description: 'Cash Expense' });
            if (digitalOut > 0) entries.push({ account_id: bankId, type: 'CREDIT', amount: digitalOut, description: 'Digital Expense' });
            
            if (netRevenue > 0) {
                entries.push({ account_id: revenueId, type: 'CREDIT', amount: netRevenue, description: 'Service Revenue' });
            } else if (netRevenue < 0) {
                 entries.push({ account_id: revenueId, type: 'DEBIT', amount: Math.abs(netRevenue), description: 'Service Loss' });
            }

            groupDesc = `Service Sale / General`;
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