import React, { useState, useEffect } from 'react';
import { DashboardStats } from '../types/ipc';

const Dashboard: React.FC = () => {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const stats = await window.ipcRenderer.invoke('db:get-dashboard-stats');
      setDashboardStats(stats);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    }
  };

  if (!dashboardStats) {
    return <div className="text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard & Analytics</h1>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-island flux-interactive">
          <h3 className="text-sm font-medium text-muted mb-1">Today's Profit (Fees)</h3>
          <div className="text-3xl font-bold text-accent">
            ${dashboardStats.dailyOverview.totalProfit.toFixed(2)}
          </div>
        </div>
        
        <div className="card-island flux-interactive">
          <h3 className="text-sm font-medium text-muted mb-1">Current Cash Position</h3>
          <div className="text-3xl font-bold text-accent">
            ${dashboardStats.dailyOverview.cashBalance.toFixed(2)}
          </div>
        </div>

        <div className="card-island flux-interactive">
          <h3 className="text-sm font-medium text-muted mb-1">Alerts</h3>
          {dashboardStats.dailyOverview.alerts.length > 0 ? (
            <div className="space-y-1 mt-2">
              {dashboardStats.dailyOverview.alerts.map((alert, i) => (
                <div key={i} className="text-sm text-red-500 font-medium">
                  {alert.name}: ${alert.current_balance.toFixed(2)}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted mt-2">No alerts</div>
          )}
        </div>
      </div>

      {/* Charts / Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Analysis */}
        <div className="card-island">
          <h3 className="font-bold text-primary mb-4">7-Day Profit Trend</h3>
          <div className="h-64 flex items-end justify-between space-x-2">
            {dashboardStats.trendAnalysis.length === 0 ? (
                <p className="w-full text-center text-gray-400 self-center">No trend data available</p>
            ) : (
                dashboardStats.trendAnalysis.map((item, idx) => {
                      // Simple normalization for bar height
                      const maxProfit = Math.max(...dashboardStats.trendAnalysis.map(d => d.profit), 10);
                      const heightPct = Math.max((item.profit / maxProfit) * 100, 5); // min 5% height
                      return (
                          <div key={idx} className="flex flex-col items-center flex-1 group relative">
                              <div className="w-full bg-blue-100 rounded-t hover:bg-blue-200 transition-all relative" style={{ height: `${heightPct}%` }}>
                                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10">
                                    ${item.profit.toFixed(2)}
                                  </div>
                              </div>
                              <div className="text-xs text-gray-500 mt-2 rotate-45 origin-left translate-x-2 md:rotate-0 md:translate-x-0 truncate w-full text-center">
                                  {item.date.slice(5)}
                              </div>
                          </div>
                      )
                })
            )}
          </div>
        </div>

        {/* Service Analysis */}
        <div className="card-island">
          <h3 className="font-bold text-primary mb-4">Service Analysis</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-app/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted">Type</th>
                  <th className="px-4 py-2 text-right font-medium text-muted">Count</th>
                  <th className="px-4 py-2 text-right font-medium text-muted">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dashboardStats.serviceAnalysis.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-primary">{item.type}</td>
                    <td className="px-4 py-2 text-right text-muted">{item.count}</td>
                    <td className="px-4 py-2 text-right font-mono font-medium text-primary">${item.volume.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;