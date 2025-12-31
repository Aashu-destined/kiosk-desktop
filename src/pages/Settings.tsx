import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

interface TransactionType {
  id: string;
  label: string;
  defaultFee: number;
}

const Settings: React.FC = () => {
  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [newTypeFee, setNewTypeFee] = useState(0);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await window.ipcRenderer.invoke('db:get-settings');
      if (settings.transaction_types) {
        setTransactionTypes(JSON.parse(settings.transaction_types));
      } else {
        // Default types if none exist
        setTransactionTypes([
          { id: 'cash_in', label: 'Cash In', defaultFee: 0 },
          { id: 'cash_out', label: 'Cash Out', defaultFee: 0 },
        ]);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await window.ipcRenderer.invoke('db:save-setting', {
        key: 'transaction_types',
        value: JSON.stringify(transactionTypes)
      });
      setIsDirty(false);
      // Show success message or notification if needed
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const addTransactionType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeLabel) return;

    const newType: TransactionType = {
      id: newTypeLabel.toLowerCase().replace(/\s+/g, '_'),
      label: newTypeLabel,
      defaultFee: Number(newTypeFee)
    };

    setTransactionTypes([...transactionTypes, newType]);
    setNewTypeLabel('');
    setNewTypeFee(0);
    setIsDirty(true);
  };

  const removeTransactionType = (id: string) => {
    setTransactionTypes(transactionTypes.filter(t => t.id !== id));
    setIsDirty(true);
  };

  const updateFee = (id: string, fee: number) => {
    setTransactionTypes(transactionTypes.map(t => 
      t.id === id ? { ...t, defaultFee: fee } : t
    ));
    setIsDirty(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        {isDirty && (
          <button
            onClick={saveSettings}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Save size={20} className="mr-2" />
            Save Changes
          </button>
        )}
      </div>

      {/* Theme Settings Section */}
      <div className="bg-panel rounded-lg shadow-sm border border-border p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-primary">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted mb-1">Theme Preference</p>
            <p className="text-xs text-muted/70">Select your preferred color scheme.</p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="bg-panel rounded-lg shadow-sm border border-border p-6">
        <h2 className="text-xl font-semibold mb-4 text-primary">Transaction Types & Fees</h2>
        <p className="text-muted mb-6">Configure available transaction types and their default fees.</p>

        <div className="space-y-4 mb-8">
          {transactionTypes.map((type) => (
            <div key={type.id} className="flex items-center space-x-4 p-3 bg-app/50 rounded-lg">
              <div className="flex-1">
                <span className="font-medium text-primary">{type.label}</span>
                <span className="text-xs text-muted block">ID: {type.id}</span>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-muted">Default Fee:</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-24 p-1 border border-border bg-app rounded text-right text-primary"
                  value={type.defaultFee}
                  onChange={(e) => updateFee(type.id, Number(e.target.value))}
                />
              </div>
              <button
                onClick={() => removeTransactionType(type.id)}
                className="text-red-500 hover:text-red-700 p-1"
                title="Remove Type"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={addTransactionType} className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-primary mb-3">Add New Type</h3>
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Transaction Name (e.g. Utility Bill)"
                className="w-full p-2 border border-border bg-app rounded text-primary placeholder-muted"
                value={newTypeLabel}
                onChange={(e) => setNewTypeLabel(e.target.value)}
              />
            </div>
            <div className="w-32">
              <input
                type="number"
                step="0.01"
                placeholder="Fee"
                className="w-full p-2 border border-border bg-app rounded text-primary placeholder-muted"
                value={newTypeFee}
                onChange={(e) => setNewTypeFee(Number(e.target.value))}
              />
            </div>
            <button
              type="submit"
              disabled={!newTypeLabel}
              className="flex items-center px-4 py-2 bg-accent text-white rounded hover:bg-accent/80 disabled:opacity-50"
            >
              <Plus size={20} className="mr-1" />
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;