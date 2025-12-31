import db from '../db/index';

export const handleGetAccounts = async () => {
    try {
        const stmt = db.prepare('SELECT * FROM accounts');
        const accounts = stmt.all();
        return accounts;
    } catch (error) {
        console.error('Failed to get accounts:', error);
        throw error;
    }
};

export const handleAddAccount = async (_event: any, { name, type, initialBalance }: { name: string; type: string; initialBalance: number }) => {
    try {
        const stmt = db.prepare('INSERT INTO accounts (name, type, current_balance) VALUES (?, ?, ?)');
        const info = stmt.run(name, type, initialBalance);
        
        const newAccount = db.prepare('SELECT * FROM accounts WHERE id = ?').get(info.lastInsertRowid);
        return newAccount;
    } catch (error) {
        console.error('Failed to add account:', error);
        throw error;
    }
};

export const handleUpdateAccount = async (_event: any, { id, name }: { id: number; name: string }) => {
    try {
        const stmt = db.prepare('UPDATE accounts SET name = ? WHERE id = ?');
        const info = stmt.run(name, id);
        
        if (info.changes === 0) {
            throw new Error('Account not found');
        }

        const updatedAccount = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
        return updatedAccount;
    } catch (error) {
        console.error('Failed to update account:', error);
        throw error;
    }
};