import db from '../db/index';

export const handleGetSettings = async () => {
    try {
        const stmt = db.prepare('SELECT key, value FROM settings');
        const settings = stmt.all();
        // Convert array of objects to a single object
        return settings.reduce((acc: any, curr: any) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
    } catch (error) {
        console.error('Failed to get settings:', error);
        throw error;
    }
};

export const handleSaveSetting = async (_event: any, { key, value }: { key: string; value: string }) => {
    try {
        const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        const info = stmt.run(key, value);
        return info.changes > 0;
    } catch (error) {
        console.error('Failed to save setting:', error);
        throw error;
    }
};