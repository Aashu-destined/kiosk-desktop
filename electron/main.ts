import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import './db/index' // Initialize DB
import { handleGetTransactions, handleAddTransaction } from './handlers/transactionHandler'
import { handleGetSettings, handleSaveSetting } from './handlers/settingsHandler'
import { handleGetAccounts, handleAddAccount, handleUpdateAccount } from './handlers/accountHandler'
import { handleGetDailyRecord, handleSaveDailyRecord } from './handlers/reconciliationHandler'
import { handleGetDashboardStats } from './handlers/dashboardHandler'
import { handleGetAppVersion } from './handlers/exampleHandler'

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = path.join(__dirname, '../dist')
// process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname, '../public')
process.env.VITE_PUBLIC = path.join(__dirname, '../public')

let win: BrowserWindow | null
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    // @ts-ignore
    win.loadFile(path.join(process.env.DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  // Transaction IPCs
  ipcMain.handle('db:get-transactions', handleGetTransactions)
  ipcMain.handle('db:add-transaction', handleAddTransaction)

  // Account IPCs
  ipcMain.handle('db:get-accounts', handleGetAccounts)
  ipcMain.handle('db:add-account', handleAddAccount)
  ipcMain.handle('db:update-account', handleUpdateAccount)

  // Settings IPCs
  ipcMain.handle('db:get-settings', handleGetSettings)
  ipcMain.handle('db:save-setting', handleSaveSetting)

  // Reconciliation IPCs
  ipcMain.handle('db:get-daily-record', handleGetDailyRecord)
  ipcMain.handle('db:save-daily-record', handleSaveDailyRecord)

  // Dashboard IPCs
  ipcMain.handle('db:get-dashboard-stats', handleGetDashboardStats)

  // Example IPC
  ipcMain.handle('app:get-version', handleGetAppVersion);

  createWindow()
})