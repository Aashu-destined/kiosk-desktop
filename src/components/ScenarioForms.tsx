import React, { useState } from 'react';
import { ScenarioType, ScenarioParams } from '../engines/ScenarioLogic';

interface ScenarioFormProps {
  scenario: ScenarioType;
  onSubmit: (data: ScenarioParams) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ScenarioForm: React.FC<ScenarioFormProps> = ({ scenario, onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState<ScenarioParams>({
    amount: undefined,
    total_settled: undefined,
    cash_in: undefined,
    digital_in: undefined,
    cash_out: undefined,
    digital_out: undefined,
    customerName: '',
    description: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'customerName' || name === 'description' ? value : Number(value)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalData = { ...formData };
    onSubmit(finalData);
  };

  const InputField = ({ label, name, type = 'number', placeholder = '', required = true }: any) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        // @ts-ignore
        value={formData[name] || ''}
        onChange={handleChange}
        className="input-celestial"
        placeholder={placeholder}
        required={required}
      />
    </div>
  );

  const renderFields = () => {
    switch (scenario) {
      case 'KIOSK_WITHDRAWAL_ON_US':
        return (
          <>
            <InputField label="Cash Given to Customer (₹)" name="amount" />
            <InputField label="Amount Settled in OD (₹)" name="total_settled" />
          </>
        );
      case 'KIOSK_WITHDRAWAL_OFF_US':
        return (
          <>
            <InputField label="Cash Given to Customer (₹)" name="amount" />
            <InputField label="Amount Settled in OD (₹)" name="total_settled" />
          </>
        );
      case 'KIOSK_DEPOSIT':
        return (
           <>
            <InputField label="Cash Taken from Customer (₹)" name="amount" />
            <InputField label="Amount Deducted from OD (₹)" name="total_settled" />
           </>
        );
      case 'PHONEPAY_WITHDRAWAL':
        return (
          <>
            <InputField label="Cash Given to Customer (₹)" name="amount" />
            <InputField label="Amount Received in Bank (₹)" name="total_settled" />
          </>
        );
      case 'PHONEPAY_DEPOSIT':
        return (
          <>
            <InputField label="Cash Taken from Customer (₹)" name="amount" />
            <InputField label="Amount Sent from Bank (₹)" name="total_settled" />
          </>
        );
      case 'SERVICE_SALE':
        return (
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Cash Received (In) (₹)" name="cash_in" required={false} />
            <InputField label="Digital Received (In) (₹)" name="digital_in" required={false} />
            <InputField label="Cash Paid (Out) (₹)" name="cash_out" required={false} />
            <InputField label="Digital Paid (Out) (₹)" name="digital_out" required={false} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-island">
      <h3 className="text-xl font-bold mb-6 text-slate-100 border-b border-celestial-border pb-4 bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-300">
        {scenario.replace(/_/g, ' ')}
      </h3>
      
      {renderFields()}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
           <label className="block text-sm font-medium text-slate-300 mb-1">Customer Name (Optional)</label>
           <input
             type="text"
             name="customerName"
             value={formData.customerName}
             onChange={handleChange}
             className="input-celestial"
           />
        </div>
        <div>
           <label className="block text-sm font-medium text-slate-300 mb-1">Description (Optional)</label>
           <input
             type="text"
             name="description"
             value={formData.description}
             onChange={handleChange}
             className="input-celestial"
           />
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-slate-300 hover:text-white bg-celestial-deep/50 border border-celestial-border rounded-md hover:bg-celestial-deep transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className={`px-4 py-2 text-white rounded-md shadow-comet-glow transition-all transform ${
            isLoading
              ? 'bg-comet-500/50 cursor-not-allowed'
              : 'bg-comet-500 hover:bg-comet-400 hover:-translate-y-0.5'
          }`}
        >
          {isLoading ? 'Processing...' : 'Process Transaction'}
        </button>
      </div>
    </form>
  );
};