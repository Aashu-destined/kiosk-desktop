import { useState, useEffect } from 'react'
import { Account } from './types/ipc'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Accounts from './pages/Accounts'
import Settings from './pages/Settings'

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'accounts' | 'settings'>('transactions')
  const [accounts, setAccounts] = useState<Account[]>([])

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      const accs = await window.ipcRenderer.invoke('db:get-accounts')
      setAccounts(accs)
    } catch (err) {
      console.error('Failed to load accounts:', err)
    }
  }

  const handleAddAccount = async () => {
    const name = prompt('Account Name:')
    if (name) {
      await window.ipcRenderer.invoke('db:add-account', { name, type: 'asset', initialBalance: 0 })
      loadAccounts()
    }
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      accounts={accounts}
      onAddAccount={handleAddAccount}
    >
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'transactions' && <Transactions accounts={accounts} onTransactionAdded={loadAccounts} />}
      {activeTab === 'accounts' && <Accounts />}
      {activeTab === 'settings' && <Settings />}
    </Layout>
  )
}

export default App