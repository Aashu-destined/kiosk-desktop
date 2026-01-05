import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Account, DashboardStats } from '../types/ipc';

interface DataContextType {
  accounts: Account[];
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  const refreshData = useCallback(async () => {
    // Only set loading to true if we don't have data yet
    if (accounts.length === 0 && !stats) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const [accountsRes, statsRes] = await Promise.all([
        window.ipcRenderer.invoke('db:get-accounts'),
        window.ipcRenderer.invoke('db:get-dashboard-stats')
      ]);
      
      if (accountsRes.success && accountsRes.data) {
        setAccounts(accountsRes.data);
      } else if (accountsRes.error) {
        throw new Error(accountsRes.error.message);
      }

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      } else if (statsRes.error) {
        // Stats failure shouldn't necessarily block app, but let's log it
        console.error('Failed to load stats:', statsRes.error);
      }

      setLastUpdated(Date.now());
    } catch (err: any) {
      console.error('Failed to refresh data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <DataContext.Provider value={{ accounts, stats, isLoading, error, lastUpdated, refreshData }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};