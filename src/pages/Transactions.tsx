import React, { useState, useEffect } from 'react';
import { TransactionGroup, Account } from '../types/ipc';
import { ScenarioSelector } from '../components/ScenarioSelector';
import { ScenarioForm } from '../components/ScenarioForms';
import { ScenarioType, ScenarioParams, generateLedgerEntries } from '../engines/ScenarioLogic';

interface TransactionsProps {
  accounts: Account[];
  onTransactionAdded: () => void;
}

const Transactions: React.FC<TransactionsProps> = ({ accounts, onTransactionAdded }) => {
  const [transactionGroups, setTransactionGroups] = useState<TransactionGroup[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType | null>(null);
  
  // Loading state for submitting
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTransactionGroups();
  }, []);

  const loadTransactionGroups = async () => {
    try {
      const groups = await window.ipcRenderer.invoke('db:get-transaction-groups');
      setTransactionGroups(groups);
    } catch (err) {
      console.error('Failed to load transaction groups:', err);
    }
  };

  const handleScenarioSubmit = async (params: ScenarioParams) => {
    if (!selectedScenario) return;
    setIsSubmitting(true);

    try {
      const ledgerEntries = generateLedgerEntries(selectedScenario, params, accounts);
      
      const result = await window.ipcRenderer.invoke('db:add-transaction-group', ledgerEntries);
      
      if (result.success) {
        setSelectedScenario(null); // Close form
        loadTransactionGroups(); // Reload list
        onTransactionAdded(); // Notify parent
      } else {
        alert('Failed to save transaction');
      }
    } catch (err: any) {
      console.error('Transaction Error:', err);
      alert(err.message || 'An error occurred while processing the transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">Transaction Manager</h1>
      
      {/* Scenario Selection Area */}
      {!selectedScenario ? (
        <ScenarioSelector onSelect={setSelectedScenario} />
      ) : (
        <div className="mb-8">
          <ScenarioForm 
            scenario={selectedScenario} 
            onSubmit={handleScenarioSubmit} 
            onCancel={() => setSelectedScenario(null)} 
          />
        </div>
      )}

      {/* Transaction History List */}
      <div className="card-island mt-8 !p-0 overflow-hidden">
        <h2 className="text-lg font-semibold p-6 border-b border-celestial-border text-slate-100">Recent Transactions</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-celestial-deep/50 border-b border-celestial-border">
              <tr>
                <th className="py-3 px-4 font-semibold text-slate-400 text-sm">Date</th>
                <th className="py-3 px-4 font-semibold text-slate-400 text-sm">Scenario</th>
                <th className="py-3 px-4 font-semibold text-slate-400 text-sm">Description</th>
                <th className="py-3 px-4 font-semibold text-slate-400 text-sm">Customer</th>
                <th className="py-3 px-4 font-semibold text-slate-400 text-sm text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-celestial-border">
              {transactionGroups.map((group) => (
                <React.Fragment key={group.id}>
                  <tr className="hover:bg-celestial-deep/30 transition-colors">
                    <td className="py-3 px-4 text-sm text-slate-300">{group.date}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-comet-500/20 text-comet-400 border border-comet-500/20">
                        {group.scenario_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-200">{group.description}</td>
                    <td className="py-3 px-4 text-sm text-slate-400">{group.customer_name || '-'}</td>
                    <td className="py-3 px-4 text-sm text-right">
                       <button className="text-comet-400 text-xs hover:text-comet-300 hover:underline">View Ledger</button>
                    </td>
                  </tr>
                  {/* Optional: Expand to show ledger entries? For now, keep it simple. */}
                </React.Fragment>
              ))}
              {transactionGroups.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No transactions recorded yet. Select a scenario above to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default Transactions;