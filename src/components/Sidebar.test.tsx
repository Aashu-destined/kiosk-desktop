import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Sidebar from './Sidebar';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the DataContext
vi.mock('../contexts/DataContext', () => ({
  useData: () => ({
    accounts: [
      { id: 1, name: 'Test Cash', current_balance: 1000.50, type: 'Asset' },
      { id: 2, name: 'Test Bank', current_balance: 5000.00, type: 'Asset' },
    ],
    isLoading: false,
    refreshData: vi.fn(),
  }),
}));

describe('Sidebar', () => {
  const mockSetActiveTab = vi.fn();
  const mockOnAddAccount = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock IPC response for reconciliation data
    // We need to handle the case where window.ipcRenderer might be undefined in some environments,
    // though our setup.ts should handle it.
    if (window.ipcRenderer) {
        (window.ipcRenderer.invoke as any).mockResolvedValue({
        calculated: { openingBalance: 100, closingBalance: 200 },
        record: null,
        });
    }
  });

  it('renders navigation tabs', () => {
    render(
      <Sidebar 
        activeTab="dashboard" 
        setActiveTab={mockSetActiveTab} 
        onAddAccount={mockOnAddAccount} 
      />
    );

    expect(screen.getByText('dashboard')).toBeInTheDocument();
    expect(screen.getByText('transactions')).toBeInTheDocument();
    expect(screen.getByText('accounts')).toBeInTheDocument();
    expect(screen.getByText('settings')).toBeInTheDocument();
  });

  it('renders accounts from context', () => {
    render(
      <Sidebar 
        activeTab="dashboard" 
        setActiveTab={mockSetActiveTab} 
        onAddAccount={mockOnAddAccount} 
      />
    );

    expect(screen.getByText('Test Cash')).toBeInTheDocument();
    expect(screen.getByText('₹1000.50')).toBeInTheDocument();
    expect(screen.getByText('Test Bank')).toBeInTheDocument();
  });
});