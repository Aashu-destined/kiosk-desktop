import { ipcMain } from 'electron';
import db from '../db';
import { TransactionGroupInput } from '../../src/types/ipc';

ipcMain.handle('db:add-transaction-group', async (_: any, groupData: TransactionGroupInput) => {
    try {
        const insertGroup = db.prepare(`
            INSERT INTO transaction_groups (scenario_type, date, customer_name, description, timestamp)
            VALUES (@scenario_type, @date, @customer_name, @description, @timestamp)
        `);

        const insertTransaction = db.prepare(`
            INSERT INTO transactions (group_id, account_id, type, amount, description, timestamp)
            VALUES (@group_id, @account_id, @type, @amount, @description, @timestamp)
        `);

        const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds

        const result = db.transaction(() => {
            // 1. Insert Group
            const groupInfo = insertGroup.run({
                scenario_type: groupData.scenario_type,
                date: groupData.date,
                customer_name: groupData.customer_name || null,
                description: groupData.description || null,
                timestamp: timestamp
            });
            
            const groupId = groupInfo.lastInsertRowid;

            // 2. Insert Entries
            for (const entry of groupData.entries) {
                insertTransaction.run({
                    group_id: groupId,
                    account_id: entry.account_id,
                    type: entry.type,
                    amount: entry.amount,
                    description: entry.description || null,
                    timestamp: timestamp
                });
            }

            return { success: true, groupId: Number(groupId) };
        })();

        return result;
    } catch (error) {
        console.error('Failed to add transaction group:', error);
        throw error;
    }
});

ipcMain.handle('db:get-transaction-groups', async (_, { limit = 50, offset = 0, startDate, endDate } = {}) => {
    try {
        let query = `
            SELECT * FROM transaction_groups 
            ORDER BY timestamp DESC, id DESC 
            LIMIT @limit OFFSET @offset
        `;
        
        // Simple date filtering can be added here if needed
        if (startDate && endDate) {
            query = `
                SELECT * FROM transaction_groups 
                WHERE date BETWEEN @startDate AND @endDate
                ORDER BY timestamp DESC, id DESC 
                LIMIT @limit OFFSET @offset
            `;
        }

        const groups = db.prepare(query).all({ limit, offset, startDate, endDate });

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as count FROM transaction_groups';
        if (startDate && endDate) {
            countQuery += ' WHERE date BETWEEN @startDate AND @endDate';
        }
        const totalResult = db.prepare(countQuery).get({ startDate, endDate }) as { count: number };
        const total = totalResult ? totalResult.count : 0;

        // Fetch entries for each group (N+1 query, but manageable for small limits or can use JOIN)
        // For UI display, usually we just need the group description, but let's fetch entries for completeness
        const getEntries = db.prepare('SELECT * FROM transactions WHERE group_id = ?');
        
        const groupsWithEntries = groups.map((group: any) => ({
            ...group,
            entries: getEntries.all(group.id)
        }));

        return { groups: groupsWithEntries, total };
    } catch (error) {
        console.error('Failed to get transaction groups:', error);
        throw error;
    }
});