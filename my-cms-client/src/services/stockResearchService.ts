import type { StockDashboardViewModel } from '../types/stockDashboard';

export interface IStockDashboardService { getDashboard(stockNo: string): Promise<StockDashboardViewModel | null>; }
export interface IAiResearchService { analyze(stockNo: string): Promise<StockDashboardViewModel['aiResearch']>; }
export interface ITaiwanMarketDataService {
  getTwseData(stockNo: string): Promise<unknown>;
  getTpexData(stockNo: string): Promise<unknown>;
  getTdccDistribution(stockNo: string): Promise<unknown>;
}

// Phase 2 replacement point: implement these interfaces with OpenAI/local LLM and TWSE/TPEx/TDCC APIs.

