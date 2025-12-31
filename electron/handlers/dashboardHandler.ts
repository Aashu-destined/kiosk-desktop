import db from '../db/index';

export const handleGetDashboardStats = async (_event: any) => {
    try {
        // 1. Daily Profit (Sum of fees collected today)
        // Assuming fees are positive income.
        // We look for transactions where fee > 0 created today.
        const today = new Date().toISOString().split('T')[0];
        const profitStmt = db.prepare(`
            SELECT SUM(fee) as totalProfit 
            FROM transactions 
            WHERE date = ?
        `);
        const profitResult = profitStmt.get(today) as { totalProfit: number };
        const totalProfit = profitResult?.totalProfit || 0;

        // 2. Current Cash Position (Balance of 'Cash' account)
        // We look for an account named 'Cash' (case insensitive search might be safer, but schema says name is unique/text)
        // Or we might want to sum all 'Asset' types if 'Cash' isn't specific enough.
        // For MVP, let's look for 'Cash' specifically or 'Cash on Hand'.
        // const cashStmt = db.prepare("SELECT current_balance FROM accounts WHERE name LIKE 'Cash%' OR type = 'Asset'");
        // const cashAccounts = cashStmt.all() as { current_balance: number }[];
        // Summing all assets might be too broad if we have 'Bank', but usually 'Cash' is what's in the drawer.
        // Let's refine: Get specifically 'Cash' account if exists, else sum of all 'Asset' types?
        // Let's just return the sum of all accounts with 'Cash' in name for now, or total assets.
        // Re-reading requirements: "Current Cash Position (Get balance of 'Cash' account)"
        // I'll grab the specific 'Cash' account if possible, or the first one found.
        
        let cashBalance = 0;
        const specificCashStmt = db.prepare("SELECT current_balance FROM accounts WHERE name = 'Cash'");
        const specificCash = specificCashStmt.get() as { current_balance: number };
        
        if (specificCash) {
            cashBalance = specificCash.current_balance;
        } else {
             // Fallback: Sum of all assets if no specific 'Cash' account
             const allAssetsStmt = db.prepare("SELECT SUM(current_balance) as total FROM accounts WHERE type = 'Asset'");
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
            SELECT date, SUM(fee) as profit
            FROM transactions
            WHERE date >= date('now', '-7 days')
            GROUP BY date
            ORDER BY date ASC
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
    } catch (error) {
        console.error('Failed to get dashboard stats:', error);
        throw error;
    }
};