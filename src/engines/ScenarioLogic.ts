import { Account, TransactionGroupInput } from '../types/ipc';

export type ScenarioType =
    | 'KIOSK_WITHDRAWAL_ON_US'
    | 'KIOSK_WITHDRAWAL_OFF_US'
    | 'KIOSK_DEPOSIT'
    | 'PHONEPAY_WITHDRAWAL'
    | 'PHONEPAY_DEPOSIT'
    | 'SERVICE_SALE'
    | 'INTERNAL_TRANSFER';

export interface ScenarioParams {
    amount?: number;        // Cash Amount (Given/Taken)
    total_settled?: number; // OD/Bank Amount (Settled/Received)
    
    // For Internal Transfer
    fromAccountId?: number;
    toAccountId?: number;

    // For Service Sale
    cash_in?: number;
    digital_in?: number;
    cash_out?: number;
    digital_out?: number;

    customerName?: string;
    description?: string;
}

const findAccount = (accounts: Account[], identifier: string): number => {
    // 1. Try to match by slug (robust, system-defined)
    let account = accounts.find(a => a.slug === identifier);
    
    // 2. Fallback: Match by name (legacy support)
    if (!account) {
        account = accounts.find(a => a.name === identifier);
    }
    
    // 3. Fallback: Match by type (least specific)
    if (!account) {
        account = accounts.find(a => a.type === identifier);
    }

    if (!account) throw new Error(`Account ${identifier} not found`);
    return account.id;
};

// Account Slugs (Immutable System Identifiers)
const ACC = {
    CASH: 'cash',
    OD: 'od_account',
    BANK: 'bank_account',
    REVENUE: 'revenue',
    EXPENSE: 'expenses'
};

/**
 * Converts a decimal number (e.g., 10.50) to an integer (1050).
 * Handles potential floating point precision issues during multiplication.
 */
const toInt = (val: number | string | undefined): number => {
    if (val === undefined) return 0;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return Math.round(num * 100);
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
    // Fix AUDIT-104: Use local date instead of UTC
    const date = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
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
        if (params.amount <= 0) {
            throw new Error("Transaction amounts must be positive");
        }
        if (params.total_settled <= 0) {
            throw new Error("Transaction amounts must be positive");
        }
    };

    switch (scenario) {
        case 'KIOSK_WITHDRAWAL_ON_US':
            // Logic: Fix AUDIT-110 - Handle potential fee/profit even if on-us.
            validateParams();
            const settledOnUs = toInt(params.total_settled);
            const cashGivenOnUs = toInt(params.amount);
            const profitOnUs = settledOnUs - cashGivenOnUs;

            entries = [
                { account_id: odId, type: 'DEBIT', amount: settledOnUs, description: `Bank Settlement (In) - On-us` },
                { account_id: cashId, type: 'CREDIT', amount: cashGivenOnUs, description: 'Cash Disbursement' },
            ];

            if (profitOnUs > 0) {
                // Fix AUDIT-112: Profit credited to cash
                entries.push({ account_id: cashId, type: 'DEBIT', amount: profitOnUs, description: 'Commission (Cash)' });
                entries.push({ account_id: revenueId, type: 'CREDIT', amount: profitOnUs, description: 'Service Revenue' });
            } else if (profitOnUs < 0) {
                entries.push({ account_id: revenueId, type: 'DEBIT', amount: Math.abs(profitOnUs), description: 'Service Loss' });
            }

            groupDesc = `Kiosk Withdrawal (On-us): ${cashGivenOnUs / 100}`;
            break;

        case 'KIOSK_WITHDRAWAL_OFF_US':
            // Logic: Split transaction with profit allocation to Cash (AUDIT-108/112).
            validateParams();
            const settledOffUs = toInt(params.total_settled);
            const cashGivenOffUs = toInt(params.amount);
            const profitOffUs = settledOffUs - cashGivenOffUs;

            entries = [
                { account_id: odId, type: 'DEBIT', amount: settledOffUs, description: `Bank Settlement (In) - Off-us` },
                { account_id: cashId, type: 'CREDIT', amount: cashGivenOffUs, description: 'Cash Out to Customer' },
            ];

             if (profitOffUs > 0) {
                // Fix AUDIT-108/112: Profit credited to cash
                entries.push({ account_id: cashId, type: 'DEBIT', amount: profitOffUs, description: 'Commission (Cash)' });
                entries.push({ account_id: revenueId, type: 'CREDIT', amount: profitOffUs, description: 'Service Revenue' });
            } else if (profitOffUs < 0) {
                entries.push({ account_id: revenueId, type: 'DEBIT', amount: Math.abs(profitOffUs), description: 'Service Loss' });
            }

            groupDesc = `Kiosk Withdrawal (Off-us): ${cashGivenOffUs / 100}`;
            break;

        case 'KIOSK_DEPOSIT':
            // Logic: Standard double-entry.
            validateParams();
            const cashTakenKiosk = toInt(params.amount);
            const deductedFromODKiosk = toInt(params.total_settled);
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

            groupDesc = `Kiosk Deposit: ${cashTakenKiosk / 100}`;
            break;

        case 'PHONEPAY_WITHDRAWAL':
            // Logic: Split transaction with profit allocation to Cash (AUDIT-112).
            validateParams();
            const settledPP = toInt(params.total_settled);
            const cashGivenPP = toInt(params.amount);
            const profitPP = settledPP - cashGivenPP;

            entries = [
                { account_id: bankId, type: 'DEBIT', amount: settledPP, description: `Bank Settlement (In)` },
                { account_id: cashId, type: 'CREDIT', amount: cashGivenPP, description: 'Cash Out to Customer' },
            ];

            if (profitPP > 0) {
                // Fix AUDIT-112: Profit credited to cash
                entries.push({ account_id: cashId, type: 'DEBIT', amount: profitPP, description: 'Commission (Cash)' });
                entries.push({ account_id: revenueId, type: 'CREDIT', amount: profitPP, description: 'Service Revenue' });
            } else if (profitPP < 0) {
                entries.push({ account_id: revenueId, type: 'DEBIT', amount: Math.abs(profitPP), description: 'Service Loss' });
            }

            groupDesc = `PhonePe Withdrawal: ${cashGivenPP / 100}`;
            break;

        case 'PHONEPAY_DEPOSIT':
            // Logic: Standard double-entry.
            validateParams();
            const cashTakenPP = toInt(params.amount);
            const sentFromBankPP = toInt(params.total_settled);
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

            groupDesc = `PhonePe Deposit: ${cashTakenPP / 100}`;
            break;

        case 'SERVICE_SALE':
            // Complex case: Cash In, Digital In, Cash Out, Digital Out.
            const cashIn = toInt(params.cash_in || 0);
            const digitalIn = toInt(params.digital_in || 0);
            const cashOut = toInt(params.cash_out || 0);
            const digitalOut = toInt(params.digital_out || 0);

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
        
        case 'INTERNAL_TRANSFER':
            // Fix AUDIT-111: Implement Internal Transfer
            // Fix AUDIT-017: Input Hardening
            if (params.amount === undefined || params.amount <= 0) {
                throw new Error("Transfer amount must be a positive number");
            }

            const transferAmount = toInt(params.amount);
            const fromId = params.fromAccountId;
            const toId = params.toAccountId;

            if (!fromId || !toId) throw new Error("Missing accounts for transfer");
            if (fromId === toId) throw new Error("Cannot transfer to the same account");

            entries = [
                { account_id: fromId, type: 'CREDIT', amount: transferAmount, description: 'Transfer Out' },
                { account_id: toId, type: 'DEBIT', amount: transferAmount, description: 'Transfer In' }
            ];

            groupDesc = `Internal Transfer: ${transferAmount / 100}`;
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
