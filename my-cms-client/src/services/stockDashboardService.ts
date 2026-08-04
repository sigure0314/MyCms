import axios from 'axios';
import api, { type TaiwanInstitutionalTradingSnapshot, type TaiwanStockOpenDataSnapshot } from './api';
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
    let institutional: TaiwanInstitutionalTradingSnapshot | null = null;
    try {
      const [dashboardResponse, institutionalResponse] = await Promise.all([
        api.getStockDashboard(stockNo),
        api.getInstitutionalTrading(stockNo).catch(() => null),
      ]);
      live = dashboardResponse.data;
      institutional = institutionalResponse?.data ?? null;
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

    const institutionalTrading = institutional
      ? {
          ...mock.institutionalTrading,
          labels: replaceLast(mock.institutionalTrading.labels, formatInstitutionalDate(institutional.tradeDate)),
          foreign: replaceLast(mock.institutionalTrading.foreign, sharesToLots(institutional.foreignInvestorNet)),
          investmentTrust: replaceLast(mock.institutionalTrading.investmentTrust, sharesToLots(institutional.investmentTrustNet)),
          dealer: replaceLast(mock.institutionalTrading.dealer, sharesToLots(institutional.dealerNet)),
          latestDate: institutional.tradeDate ?? undefined,
          source: `${institutional.source}（最新一日）；其餘 19 日為示範資料`,
          isMock: false,
        }
      : mock.institutionalTrading;

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
      institutionalTrading,
    };
  }
}

const replaceLast = <T>(values: T[], latest: T): T[] => [
  ...values.slice(0, -1),
  latest,
];

const sharesToLots = (shares: number) => shares / 1000;

const formatInstitutionalDate = (date?: string | null) => date
  ? new Intl.DateTimeFormat('zh-TW', { month: '2-digit', day: '2-digit' }).format(new Date(date))
  : '最新日';

export const stockDashboardService = new OpenDataStockDashboardService();
