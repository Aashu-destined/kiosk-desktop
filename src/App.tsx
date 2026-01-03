import { useState } from 'react'
import { DataProvider } from './contexts/DataContext'
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
      <Layout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAddAccount={handleAddAccount}
      >
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'transactions' && <Transactions />}
        {activeTab === 'accounts' && <Accounts autoOpenAdd={autoOpenAddAccount} onAutoOpenHandled={() => setAutoOpenAddAccount(false)} />}
        {activeTab === 'settings' && <Settings />}
      </Layout>
    </DataProvider>
  )
}

export default App