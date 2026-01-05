import db from '../db/index';
import { handleIpcRequest } from '../utils/ipcHelper';

export const handleGetSettings = async () => {
    return handleIpcRequest(() => {
        const stmt = db.prepare('SELECT key, value FROM settings');
        const settings = stmt.all();
        // Convert array of objects to a single object
        return settings.reduce((acc: any, curr: any) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
    });
};

export const handleSaveSetting = async (_event: any, { key, value }: { key: string; value: string }) => {
    return handleIpcRequest(() => {
        const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        const info = stmt.run(key, value);
        return info.changes > 0;
    });
};