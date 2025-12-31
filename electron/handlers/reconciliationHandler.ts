import db from '../db/index';

interface GetDailyRecordArgs {
    date: string;
    accountId?: number; // If not provided, tries to find an account named 'Cash' or uses the first one.
}

interface SaveDailyRecordArgs {
    date: string;
    openingBalance: number;
    closingBalance: number;
    physicalCount: number;
    difference: number;
    status: 'OPEN' | 'CLOSED';
    notes?: string;
}

export const handleGetDailyRecord = async (_event: any, { date, accountId }: GetDailyRecordArgs) => {
    try {
        // 1. Identify Account
        let targetAccountId = accountId;
        if (!targetAccountId) {
            const cashAccount = db.prepare("SELECT id FROM accounts WHERE name = 'Cash'").get() as { id: number } | undefined;
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
        const record = db.prepare('SELECT * FROM daily_records WHERE date = ?').get(date) as any;

        // 3. Calculate Live Balances (Expected)
        // We need to calculate what the balance WAS at the start of the requested date, and end of requested date.
        // Formula: Balance_At_Time_T = Current_Balance - Sum(Transactions_After_Time_T)

        // Get Current Balance
        const account = db.prepare('SELECT current_balance FROM accounts WHERE id = ?').get(targetAccountId) as { current_balance: number };
        const currentBalance = account.current_balance;

        // Define Time Boundaries for the requested Date
        // Note: Dates are stored as YYYY-MM-DD strings in DB, but we also have timestamp.
        // Let's rely on the 'date' column string for simple filtering if possible, or timestamp for precision.
        // Using timestamp is better for "After Time T".
        
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const startTimestamp = Math.floor(startOfDay.getTime() / 1000);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const endTimestamp = Math.floor(endOfDay.getTime() / 1000);

        // Transactions that happened AFTER the *Start* of the target date (to back-calculate Opening)
        // We sum net impact on the specific account.
        
        // Impact Logic:
        // - Source = Account -> Negative Impact (Amount + Fee?)
        // - Dest = Account -> Positive Impact (Amount)
        
        const txsAfterStart = db.prepare(`
            SELECT * FROM transactions 
            WHERE timestamp >= ? 
            AND (source_account_id = ? OR destination_account_id = ?)
        `).all(startTimestamp, targetAccountId, targetAccountId) as any[];

        let netChangeAfterStart = 0;
        for (const tx of txsAfterStart) {
            if (tx.source_account_id === targetAccountId) {
                netChangeAfterStart -= (tx.amount + tx.fee); 
            }
            if (tx.destination_account_id === targetAccountId) {
                netChangeAfterStart += tx.amount;
            }
        }

        const calculatedOpening = currentBalance - netChangeAfterStart;

        // Transactions that happened AFTER the *End* of the target date (to back-calculate Closing)
        const txsAfterEnd = db.prepare(`
            SELECT * FROM transactions 
            WHERE timestamp > ? 
            AND (source_account_id = ? OR destination_account_id = ?)
        `).all(endTimestamp, targetAccountId, targetAccountId) as any[];

        let netChangeAfterEnd = 0;
        for (const tx of txsAfterEnd) {
            if (tx.source_account_id === targetAccountId) {
                netChangeAfterEnd -= (tx.amount + tx.fee);
            }
            if (tx.destination_account_id === targetAccountId) {
                netChangeAfterEnd += tx.amount;
            }
        }

        const calculatedClosing = currentBalance - netChangeAfterEnd;

        return {
            record, // existing stored record (if any)
            calculated: {
                openingBalance: calculatedOpening,
                closingBalance: calculatedClosing
            },
            accountId: targetAccountId
        };

    } catch (error) {
        console.error('Failed to get daily record:', error);
        throw error;
    }
};

export const handleSaveDailyRecord = async (_event: any, args: SaveDailyRecordArgs) => {
    const { date, openingBalance, closingBalance, physicalCount, difference, status, notes } = args;

    try {
        const existing = db.prepare('SELECT id FROM daily_records WHERE date = ?').get(date);

        if (existing) {
            db.prepare(`
                UPDATE daily_records 
                SET opening_balance = ?, closing_balance = ?, physical_count = ?, difference = ?, status = ?, notes = ?
                WHERE date = ?
            `).run(openingBalance, closingBalance, physicalCount, difference, status, notes, date);
        } else {
            db.prepare(`
                INSERT INTO daily_records (date, opening_balance, closing_balance, physical_count, difference, status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(date, openingBalance, closingBalance, physicalCount, difference, status, notes);
        }

        return { success: true };
    } catch (error) {
        console.error('Failed to save daily record:', error);
        throw error;
    }
};