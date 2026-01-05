import db from '../db/index';
import { handleIpcRequest } from '../utils/ipcHelper';

export const handleGetDashboardStats = async (_event: any) => {
    return handleIpcRequest(() => {
        // 1. Daily Profit (Sum of fees collected today)
        // Assuming fees are positive income.
        // We look for transactions where fee > 0 created today.
        const today = new Date().toISOString().split('T')[0];
        const profitStmt = db.prepare(`
            SELECT SUM(
                CASE
                    WHEN t.type = 'CREDIT' THEN t.amount
                    ELSE -t.amount
                END
            ) as totalProfit
            FROM transactions t
            JOIN accounts a ON t.account_id = a.id
            WHERE a.type = 'REVENUE' AND t.group_id IN (
                SELECT id FROM transaction_groups WHERE date = ?
            )
        `);
        const profitResult = profitStmt.get(today) as { totalProfit: number };
        const totalProfit = profitResult?.totalProfit || 0;

        // 2. Current Cash Position (Balance of 'Cash' account)
        let cashBalance = 0;
        const specificCashStmt = db.prepare("SELECT current_balance FROM accounts WHERE name = 'Cash'");
        const specificCash = specificCashStmt.get() as { current_balance: number };
        
        if (specificCash) {
            cashBalance = specificCash.current_balance;
        } else {
             // Fallback: Sum of all assets if no specific 'Cash' account
             const allAssetsStmt = db.prepare("SELECT SUM(current_balance) as total FROM accounts WHERE type = 'ASSET'");
             const allAssets = allAssetsStmt.get() as { total: number };
             cashBalance = allAssets?.total || 0;
        }

        // 3. Service Analysis (Transaction Count & Volume by Type)
        const typeAnalysisStmt = db.prepare(`
            SELECT type, COUNT(*) as count, SUM(amount) as volume
            FROM transactions
            GROUP BY type
        `);
        const serviceAnalysis = typeAnalysisStmt.all();

        // 4. Trend Analysis (Daily profit for last 7 days)
        const trendStmt = db.prepare(`
            SELECT tg.date, SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE -t.amount END) as profit
            FROM transactions t
            JOIN accounts a ON t.account_id = a.id
            JOIN transaction_groups tg ON t.group_id = tg.id
            WHERE a.type = 'REVENUE' AND tg.date >= date('now', '-7 days')
            GROUP BY tg.date
            ORDER BY tg.date ASC
        `);
        const trendAnalysis = trendStmt.all();

        // 5. Alerts (Any account balance negative)
        const alertsStmt = db.prepare("SELECT name, current_balance FROM accounts WHERE current_balance < 0");
        const alerts = alertsStmt.all();

        return {
            dailyOverview: {
                totalProfit,
                cashBalance,
                alerts
            },
            serviceAnalysis,
            trendAnalysis
        };
    });
};