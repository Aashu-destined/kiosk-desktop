import db from '../db/index';
import { handleIpcRequest } from '../utils/ipcHelper';

export const handleGetAccounts = async () => {
    return handleIpcRequest(() => {
        const stmt = db.prepare('SELECT * FROM accounts');
        const accounts = stmt.all();
        return accounts;
    });
};

export const handleAddAccount = async (_event: any, { name, type, initialBalance }: { name: string; type: string; initialBalance: number }) => {
    return handleIpcRequest(() => {
        const stmt = db.prepare('INSERT INTO accounts (name, type, current_balance) VALUES (?, ?, ?)');
        const info = stmt.run(name, type, initialBalance);
        
        const newAccount = db.prepare('SELECT * FROM accounts WHERE id = ?').get(info.lastInsertRowid);
        return newAccount;
    });
};

export const handleUpdateAccount = async (_event: any, { id, name }: { id: number; name: string }) => {
    return handleIpcRequest(() => {
        // Check if account is a system account
        const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as any;
        if (!account) {
            throw new Error('Account not found');
        }

        // Optional: Block renaming of system accounts if strict mode is desired
        // For now, we allow renaming because we use 'slug' for logic, so the name is purely cosmetic.
        // This solves the fragility issue without restricting user freedom.
        
        const stmt = db.prepare('UPDATE accounts SET name = ? WHERE id = ?');
        stmt.run(name, id);
        
        const updatedAccount = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
        return updatedAccount;
    });
};