import { describe, it, expect } from 'vitest';
import { generateLedgerEntries } from './ScenarioLogic';
import { Account } from '../types/ipc';

// Mock Accounts
const mockAccounts: Account[] = [
    { id: 1, name: 'Cash', type: 'ASSET', slug: 'cash', current_balance: 0 },
    { id: 2, name: 'OD Account', type: 'LIABILITY', slug: 'od_account', current_balance: 0 },
    { id: 3, name: 'Bank Account', type: 'ASSET', slug: 'bank_account', current_balance: 0 },
    { id: 4, name: 'Revenue', type: 'REVENUE', slug: 'revenue', current_balance: 0 },
    { id: 5, name: 'Expenses', type: 'EXPENSE', slug: 'expenses', current_balance: 0 },
    { id: 6, name: 'Savings', type: 'ASSET', slug: 'savings', current_balance: 0 }
];

describe('ScenarioLogic', () => {
    describe('KIOSK_WITHDRAWAL_OFF_US', () => {
        it('should calculate correct splits for profit scenario', () => {
            const params = { amount: 1000, total_settled: 1010 };
            const result = generateLedgerEntries('KIOSK_WITHDRAWAL_OFF_US', params, mockAccounts);
            
            expect(result.entries).toHaveLength(4);
            // 1. Settled into OD (Debit Liability/Asset depending on perspective, but code says DEBIT)
            expect(result.entries).toContainEqual(expect.objectContaining({ account_id: 2, type: 'DEBIT', amount: 101000 }));
            // 2. Cash Out (Credit Asset)
            expect(result.entries).toContainEqual(expect.objectContaining({ account_id: 1, type: 'CREDIT', amount: 100000 }));
            // 3. Profit (Debit Cash, Credit Revenue)
            expect(result.entries).toContainEqual(expect.objectContaining({ account_id: 1, type: 'DEBIT', amount: 1000 }));
            expect(result.entries).toContainEqual(expect.objectContaining({ account_id: 4, type: 'CREDIT', amount: 1000 }));
        });

        it('should throw error for negative amount', () => {
            const params = { amount: -100, total_settled: 100 };
            expect(() => generateLedgerEntries('KIOSK_WITHDRAWAL_OFF_US', params, mockAccounts)).toThrow();
        });
    });

    describe('INTERNAL_TRANSFER', () => {
        it('should create correct debit/credit pair', () => {
            const params = { amount: 500, fromAccountId: 1, toAccountId: 3 }; // Cash to Bank
            const result = generateLedgerEntries('INTERNAL_TRANSFER', params, mockAccounts);

            expect(result.entries).toHaveLength(2);
            expect(result.entries).toContainEqual(expect.objectContaining({ account_id: 1, type: 'CREDIT', amount: 50000 }));
            expect(result.entries).toContainEqual(expect.objectContaining({ account_id: 3, type: 'DEBIT', amount: 50000 }));
        });

        it('should throw error if amount is zero', () => {
            const params = { amount: 0, fromAccountId: 1, toAccountId: 3 };
            expect(() => generateLedgerEntries('INTERNAL_TRANSFER', params, mockAccounts)).toThrow(/positive/);
        });

        it('should throw error if fromAccount == toAccount', () => {
            const params = { amount: 100, fromAccountId: 1, toAccountId: 1 };
            expect(() => generateLedgerEntries('INTERNAL_TRANSFER', params, mockAccounts)).toThrow(/same account/);
        });

        it('should throw error if amount is negative', () => {
             const params = { amount: -100, fromAccountId: 1, toAccountId: 3 };
             expect(() => generateLedgerEntries('INTERNAL_TRANSFER', params, mockAccounts)).toThrow(/positive/);
        });
    });
});
