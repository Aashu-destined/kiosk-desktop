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
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedAccounts, fetchedStats] = await Promise.all([
        window.ipcRenderer.invoke('db:get-accounts'),
        window.ipcRenderer.invoke('db:get-dashboard-stats')
      ]);
      
      setAccounts(fetchedAccounts);
      setStats(fetchedStats);
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