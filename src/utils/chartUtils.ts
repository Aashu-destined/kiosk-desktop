export interface ChartItem {
  profit: number;
  [key: string]: any;
}

export interface NormalizedChartItem extends ChartItem {
  heightPct: number;
}

/**
 * Normalizes chart data to calculate height percentages for visualization.
 * 
 * @param data Array of items containing profit data
 * @param minHeight Minimum height percentage (default: 5)
 * @param minMaxProfit Minimum value for max profit to avoid division by zero or tiny bars (default: 10)
 * @returns Array of items with added heightPct property
 */
export const normalizeChartData = (
  data: ChartItem[], 
  minHeight: number = 5, 
  minMaxProfit: number = 10
): NormalizedChartItem[] => {
  if (!data || data.length === 0) return [];

  const maxProfit = Math.max(...data.map(d => d.profit), minMaxProfit);
  
  return data.map(item => ({
    ...item,
    heightPct: Math.max((item.profit / maxProfit) * 100, minHeight)
  }));
};