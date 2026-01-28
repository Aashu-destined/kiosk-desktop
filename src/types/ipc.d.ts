import { IpcResponse } from './ipcResponse';

export * from './ipcResponse';

export interface Account {
  id: number;
  slug?: string;
  name: string;
  type: string;
  current_balance: number;
}

export interface TransactionGroup {
  id: number;
  scenario_type: string;
  date: string;
  customer_name?: string;
  description?: string;
  timestamp: number;
  entries?: Transaction[]; // Optional, for when we fetch with details
}

export interface Transaction {
  id: number;
  group_id: number;
  account_id: number;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  description?: string;
  timestamp: number;
}

export interface DailyRecord {
  id: number;
  date: string;
  cash_opening: number;
  cash_closing_calculated: number;
  cash_physical_count: number;
  difference: number;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
}

export interface DailyRecordResponse {
  record: DailyRecord | null;
  calculated: {
    openingBalance: number;
    closingBalance: number;
  };
}

export interface DashboardStats {
  dailyOverview: {
    totalProfit: number;
    cashBalance: number;
    odBalance: number;
    bankBalance: number;
    alerts: Array<{ name: string; current_balance: number }>;
  };
  serviceAnalysis: Array<{ type: string; count: number; volume: number }>;
  trendAnalysis: Array<{ date: string; profit: number }>;
}

export interface TransactionGroupInput {
  scenario_type: string;
  date: string;
  customer_name?: string;
  description?: string;
  entries: Array<{
    account_id: number;
    type: 'DEBIT' | 'CREDIT';
    amount: number;
    description?: string;
  }>;
}

export interface TransactionGroupsResponse {
  groups: TransactionGroup[];
  total: number;
}

export interface IpcRenderer {
  // Transactions
  invoke(channel: 'db:get-transaction-groups', args?: { limit?: number; offset?: number; startDate?: string; endDate?: string }): Promise<IpcResponse<TransactionGroupsResponse>>;
  invoke(channel: 'db:add-transaction-group', args: TransactionGroupInput): Promise<IpcResponse<{ groupId: number }>>;

  // Accounts
  invoke(channel: 'db:get-accounts'): Promise<IpcResponse<Account[]>>;
  invoke(channel: 'db:add-account', args: { name: string; type: string; initialBalance: number }): Promise<IpcResponse<Account>>;
  invoke(channel: 'db:update-account', args: { id: number; name: string }): Promise<IpcResponse<Account>>;

  // Settings
  invoke(channel: 'db:get-settings'): Promise<IpcResponse<Record<string, any>>>;
  invoke(channel: 'db:save-setting', args: { key: string; value: string }): Promise<IpcResponse<boolean>>;

  // Reconciliation
  invoke(channel: 'db:get-daily-record', args: { date: string }): Promise<IpcResponse<DailyRecordResponse>>;
  invoke(channel: 'db:save-daily-record', args: {
    date: string;
    cash_opening: number;
    cash_physical_count: number;
    notes?: string;
    status: 'OPEN' | 'CLOSED';
  }): Promise<IpcResponse<void>>;

  // Dashboard
  invoke(channel: 'db:get-dashboard-stats'): Promise<IpcResponse<DashboardStats>>;
  
  // Example IPC
  invoke(channel: 'app:get-version'): Promise<IpcResponse<{ version: string }>>;

  // Fallback for other channels
  invoke(channel: string, ...args: any[]): Promise<any>;

  on(channel: string, listener: (event: any, ...args: any[]) => void): void;
  off(channel: string, listener: (...args: any[]) => void): void;
  send(channel: string, ...args: any[]): void;
}

declare global {
  interface Window {
    ipcRenderer: IpcRenderer;
  }
}