import React, { useState, useEffect } from 'react';
import { TransactionGroup } from '../types/ipc';
import { ScenarioSelector } from '../components/ScenarioSelector';
import { ScenarioForm } from '../components/ScenarioForms';
import { ScenarioType, ScenarioParams, generateLedgerEntries } from '../engines/ScenarioLogic';
import { useData } from '../contexts/DataContext';

const Transactions: React.FC = () => {
  const { accounts, refreshData } = useData();
  const [transactionGroups, setTransactionGroups] = useState<TransactionGroup[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const LIMIT = 20;

  const [selectedScenario, setSelectedScenario] = useState<ScenarioType | null>(null);
  
  // Loading state for submitting
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTransactionGroups();
  }, [currentPage]);

  const loadTransactionGroups = async () => {
    try {
      const offset = (currentPage - 1) * LIMIT;
      const response = await window.ipcRenderer.invoke('db:get-transaction-groups', { limit: LIMIT, offset });
      setTransactionGroups(response.groups);
      setTotalCount(response.total);
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
        refreshData();
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
            isLoading={isSubmitting}
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
        
        {/* Pagination Controls */}
        <div className="flex justify-between items-center p-4 border-t border-celestial-border">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="px-4 py-2 text-sm bg-celestial-deep/50 text-slate-300 rounded hover:bg-celestial-deep disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-slate-400">
            Page {currentPage} of {Math.ceil(totalCount / LIMIT) || 1}
          </span>
          <button
            disabled={currentPage >= Math.ceil(totalCount / LIMIT)}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="px-4 py-2 text-sm bg-celestial-deep/50 text-slate-300 rounded hover:bg-celestial-deep disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
};

export default Transactions;