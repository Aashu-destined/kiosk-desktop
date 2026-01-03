import React from 'react';
import Sidebar from './Sidebar';
import Starfield from './Starfield';

interface LayoutProps {
  activeTab: string;
  setActiveTab: (tab: 'dashboard' | 'transactions' | 'accounts' | 'settings') => void;
  onAddAccount: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ activeTab, setActiveTab, onAddAccount, children }) => {
  return (
    <div className="min-h-screen bg-transparent flex relative">
      <Starfield />
      <div className="relative z-10 flex w-full">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
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