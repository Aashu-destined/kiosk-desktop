import db from '../db/index';
import { handleIpcRequest } from '../utils/ipcHelper';

interface GetDailyRecordArgs {
    date: string;
    accountId?: number; // If not provided, tries to find an account with slug 'cash' or uses the first one.
}

interface SaveDailyRecordArgs {
    date: string;
    accountId?: number; // Fix AUDIT-001: Support specific account
    openingBalance: number;
    closingBalance: number;
    physicalCount: number;
    difference: number;
    status: 'OPEN' | 'CLOSED';
    notes?: string;
}

export const handleGetDailyRecord = async (_event: any, { date, accountId }: GetDailyRecordArgs) => {
    return handleIpcRequest(() => {
        // Fix AUDIT-107: Wrap in transaction to ensure atomic read-compute
        return db.transaction(() => {
            // 1. Identify Account
            let targetAccountId = accountId;
            if (!targetAccountId) {
                const cashAccount = db.prepare("SELECT id FROM accounts WHERE slug = 'cash'").get() as { id: number } | undefined;
                if (cashAccount) {
                    targetAccountId = cashAccount.id;
                } else {
                    const firstAccount = db.prepare("SELECT id FROM accounts LIMIT 1").get() as { id: number } | undefined;
                    targetAccountId = firstAccount?.id;
                }
            }

            if (!targetAccountId) {
                console.warn("No account found for reconciliation.");
                return null;
            }

            // 2. Try to get existing record
            // Fix AUDIT-001: Use account_id in query
            const record = db.prepare('SELECT * FROM daily_records WHERE date = ? AND account_id = ?').get(date, targetAccountId) as any;

            // 3. Calculate Live Balances (Expected)
            // ... (rest of calculation uses targetAccountId, so it's fine)
            // ...
            
            const account = db.prepare('SELECT current_balance, type FROM accounts WHERE id = ?').get(targetAccountId) as { current_balance: number, type: string };
            const currentBalance = account.current_balance;

            // Define Time Boundaries for the requested Date
            
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const startTimestamp = Math.floor(startOfDay.getTime() / 1000);

            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            const endTimestamp = Math.floor(endOfDay.getTime() / 1000);

            // Transactions that happened AFTER the *Start* of the target date (to back-calculate Opening)
            
            const txsAfterStart = db.prepare(`
                SELECT * FROM transactions
                WHERE timestamp >= ?
                AND account_id = ?
            `).all(startTimestamp, targetAccountId) as any[];

            const calculateNetChange = (transactions: any[], accountType: string) => {
                let change = 0;
                const isAssetLike = ['ASSET', 'EXPENSE'].includes(accountType);
                
                for (const tx of transactions) {
                     if (isAssetLike) {
                         if (tx.type === 'DEBIT') change += tx.amount;
                         if (tx.type === 'CREDIT') change -= tx.amount;
                     } else {
                         // Liability, Equity, Revenue
                         if (tx.type === 'CREDIT') change += tx.amount;
                         if (tx.type === 'DEBIT') change -= tx.amount;
                     }
                }
                return change;
            };

            const netChangeAfterStart = calculateNetChange(txsAfterStart, account.type);
            const calculatedOpening = currentBalance - netChangeAfterStart;

            // Transactions that happened AFTER the *End* of the target date (to back-calculate Closing)
            const txsAfterEnd = db.prepare(`
                SELECT * FROM transactions
                WHERE timestamp > ?
                AND account_id = ?
            `).all(endTimestamp, targetAccountId) as any[];

            const netChangeAfterEnd = calculateNetChange(txsAfterEnd, account.type);
            const calculatedClosing = currentBalance - netChangeAfterEnd;

            return {
                record, // existing stored record (if any)
                calculated: {
                    openingBalance: calculatedOpening,
                    closingBalance: calculatedClosing
                },
                accountId: targetAccountId
            };
        })(); // Execute transaction
    });
};

export const handleSaveDailyRecord = async (_event: any, args: SaveDailyRecordArgs) => {
    return handleIpcRequest(() => {
        const { date, accountId, openingBalance, closingBalance, physicalCount, difference, status, notes } = args;
        
        // Fix AUDIT-001: Determine Account ID
        let targetAccountId = accountId;
        if (!targetAccountId) {
            const cashAccount = db.prepare("SELECT id FROM accounts WHERE slug = 'cash'").get() as { id: number } | undefined;
            if (cashAccount) {
                targetAccountId = cashAccount.id;
            } else {
                const firstAccount = db.prepare("SELECT id FROM accounts LIMIT 1").get() as { id: number } | undefined;
                targetAccountId = firstAccount?.id;
            }
        }

        if (!targetAccountId) {
            throw new Error("No account identified for reconciliation.");
        }

        const existing = db.prepare('SELECT id FROM daily_records WHERE date = ? AND account_id = ?').get(date, targetAccountId);

        if (existing) {
            db.prepare(`
                UPDATE daily_records
                SET cash_opening = ?, cash_closing_calculated = ?, cash_physical_count = ?, difference = ?, status = ?, notes = ?
                WHERE date = ? AND account_id = ?
            `).run(openingBalance, closingBalance, physicalCount, difference, status, notes, date, targetAccountId);
        } else {
            db.prepare(`
                INSERT INTO daily_records (date, account_id, cash_opening, cash_closing_calculated, cash_physical_count, difference, status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(date, targetAccountId, openingBalance, closingBalance, physicalCount, difference, status, notes);
        }

        // Return void/undefined for success, wrapper will handle { success: true, data: undefined }
    });
};
