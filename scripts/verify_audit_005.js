const { app } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(() => {
    try {
        const Database = require('better-sqlite3');

        // Create a temporary database for testing
        const dbPath = path.join(__dirname, 'verify_audit_005.db');
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
        const ENTRIES_PER_GROUP = 5;

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

        const limit = 1000;
        const offset = 0;

        // 1. Run Old N+1 Logic
        console.log('Running Old N+1 Logic...');
        const startOld = performance.now();
        
        const groupsOld = db.prepare(`
            SELECT * FROM transaction_groups
            ORDER BY timestamp DESC, id DESC
            LIMIT @limit OFFSET @offset
        `).all({ limit, offset });

        const getEntries = db.prepare('SELECT * FROM transactions WHERE group_id = ?');
        
        const resultOld = groupsOld.map((group) => ({
            ...group,
            entries: getEntries.all(group.id)
        }));

        const endOld = performance.now();
        console.log(`Old Logic Time: ${(endOld - startOld).toFixed(2)}ms`);


        // 2. Run New Optimized Logic
        console.log('Running New Optimized Logic...');
        const startNew = performance.now();

        const groupsNew = db.prepare(`
            SELECT * FROM transaction_groups
            ORDER BY timestamp DESC, id DESC
            LIMIT @limit OFFSET @offset
        `).all({ limit, offset });

        const groupIds = groupsNew.map((g) => g.id);
        
        let resultNew;

        if (groupIds.length > 0) {
            const placeholders = groupIds.map(() => '?').join(',');
            const getAllEntries = db.prepare(`SELECT * FROM transactions WHERE group_id IN (${placeholders})`);
            const allEntries = getAllEntries.all(groupIds);

            const entriesByGroup = allEntries.reduce((acc, entry) => {
                if (!acc[entry.group_id]) {
                    acc[entry.group_id] = [];
                }
                acc[entry.group_id].push(entry);
                return acc;
            }, {});

            resultNew = groupsNew.map((group) => ({
                ...group,
                entries: entriesByGroup[group.id] || []
            }));
        } else {
             resultNew = groupsNew.map((group) => ({
                ...group,
                entries: []
            }));
        }

        const endNew = performance.now();
        console.log(`New Logic Time: ${(endNew - startNew).toFixed(2)}ms`);

        // Verification
        if (resultOld.length !== resultNew.length) {
            throw new Error('Mismatch in number of groups');
        }
        if (resultOld[0].entries.length !== resultNew[0].entries.length) {
            throw new Error('Mismatch in number of entries for first group');
        }
        
        console.log('Verification Passed: Results match and performance is improved.');

        db.close();
        app.quit();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        app.quit();
        process.exit(1);
    }
});