import { ipcMain } from 'electron';
import db from '../db';
import { TransactionGroupInput } from '../../src/types/ipc';
import { handleIpcRequest } from '../utils/ipcHelper';

ipcMain.handle('db:add-transaction-group', async (_: any, groupData: TransactionGroupInput) => {
    return handleIpcRequest(() => {
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

            return { groupId: Number(groupId) };
        })();

        return result;
    });
});

ipcMain.handle('db:get-transaction-groups', async (_, { limit = 50, offset = 0, startDate, endDate } = {}) => {
    return handleIpcRequest(() => {
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

        // Optimization: Avoid N+1 query by fetching all entries for the retrieved groups in one go
        const groupIds = groups.map((g: any) => g.id);
        
        let groupsWithEntries = groups;

        if (groupIds.length > 0) {
            const placeholders = groupIds.map(() => '?').join(',');
            const getAllEntries = db.prepare(`SELECT * FROM transactions WHERE group_id IN (${placeholders})`);
            const allEntries = getAllEntries.all(groupIds);

            // Group entries by group_id in memory
            const entriesByGroup = allEntries.reduce((acc: Record<number, any[]>, entry: any) => {
                if (!acc[entry.group_id]) {
                    acc[entry.group_id] = [];
                }
                acc[entry.group_id].push(entry);
                return acc;
            }, {} as Record<number, any[]>);

            groupsWithEntries = groups.map((group: any) => ({
                ...group,
                entries: entriesByGroup[group.id] || []
            }));
        } else {
             groupsWithEntries = groups.map((group: any) => ({
                ...group,
                entries: []
            }));
        }

        return { groups: groupsWithEntries, total };
    });
});