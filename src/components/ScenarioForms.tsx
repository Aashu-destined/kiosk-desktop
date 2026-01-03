import React, { useState } from 'react';
import { ScenarioType, ScenarioParams } from '../engines/ScenarioLogic';
import { SCENARIO_CONFIG } from '../config/scenarioConfig';

interface ScenarioFormProps {
  scenario: ScenarioType;
  onSubmit: (data: ScenarioParams) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface InputFieldProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  value: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const InputField: React.FC<InputFieldProps> = ({ label, name, type = 'number', placeholder = '', required = true, value, onChange }) => (
  <div className="mb-4">
    <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
    <input
      id={name}
      type={type}
      name={name}
      value={value || ''}
      onChange={onChange}
      className="input-celestial"
      placeholder={placeholder}
      required={required}
    />
  </div>
);

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

  const renderFields = () => {
    const config = SCENARIO_CONFIG[scenario];
    if (!config) return null;

    const fields = config.fields.map((field) => (
      <InputField
        key={field.name}
        label={field.label}
        name={field.name}
        required={field.required !== false}
        type={field.type || 'number'}
        placeholder={field.placeholder}
        value={formData[field.name as keyof ScenarioParams]}
        onChange={handleChange}
      />
    ));

    if (config.layout === 'grid') {
      return (
        <div className="grid grid-cols-2 gap-4">
          {fields}
        </div>
      );
    }

    return <>{fields}</>;
  };

  return (
    <form onSubmit={handleSubmit} className="card-island">
      <h3 className="text-xl font-bold mb-6 text-slate-100 border-b border-celestial-border pb-4 bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-300">
        {scenario.replace(/_/g, ' ')}
      </h3>
      
      {renderFields()}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
           <label htmlFor="customerName" className="block text-sm font-medium text-slate-300 mb-1">Customer Name (Optional)</label>
           <input
             id="customerName"
             type="text"
             name="customerName"
             value={formData.customerName}
             onChange={handleChange}
             className="input-celestial"
           />
        </div>
        <div>
           <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">Description (Optional)</label>
           <input
             id="description"
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