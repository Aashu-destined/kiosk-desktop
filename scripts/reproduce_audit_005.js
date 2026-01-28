const { app } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(() => {
    try {
        const Database = require('better-sqlite3');

        // Create a temporary database for testing
        const dbPath = path.join(__dirname, 'reproduce_audit_005.db');
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        }
        const db = new Database(dbPath);

        // Apply schema
        const schemaPath = path.join(__dirname, '../electron/db/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema);

        // Seed data
        console.log('Seeding data...');
        const insertGroup = db.prepare(`
            INSERT INTO transaction_groups (scenario_type, date, customer_name, description, timestamp)
            VALUES (@scenario_type, @date, @customer_name, @description, @timestamp)
        `);

        const insertTransaction = db.prepare(`
            INSERT INTO transactions (group_id, account_id, type, amount, description, timestamp)
            VALUES (@group_id, @account_id, @type, @amount, @description, @timestamp)
        `);

        const insertAccount = db.prepare(`
            INSERT INTO accounts (name, type) VALUES (?, ?)
        `);

        insertAccount.run('Cash', 'ASSET');
        insertAccount.run('Sales', 'REVENUE');

        const NUM_GROUPS = 1000;
        const ENTRIES_PER_GROUP = 2;

        db.transaction(() => {
            for (let i = 0; i < NUM_GROUPS; i++) {
                const info = insertGroup.run({
                    scenario_type: 'TEST',
                    date: '2023-01-01',
                    customer_name: `Customer ${i}`,
                    description: `Group ${i}`,
                    timestamp: Date.now()
                });
                const groupId = info.lastInsertRowid;
                
                for (let j = 0; j < ENTRIES_PER_GROUP; j++) {
                    insertTransaction.run({
                        group_id: groupId,
                        account_id: 1,
                        type: 'DEBIT',
                        amount: 100,
                        description: 'Test',
                        timestamp: Date.now()
                    });
                }
            }
        })();

        console.log(`Seeded ${NUM_GROUPS} groups with ${ENTRIES_PER_GROUP} entries each.`);

        // Simulate the N+1 query pattern
        console.log('Running N+1 query simulation...');
        const startTime = performance.now();

        const limit = 1000;
        const offset = 0;

        const groups = db.prepare(`
            SELECT * FROM transaction_groups
            ORDER BY timestamp DESC, id DESC
            LIMIT @limit OFFSET @offset
        `).all({ limit, offset });

        const getEntries = db.prepare('SELECT * FROM transactions WHERE group_id = ?');

        const groupsWithEntries = groups.map((group) => ({
            ...group,
            entries: getEntries.all(group.id)
        }));

        const endTime = performance.now();
        console.log(`Time taken: ${(endTime - startTime).toFixed(2)}ms`);
        console.log(`Fetched ${groupsWithEntries.length} groups.`);
        console.log(`First group entries:`, groupsWithEntries[0].entries);

        db.close();
        app.quit();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        app.quit();
        process.exit(1);
    }
});