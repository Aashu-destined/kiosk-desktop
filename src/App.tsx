import { useState } from 'react'
import { DataProvider } from './contexts/DataContext'
import { ToastProvider } from './contexts/ToastContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Accounts from './pages/Accounts'
import Settings from './pages/Settings'

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'accounts' | 'settings'>('transactions')
  const [autoOpenAddAccount, setAutoOpenAddAccount] = useState(false)

  const handleAddAccount = async () => {
    setActiveTab('accounts')
    setAutoOpenAddAccount(true)
  }

  return (
    <DataProvider>
      <ToastProvider>
        <Layout
          activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAddAccount={handleAddAccount}
      >
        <div className={activeTab === 'dashboard' ? 'block' : 'hidden'}>
          <Dashboard />
        </div>
        <div className={activeTab === 'transactions' ? 'block' : 'hidden'}>
          <Transactions />
        </div>
        <div className={activeTab === 'accounts' ? 'block' : 'hidden'}>
          <Accounts autoOpenAdd={autoOpenAddAccount} onAutoOpenHandled={() => setAutoOpenAddAccount(false)} />
        </div>
        <div className={activeTab === 'settings' ? 'block' : 'hidden'}>
          <Settings />
        </div>
        </Layout>
      </ToastProvider>
    </DataProvider>
  )
}

export default App