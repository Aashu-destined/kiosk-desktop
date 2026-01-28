import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ArrowRightLeft,
  Wallet,
  Settings,
  ChevronLeft,
  ChevronRight,
  PlusCircle
} from 'lucide-react';
import { DailyRecord } from '../types/ipc';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency, formatCurrencyWithSymbol, parseCurrencyToInt } from '../utils/formatUtils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: 'dashboard' | 'transactions' | 'accounts' | 'settings') => void;
  onAddAccount: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onAddAccount }) => {
  const { accounts } = useData();
  const { showToast } = useToast();
  
  // UI State
  const [isCollapsed, setIsCollapsed] = useState(false);

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
      const response = await window.ipcRenderer.invoke('db:get-daily-record', { date: recDate });
      
      if (response.success && response.data) {
        setCalcOpening(response.data.calculated.openingBalance);
        setCalcClosing(response.data.calculated.closingBalance);
        setDailyRecord(response.data.record);
        if (response.data.record) {
          setPhysicalCount((response.data.record.cash_physical_count / 100).toString());
          setReconciliationStatus(response.data.record.status);
        } else {
          setPhysicalCount('');
          setReconciliationStatus('PENDING');
        }
      } else {
         console.error('Failed to load reconciliation data:', response.error);
      }
    } catch (err) {
      console.error('Failed to load reconciliation data:', err);
    }
  };

  const handleSaveReconciliation = async () => {
    const pCount = parseCurrencyToInt(physicalCount);
    const diff = pCount - calcClosing;
    
    try {
      const result = await window.ipcRenderer.invoke('db:save-daily-record', {
        date: recDate,
        openingBalance: calcOpening,
        closingBalance: calcClosing,
        physicalCount: pCount,
        difference: diff,
        status: diff === 0 ? 'CLOSED' : 'OPEN',
        notes: diff !== 0 ? `Variance: ${formatCurrency(diff)}` : 'Balanced'
      });

      if (result.success) {
        showToast('Reconciliation saved!', 'success');
        loadReconciliationData();
      } else {
        showToast(result.error?.message || 'Failed to save reconciliation.', 'error');
      }
    } catch (err) {
      console.error('Failed to save reconciliation:', err);
      showToast('Failed to save reconciliation.', 'error');
    }
  };

  const variance = parseCurrencyToInt(physicalCount) - calcClosing;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: ArrowRightLeft },
    { id: 'accounts', label: 'Accounts', icon: Wallet },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-80'
      } bg-panel/80 border-r border-border backdrop-blur-md flex flex-col h-screen overflow-hidden transition-all duration-300 z-20`}
    >
      <div className={`p-4 border-b border-border flex-shrink-0 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && <h2 className="text-xl font-bold text-primary whitespace-nowrap overflow-hidden">Kiosk Manager</h2>}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-md hover:bg-accent/10 text-muted hover:text-primary transition-colors"
          aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="flex flex-col space-y-1 p-3">
         {tabs.map(tab => {
           const Icon = tab.icon;
           return (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`flex items-center px-3 py-2.5 rounded-md transition-all duration-200 flux-interactive ${
                 activeTab === tab.id
                 ? 'bg-accent/10 text-accent border border-accent/20 shadow-sm'
                 : 'text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5'
               } ${isCollapsed ? 'justify-center' : ''}`}
               title={isCollapsed ? tab.label : ''}
               aria-label={tab.label}
             >
                <Icon size={20} className={isCollapsed ? '' : 'mr-3'} />
                {!isCollapsed && <span className="capitalize">{tab.label}</span>}
              </button>
           );
         })}
      </nav>
      
      {!isCollapsed && (
        <div className="p-4 border-b border-border">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex items-center justify-between">
            Accounts
            <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">{accounts.length}</span>
          </h3>
          <div className="space-y-2 overflow-y-auto max-h-60 pr-1 custom-scrollbar">
            {accounts.length === 0 ? (
              <p className="text-muted text-sm italic">No accounts found.</p>
            ) : (
              accounts.map(acc => (
                <div key={acc.id} className="p-2 bg-app/50 rounded border border-border flex justify-between items-center group hover:border-accent/30 transition-colors">
                  <span className="text-sm text-primary group-hover:text-primary truncate max-w-[120px]" title={acc.name}>{acc.name}</span>
                  <span className="text-sm font-mono font-bold text-accent">{formatCurrencyWithSymbol(acc.current_balance)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Daily Reconciliation Widget - Hide when collapsed */}
      {!isCollapsed ? (
        <div className="p-4 bg-app/30 border-t border-border flex-1 overflow-y-auto">
          <h3 className="font-bold text-primary mb-2 text-sm">Daily Reconciliation</h3>
          <div className="mb-2">
            <input
              type="date"
              aria-label="Reconciliation Date"
              value={recDate}
              onChange={(e) => setRecDate(e.target.value)}
              className="input-celestial text-xs w-full"
            />
          </div>
          <div className="space-y-1 text-xs text-muted mb-3">
            <div className="flex justify-between">
              <span>Opening:</span>
              <span className="font-mono text-primary">{formatCurrencyWithSymbol(calcOpening)}</span>
            </div>
            <div className="flex justify-between">
              <span>Expected Closing:</span>
              <span className="font-mono font-bold text-primary">{formatCurrencyWithSymbol(calcClosing)}</span>
            </div>
          </div>
          
          <div className="mb-2">
            <label htmlFor="physical-cash-count" className="block text-xs font-medium text-muted mb-1">Physical Cash Count</label>
            <input
              id="physical-cash-count"
              type="number"
              step="0.01"
              value={physicalCount}
              onChange={(e) => setPhysicalCount(e.target.value)}
              className="input-celestial text-right font-mono w-full"
              placeholder="0.00"
            />
          </div>

          <div className={`flex justify-between text-sm font-bold mb-1 ${Math.abs(variance) < 1 ? 'text-success' : 'text-destructive'}`}>
            <span>Variance:</span>
            <span>{formatCurrencyWithSymbol(variance)}</span>
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
      ) : (
        <div className="flex-1 flex flex-col items-center justify-end pb-4 space-y-4">
           {/* Collapsed Status Indicator */}
           <div
             className={`w-3 h-3 rounded-full ${Math.abs(variance) < 1 ? 'bg-success' : 'bg-destructive'}`}
             title={`Reconciliation Status: ${reconciliationStatus || 'PENDING'}`}
           />
        </div>
      )}
      
      {/* Quick Add Account */}
      <div className={`mt-auto p-4 border-t border-border ${isCollapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={onAddAccount}
          className={`flex items-center justify-center py-2 bg-transparent border border-dashed border-muted/50 hover:border-muted hover:text-primary rounded text-sm text-muted transition-colors flux-interactive ${isCollapsed ? 'w-10 h-10 p-0' : 'w-full'}`}
          title="Add Account"
          aria-label="Add Account"
        >
          {isCollapsed ? <PlusCircle size={20} /> : '+ Add Account'}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
