import React, { useState, useEffect } from 'react';
import { Account } from '../types/ipc';
import { Plus, Edit2, X, Check } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';

interface AccountsProps {
  autoOpenAdd?: boolean;
  onAutoOpenHandled?: () => void;
}

const Accounts: React.FC<AccountsProps> = ({ autoOpenAdd, onAutoOpenHandled }) => {
  const { accounts, refreshData } = useData();
  const { showToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  
  // New account form state
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState('cash');
  const [newAccountBalance, setNewAccountBalance] = useState(0);

  useEffect(() => {
    if (autoOpenAdd) {
      setIsAdding(true);
      onAutoOpenHandled?.();
    }
  }, [autoOpenAdd, onAutoOpenHandled]);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await window.ipcRenderer.invoke('db:add-account', {
        name: newAccountName,
        type: newAccountType,
        initialBalance: Number(newAccountBalance)
      });
      
      if (result.success) {
        setIsAdding(false);
        setNewAccountName('');
        setNewAccountType('cash');
        setNewAccountBalance(0);
        refreshData();
        showToast('Account added successfully', 'success');
      } else {
        showToast(result.error?.message || 'Failed to add account', 'error');
      }
    } catch (error) {
      console.error('Failed to add account:', error);
      showToast('Failed to add account', 'error');
    }
  };

  const startEditing = (account: Account) => {
    setEditingId(account.id);
    setEditName(account.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEditing = async (id: number) => {
    try {
      const result = await window.ipcRenderer.invoke('db:update-account', {
        id,
        name: editName
      });
      
      if (result.success) {
        setEditingId(null);
        setEditName('');
        refreshData();
        showToast('Account updated successfully', 'success');
      } else {
        showToast(result.error?.message || 'Failed to update account', 'error');
      }
    } catch (error) {
      console.error('Failed to update account:', error);
      showToast('Failed to update account', 'error');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Accounts Management</h1>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/80"
        >
          <Plus size={20} className="mr-2" />
          Add Account
        </button>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-panel rounded-lg p-6 w-full max-w-md border border-border shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-primary">Add New Account</h2>
            <form onSubmit={handleAddAccount}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="account-name" className="block text-sm font-medium text-muted mb-1">
                    Account Name
                  </label>
                  <input
                    id="account-name"
                    type="text"
                    required
                    className="w-full p-2 border rounded"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="account-type" className="block text-sm font-medium text-muted mb-1">
                    Type
                  </label>
                  <select
                    id="account-type"
                    className="w-full p-2 border border-border rounded bg-app text-primary"
                    value={newAccountType}
                    onChange={(e) => setNewAccountType(e.target.value)}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                    <option value="mobile_money">Mobile Money</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="account-balance" className="block text-sm font-medium text-muted mb-1">
                    Initial Balance
                  </label>
                  <input
                    id="account-balance"
                    type="number"
                    step="0.01"
                    required
                    className="w-full p-2 border border-border rounded bg-app text-primary"
                    value={newAccountBalance}
                    onChange={(e) => setNewAccountBalance(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex justify-end mt-6 space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-muted hover:text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent text-white rounded hover:bg-accent/80 transition-colors"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => (
          <div key={account.id} className="bg-panel p-6 rounded-lg shadow-sm border border-border">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                {editingId === account.id ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      className="p-1 border border-border rounded w-full bg-app text-primary"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                    />
                    <button
                      onClick={() => saveEditing(account.id)}
                      className="text-success hover:text-success/80"
                      aria-label="Save Account Name"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="text-destructive hover:text-destructive/80"
                      aria-label="Cancel Editing"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-primary">{account.name}</h3>
                    <button
                      onClick={() => startEditing(account)}
                      className="text-muted hover:text-accent transition-colors"
                      aria-label={`Edit ${account.name}`}
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                )}
                <p className="text-sm text-muted capitalize">{account.type.replace('_', ' ')}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted">Current Balance</p>
              <p className={`text-2xl font-bold ${account.current_balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                ₹{account.current_balance.toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Accounts;