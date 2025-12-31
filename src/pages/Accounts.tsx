import React, { useState, useEffect } from 'react';
import { Account } from '../types/ipc';
import { Plus, Edit2, X, Check } from 'lucide-react';

const Accounts: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  
  // New account form state
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState('cash');
  const [newAccountBalance, setNewAccountBalance] = useState(0);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await window.ipcRenderer.invoke('db:get-accounts');
      setAccounts(data);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await window.ipcRenderer.invoke('db:add-account', {
        name: newAccountName,
        type: newAccountType,
        initialBalance: Number(newAccountBalance)
      });
      setIsAdding(false);
      setNewAccountName('');
      setNewAccountType('cash');
      setNewAccountBalance(0);
      loadAccounts();
    } catch (error) {
      console.error('Failed to add account:', error);
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
      await window.ipcRenderer.invoke('db:update-account', {
        id,
        name: editName
      });
      setEditingId(null);
      setEditName('');
      loadAccounts();
    } catch (error) {
      console.error('Failed to update account:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Accounts Management</h1>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} className="mr-2" />
          Add Account
        </button>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Account</h2>
            <form onSubmit={handleAddAccount}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full p-2 border rounded"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    className="w-full p-2 border rounded"
                    value={newAccountType}
                    onChange={(e) => setNewAccountType(e.target.value)}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                    <option value="mobile_money">Mobile Money</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initial Balance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full p-2 border rounded"
                    value={newAccountBalance}
                    onChange={(e) => setNewAccountBalance(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex justify-end mt-6 space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
          <div key={account.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                {editingId === account.id ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      className="p-1 border rounded w-full"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                    />
                    <button
                      onClick={() => saveEditing(account.id)}
                      className="text-green-600 hover:text-green-800"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
                    <button
                      onClick={() => startEditing(account)}
                      className="text-gray-400 hover:text-blue-600"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                )}
                <p className="text-sm text-gray-500 capitalize">{account.type.replace('_', ' ')}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">Current Balance</p>
              <p className={`text-2xl font-bold ${account.current_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${account.current_balance.toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Accounts;