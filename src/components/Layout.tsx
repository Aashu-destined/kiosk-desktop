import React from 'react';
import Sidebar from './Sidebar';
import Starfield from './Starfield';
import { Account } from '../types/ipc';

interface LayoutProps {
  activeTab: string;
  setActiveTab: (tab: 'dashboard' | 'transactions' | 'accounts' | 'settings') => void;
  accounts: Account[];
  onAddAccount: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ activeTab, setActiveTab, accounts, onAddAccount, children }) => {
  return (
    <div className="min-h-screen bg-transparent flex relative">
      <Starfield />
      <div className="relative z-10 flex w-full">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        accounts={accounts} 
        onAddAccount={onAddAccount} 
      />
      
      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto relative z-10">
          {children}
        </div>
      </main>
      </div>
    </div>
  );
};

export default Layout;