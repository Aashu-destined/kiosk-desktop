import React, { useState, useEffect } from 'react';
import { Account, DailyRecord } from '../types/ipc';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: 'dashboard' | 'transactions' | 'accounts' | 'settings') => void;
  accounts: Account[];
  onAddAccount: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, accounts, onAddAccount }) => {
  // Reconciliation State
  const [recDate, setRecDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyRecord, setDailyRecord] = useState<DailyRecord | null>(null);
  const [calcOpening, setCalcOpening] = useState(0);
  const [calcClosing, setCalcClosing] = useState(0);
  const [physicalCount, setPhysicalCount] = useState('');
  const [reconciliationStatus, setReconciliationStatus] = useState<string>('');

  useEffect(() => {
    loadReconciliationData();
  }, [recDate]);

  // We should ideally lift this up or use a context, but for now, we'll expose a refresh function or rely on prop updates if possible.
  // However, since App.tsx was passing transactions to trigger reload, we might need a way to signal updates.
  // For this step, I'll keep the logic here but note that 'transactions' dependency is missing compared to App.tsx.
  // We might need to pass a 'refreshTrigger' prop later.

  const loadReconciliationData = async () => {
    try {
      const data = await window.ipcRenderer.invoke('db:get-daily-record', { date: recDate });
      
      if (data) {
        setCalcOpening(data.calculated.openingBalance);
        setCalcClosing(data.calculated.closingBalance);
        setDailyRecord(data.record);
        if (data.record) {
          setPhysicalCount(data.record.cash_physical_count.toString());
          setReconciliationStatus(data.record.status);
        } else {
          setPhysicalCount('');
          setReconciliationStatus('PENDING');
        }
      }
    } catch (err) {
      console.error('Failed to load reconciliation data:', err);
    }
  };

  const handleSaveReconciliation = async () => {
    const pCount = parseFloat(physicalCount) || 0;
    const diff = pCount - calcClosing;
    
    try {
      await window.ipcRenderer.invoke('db:save-daily-record', {
        date: recDate,
        openingBalance: calcOpening,
        closingBalance: calcClosing,
        physicalCount: pCount,
        difference: diff,
        status: diff === 0 ? 'CLOSED' : 'OPEN',
        notes: diff !== 0 ? `Variance: ${diff}` : 'Balanced'
      });
      alert('Reconciliation saved!');
      loadReconciliationData();
    } catch (err) {
      console.error('Failed to save reconciliation:', err);
      alert('Failed to save reconciliation.');
    }
  };

  const variance = (parseFloat(physicalCount) || 0) - calcClosing;

  return (
    <aside className="w-80 bg-panel/80 border-r border-border backdrop-blur-md flex flex-col h-screen overflow-hidden transition-colors duration-300 z-20">
      <div className="p-6 border-b border-border flex-shrink-0">
        <h2 className="text-xl font-bold mb-2 text-primary">Kiosk Manager</h2>
        <nav className="flex flex-col space-y-1 mt-4">
           {['dashboard', 'transactions', 'accounts', 'settings'].map(tab => (
             <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-3 py-2 rounded text-left transition-all duration-200 capitalize flux-interactive ${
                  activeTab === tab
                  ? 'bg-accent/10 text-accent border border-accent/20 shadow-sm'
                  : 'text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {tab}
              </button>
           ))}
        </nav>
      </div>
      
      <div className="p-4 border-b border-border">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Accounts</h3>
        <div className="space-y-2 overflow-y-auto max-h-60 pr-1 custom-scrollbar">
          {accounts.length === 0 ? (
            <p className="text-muted text-sm italic">No accounts found.</p>
          ) : (
            accounts.map(acc => (
              <div key={acc.id} className="p-2 bg-app/50 rounded border border-border flex justify-between items-center group hover:border-accent/30 transition-colors">
                <span className="text-sm text-primary group-hover:text-primary">{acc.name}</span>
                <span className="text-sm font-mono font-bold text-accent">${acc.current_balance.toFixed(2)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Daily Reconciliation Widget */}
      <div className="p-4 bg-app/30 border-t border-border flex-1 overflow-y-auto">
        <h3 className="font-bold text-primary mb-2 text-sm">Daily Reconciliation</h3>
        <div className="mb-2">
          <input
            type="date"
            value={recDate}
            onChange={(e) => setRecDate(e.target.value)}
            className="input-celestial text-xs"
          />
        </div>
        <div className="space-y-1 text-xs text-muted mb-3">
          <div className="flex justify-between">
            <span>Opening:</span>
            <span className="font-mono text-primary">${calcOpening.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Expected Closing:</span>
            <span className="font-mono font-bold text-primary">${calcClosing.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="mb-2">
          <label className="block text-xs font-medium text-muted mb-1">Physical Cash Count</label>
          <input
            type="number"
            step="0.01"
            value={physicalCount}
            onChange={(e) => setPhysicalCount(e.target.value)}
            className="input-celestial text-right font-mono"
            placeholder="0.00"
          />
        </div>

        <div className={`flex justify-between text-sm font-bold mb-1 ${Math.abs(variance) < 0.01 ? 'text-green-500' : 'text-red-500'}`}>
          <span>Variance:</span>
          <span>${variance.toFixed(2)}</span>
        </div>
        
        <div className="text-xs text-muted mb-3 text-right">
          Status: {reconciliationStatus || 'PENDING'}
        </div>

        <button
          onClick={handleSaveReconciliation}
          className="w-full py-2 bg-accent text-white rounded shadow-sm text-sm hover:bg-accent/80 transition transform hover:-translate-y-0.5 flux-interactive"
        >
          {dailyRecord ? 'Update Day Record' : 'Close Day'}
        </button>
      </div>
      
      {/* Quick Add Account (Dev Helper) */}
      <div className="mt-auto p-4 border-t border-border">
        <button
          onClick={onAddAccount}
          className="w-full py-2 bg-transparent border border-dashed border-muted/50 hover:border-muted hover:text-primary rounded text-sm text-muted transition-colors flux-interactive"
        >
          + Add Account
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;