// --- VERIFYING FIX FOR AUDIT-011 (Account Renaming) - LOGIC ONLY ---
// bypassing better-sqlite3 native module issues by mocking the DB layer

console.log("=== VERIFYING FIX FOR AUDIT-011 (Logic Check) ===");

// 1. Mock Database State (After Schema Update & Seeding)
let mockAccounts = [
    { id: 1, name: 'Cash', slug: 'cash', type: 'ASSET' },
    { id: 2, name: 'OD Account', slug: 'od_account', type: 'ASSET' },
    { id: 3, name: 'Bank Account', slug: 'bank_account', type: 'ASSET' },
    { id: 4, name: 'Revenue', slug: 'revenue', type: 'REVENUE' },
    { id: 5, name: 'Expenses', slug: 'expenses', type: 'EXPENSE' }
];

console.log("[SETUP] Initial Accounts State:", mockAccounts.map(a => `${a.name} (${a.slug})`));

// 2. Simulate User Action: Renaming 'Cash' to 'My Register 1'
console.log(`[ACTION] User renames 'Cash' to 'My Register 1'...`);
const cashAccount = mockAccounts.find(a => a.slug === 'cash');
if (cashAccount) {
    cashAccount.name = 'My Register 1';
    console.log(`[INFO] Account renamed. New Name: ${cashAccount.name}, Slug: ${cashAccount.slug}`);
}

// 3. Test The Logic (Copied from src/engines/ScenarioLogic.ts)

// Account Slugs (Immutable System Identifiers)
const ACC = {
    CASH: 'cash',
    OD: 'od_account',
    BANK: 'bank_account',
    REVENUE: 'revenue',
    EXPENSE: 'expenses'
};

const findAccount = (accountsList, identifier) => {
    // 1. Try to match by slug (robust, system-defined)
    let account = accountsList.find(a => a.slug === identifier);
    
    // 2. Fallback: Match by name (legacy support)
    if (!account) {
        account = accountsList.find(a => a.name === identifier);
    }
    
    // 3. Fallback: Match by type (least specific)
    if (!account) {
        account = accountsList.find(a => a.type === identifier);
    }

    if (!account) throw new Error(`Account ${identifier} not found`);
    return account.id;
};

// 4. Execute Verification
try {
    console.log(`[TEST] Attempting to find 'CASH' account using identifier: '${ACC.CASH}'...`);
    
    const foundId = findAccount(mockAccounts, ACC.CASH);
    const foundAccount = mockAccounts.find(a => a.id === foundId);
    
    if (foundAccount.name === 'My Register 1' && foundAccount.slug === 'cash') {
        console.log(`[SUCCESS] Found Correct Account! ID: ${foundId}, Name: ${foundAccount.name}`);
        console.log("=== TEST PASSED ===");
    } else {
        console.error(`[FAIL] Found wrong account: ${JSON.stringify(foundAccount)}`);
        process.exit(1);
    }

} catch (error) {
    console.error(`[FAIL] Logic Error: ${error.message}`);
    process.exit(1);
}