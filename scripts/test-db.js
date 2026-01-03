const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('Testing better-sqlite3...');

try {
    const dbPath = path.join(__dirname, 'test.db');
    // Ensure clean state
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
    }

    const db = new Database(dbPath);
    console.log('Database created successfully.');

    db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)');
    console.log('Table created.');

    const insert = db.prepare('INSERT INTO test (value) VALUES (?)');
    insert.run('hello world');
    console.log('Data inserted.');

    const row = db.prepare('SELECT * FROM test WHERE id = ?').get(1);
    console.log('Data retrieved:', row);

    db.close();
    fs.unlinkSync(dbPath);
    console.log('Test passed.');
} catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
}