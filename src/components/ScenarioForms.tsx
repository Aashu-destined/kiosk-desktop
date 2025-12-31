import React, { useState } from 'react';
import { ScenarioType, ScenarioParams } from '../engines/ScenarioLogic';

interface ScenarioFormProps {
  scenario: ScenarioType;
  onSubmit: (data: ScenarioParams) => void;
  onCancel: () => void;
}

export const ScenarioForm: React.FC<ScenarioFormProps> = ({ scenario, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<ScenarioParams>({
    amount: undefined,
    fee: undefined,
    totalReceived: undefined,
    cashGiven: undefined,
    transferAmount: undefined,
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
    onSubmit(formData);
  };

  const InputField = ({ label, name, type = 'number', placeholder = '' }: any) => (
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
        required
      />
    </div>
  );

  const renderFields = () => {
    switch (scenario) {
      case 'KIOSK_WITHDRAWAL':
        return (
          <>
            <InputField label="Withdrawal Amount (₹)" name="amount" />
            <InputField label="Service Fee (₹)" name="fee" />
          </>
        );
      case 'PHONEPAY_TO_SAVINGS':
        return (
          <>
            <InputField label="Total Received (PhonePe) (₹)" name="totalReceived" />
            <InputField label="Cash Given to Customer (₹)" name="cashGiven" />
          </>
        );
      case 'TRANSFER_VIA_SAVINGS':
      case 'TRANSFER_VIA_CASH':
        return (
          <>
            <InputField label="Total Received (₹)" name="totalReceived" />
            <InputField label="Transfer Amount (₹)" name="transferAmount" />
          </>
        );
      case 'SERVICE_SALE':
        return (
          <InputField label="Sale Amount (₹)" name="amount" />
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
          className="px-4 py-2 text-white bg-comet-500 rounded-md shadow-comet-glow hover:bg-comet-400 transition-all transform hover:-translate-y-0.5"
        >
          Process Transaction
        </button>
      </div>
    </form>
  );
};