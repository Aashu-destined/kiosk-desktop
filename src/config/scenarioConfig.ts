import { ScenarioType } from '../engines/ScenarioLogic';

export interface ScenarioField {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}

export interface ScenarioConfig {
  fields: ScenarioField[];
  layout?: 'default' | 'grid';
}

export const SCENARIO_CONFIG: Record<ScenarioType, ScenarioConfig> = {
  'KIOSK_WITHDRAWAL_ON_US': {
    fields: [
      { name: 'amount', label: 'Cash Given to Customer (₹)' },
      { name: 'total_settled', label: 'Amount Settled in OD (₹)' }
    ]
  },
  'KIOSK_WITHDRAWAL_OFF_US': {
    fields: [
      { name: 'amount', label: 'Cash Given to Customer (₹)' },
      { name: 'total_settled', label: 'Amount Settled in OD (₹)' }
    ]
  },
  'KIOSK_DEPOSIT': {
    fields: [
      { name: 'amount', label: 'Cash Taken from Customer (₹)' },
      { name: 'total_settled', label: 'Amount Deducted from OD (₹)' }
    ]
  },
  'PHONEPAY_WITHDRAWAL': {
    fields: [
      { name: 'amount', label: 'Cash Given to Customer (₹)' },
      { name: 'total_settled', label: 'Amount Received in Bank (₹)' }
    ]
  },
  'PHONEPAY_DEPOSIT': {
    fields: [
      { name: 'amount', label: 'Cash Taken from Customer (₹)' },
      { name: 'total_settled', label: 'Amount Sent from Bank (₹)' }
    ]
  },
  'SERVICE_SALE': {
    layout: 'grid',
    fields: [
      { name: 'cash_in', label: 'Cash Received (In) (₹)', required: false },
      { name: 'digital_in', label: 'Digital Received (In) (₹)', required: false },
      { name: 'cash_out', label: 'Cash Paid (Out) (₹)', required: false },
      { name: 'digital_out', label: 'Digital Paid (Out) (₹)', required: false }
    ]
  }
};