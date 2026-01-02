import React from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Smartphone, Layers, Printer, Wallet } from 'lucide-react';
import clsx from 'clsx';
import { ScenarioType } from '../engines/ScenarioLogic';

interface ScenarioSelectorProps {
  onSelect: (scenario: ScenarioType) => void;
  selected?: ScenarioType;
}

const scenarios: Array<{ id: ScenarioType; label: string; icon: React.ReactNode; color: string }> = [
  { 
    id: 'KIOSK_WITHDRAWAL_ON_US', 
    label: 'Kiosk On-Us (Withdrawal)', 
    icon: <ArrowDownToLine className="w-6 h-6" />,
    color: 'bg-comet-500/10 text-comet-400 border-comet-500/30 hover:bg-comet-500/20 hover:border-comet-400'
  },
  { 
    id: 'KIOSK_WITHDRAWAL_OFF_US', 
    label: 'Kiosk Off-Us (Withdrawal)', 
    icon: <Wallet className="w-6 h-6" />, // Changed icon for distinction
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-400'
  },
  { 
    id: 'KIOSK_DEPOSIT', 
    label: 'Kiosk Deposit', 
    icon: <ArrowUpFromLine className="w-6 h-6" />,
    color: 'bg-teal-500/10 text-teal-400 border-teal-500/30 hover:bg-teal-500/20 hover:border-teal-400'
  },
  {
    id: 'PHONEPAY_WITHDRAWAL',
    label: 'PhonePe Withdrawal',
    icon: <Smartphone className="w-6 h-6" />,
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-400'
  },
  {
    id: 'PHONEPAY_DEPOSIT',
    label: 'PhonePe Deposit',
    icon: <Layers className="w-6 h-6" />, 
    color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20 hover:border-indigo-400'
  },
  {
    id: 'SERVICE_SALE',
    label: 'Service Sale / General',
    icon: <Printer className="w-6 h-6" />,
    color: 'bg-orange-500/10 text-orange-400 border-orange-500/30 hover:bg-orange-500/20 hover:border-orange-400'
  },
];

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({ onSelect, selected }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {scenarios.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className={clsx(
            "flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-200 shadow-lg border backdrop-blur-sm",
            s.color,
            selected === s.id ? "ring-1 ring-offset-2 ring-offset-celestial-deep ring-comet-400 scale-105 shadow-comet-glow bg-celestial-panel" : "hover:scale-105 hover:shadow-comet-glow/50 bg-celestial-panel/40"
          )}
        >
          <div className="mb-2">{s.icon}</div>
          <span className="text-sm font-semibold text-center leading-tight">{s.label}</span>
        </button>
      ))}
    </div>
  );
};