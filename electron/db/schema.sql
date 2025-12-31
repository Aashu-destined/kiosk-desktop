CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL, -- 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'
    current_balance REAL NOT NULL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS transaction_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scenario_type TEXT NOT NULL, -- e.g., 'KIOSK_WITHDRAWAL', 'MANUAL_ADJUSTMENT'
    date TEXT NOT NULL, -- ISO Date String YYYY-MM-DD
    customer_name TEXT,
    description TEXT,
    timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL REFERENCES transaction_groups(id) ON DELETE CASCADE,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    type TEXT NOT NULL, -- 'DEBIT' or 'CREDIT'
    amount REAL NOT NULL,
    description TEXT, -- Specific detail for this leg of the transaction
    timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS daily_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    cash_opening REAL NOT NULL DEFAULT 0.0,
    cash_closing_calculated REAL,
    cash_physical_count REAL,
    difference REAL,
    status TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'CLOSED'
    notes TEXT
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Trigger to update account balances automatically
CREATE TRIGGER IF NOT EXISTS update_balance_after_insert
AFTER INSERT ON transactions
BEGIN
    UPDATE accounts 
    SET current_balance = CASE 
        WHEN NEW.type = 'DEBIT' AND type IN ('ASSET', 'EXPENSE') THEN current_balance + NEW.amount
        WHEN NEW.type = 'CREDIT' AND type IN ('ASSET', 'EXPENSE') THEN current_balance - NEW.amount
        WHEN NEW.type = 'CREDIT' AND type IN ('LIABILITY', 'EQUITY', 'REVENUE') THEN current_balance + NEW.amount
        WHEN NEW.type = 'DEBIT' AND type IN ('LIABILITY', 'EQUITY', 'REVENUE') THEN current_balance - NEW.amount
        ELSE current_balance
    END
    WHERE id = NEW.account_id;
END;
