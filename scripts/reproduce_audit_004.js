const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('Reproducing AUDIT-004: IPC Error Handling Weakness');

const dbPath = path.join(__dirname, 'reproduce_audit_004.db');

// Mocking an IPC Handler
const handleAddAccount = (db, name) => {
    try {
        const stmt = db.prepare('INSERT INTO accounts (name) VALUES (?)');
        stmt.run(name);
        return { success: true };
    } catch (error) {
        // Current implementation: Log and throw raw error
        console.error('Handler caught error, rethrowing...');
        throw error;
    }
};

try {
    // 1. Setup clean DB
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
    }
    const db = new Database(dbPath);

    // 2. Setup Schema
    db.exec(`
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        );
    `);

    // 3. First call - Success
    console.log('1. Adding "Test Account" (Should succeed)...');
    handleAddAccount(db, 'Test Account');
    console.log('   Success.');

    // 4. Second call - Failure (Unique Constraint)
    console.log('2. Adding "Test Account" again (Should fail)...');
    handleAddAccount(db, 'Test Account');

} catch (error) {
    console.log('\n--- SIMULATED RENDERER PROCESS ---');
    console.log('Caught Error from IPC Handler:');
    console.log('Type:', error.constructor.name);
    console.log('Message:', error.message);
    console.log('Properties:', Object.keys(error));
    console.log('Full Object:', error);
    
    // Check for standardized fields
    if (!error.code || !error.userMessage) {
        console.log('\n[FAIL] Error lacks standardized structure (code, userMessage).');
        console.log('Current state: Raw DB error is leaked/thrown directly.');
    } else {
        console.log('\n[PASS] Error has standardized structure.');
    }
} finally {
    // Cleanup
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
    }
}