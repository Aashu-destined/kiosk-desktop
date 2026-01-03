const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// Wait for app to be ready
app.whenReady().then(() => {
    console.log('Running test inside Electron...');
    console.log('Electron Version:', process.versions.electron);
    console.log('Node Version (in Electron):', process.versions.node);

    try {
        // We must require better-sqlite3 here, not at top level, 
        // to ensure we catch the error inside the ready handler if possible,
        // though typically module load errors happen at parse time.
        // However, this script is the entry point, so we require it.
        const Database = require('better-sqlite3');
        
        const dbPath = path.join(app.getPath('userData'), 'test-electron.db');
        console.log('DB Path:', dbPath);

        // Ensure clean state
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
             fs.mkdirSync(dbDir, { recursive: true });
        }
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        }

        const db = new Database(dbPath);
        console.log('Database created successfully.');

        db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)');
        console.log('Table created.');

        const insert = db.prepare('INSERT INTO test (value) VALUES (?)');
        insert.run('hello electron');
        console.log('Data inserted.');

        const row = db.prepare('SELECT * FROM test WHERE id = ?').get(1);
        console.log('Data retrieved:', row);

        if (row.value === 'hello electron') {
            console.log('Test Passed: Native module is working correctly in Electron.');
            db.close();
            app.quit();
            process.exit(0);
        } else {
            console.error('Test Failed: Data mismatch.');
            app.quit();
            process.exit(1);
        }

    } catch (error) {
        console.error('Test Failed with Error:', error);
        app.quit();
        process.exit(1);
    }
});