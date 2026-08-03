import axios from 'axios';
import api, { type TaiwanStockOpenDataSnapshot } from './api';
import { stockDashboardService as mockService } from './mockStockDashboardService';
import type { IStockDashboardService } from './stockResearchService';
import type { StockDashboardViewModel, ValuationMetrics } from '../types/stockDashboard';

const replaceMetric = (
  metrics: ValuationMetrics[],
  key: string,
  value: number | null | undefined,
  date: string,
) => metrics.map(metric => value == null || metric.key !== key
  ? metric
  : { ...metric, value, comparison: '資料來源：TWSE OpenAPI', date });

class OpenDataStockDashboardService implements IStockDashboardService {
  async getDashboard(stockNo: string): Promise<StockDashboardViewModel | null> {
    const mock = await mockService.getDashboard(stockNo);
    if (!mock) {
      return null;
    }

    let live: TaiwanStockOpenDataSnapshot;
    try {
      ({ data: live } = await api.getStockDashboard(stockNo));
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }

      return {
        ...mock,
        summary: {
          ...mock.summary,
          source: '示範資料（TWSE OpenAPI 暫時無法取得）',
          isMock: true,
        },
      };
    }
    const dataDate = live.updatedAt.slice(0, 10);
    let metrics = replaceMetric(mock.valuationMetrics, 'pe', live.peRatio, dataDate);
    metrics = replaceMetric(metrics, 'pb', live.pbRatio, dataDate);
    metrics = replaceMetric(metrics, 'yield', live.dividendYield, dataDate);

    return {
      ...mock,
      summary: {
        name: live.name,
        stockNo: live.stockNo,
        market: live.market,
        updatedAt: live.updatedAt,
        source: live.source,
        isMock: false,
      },
      quote: {
        currentPrice: live.currentPrice,
        change: live.change,
        changePercent: live.changePercent,
        open: live.open,
        high: live.high,
        low: live.low,
        previousClose: live.previousClose,
        volume: live.volume,
        turnover: live.turnover,
      },
      valuationMetrics: metrics,
    };
  }
}

export const stockDashboardService = new OpenDataStockDashboardService();
