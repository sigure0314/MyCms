export type DataStatus = 'loading' | 'success' | 'empty' | 'error';
export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface StockSummary { name: string; stockNo: string; market: string; updatedAt: string; source: string; isMock: boolean; }
export interface StockQuote { currentPrice: number; change: number; changePercent: number; open: number; high: number; low: number; previousClose: number; volume: number; turnover: number; }
export interface ValuationMetrics { key: string; name: string; value: number; unit: string; comparison: string; date: string; }
export interface FinancialMetricSeries { key: string; title: string; period: string; labels: string[]; series: Array<{ name: string; values: number[]; color: string; type: 'bar' | 'line' }>; }
export interface InstitutionalTrading { labels: string[]; foreign: number[]; investmentTrust: number[]; dealer: number[]; }
export interface MarginTrading { financingBalance: number; shortBalance: number; securitiesLending: number; financingChange: number; shortChange: number; lendingChange: number; date: string; }
export interface ShareholdingDistribution { range: string; thisWeek: number; lastWeek: number; } 
export interface StockEvent { id: string; title: string; date: string; detail: string; isPast: boolean; }
export interface StockNews { id: string; title: string; source: string; publishedAt: string; summary: string; sentiment: Sentiment; url: string; }
export interface AiResearchSummary { highlights: string[]; positives: string[]; risks: string[]; assessment: '偏多' | '中性偏多' | '中性' | '中性偏空' | '偏空'; score: number; generatedAt: string; }
export interface StockDashboardViewModel { summary: StockSummary; quote: StockQuote; valuationMetrics: ValuationMetrics[]; financials: FinancialMetricSeries[]; institutionalTrading: InstitutionalTrading; marginTrading: MarginTrading; shareholdingDistribution: ShareholdingDistribution[]; events: StockEvent[]; news: StockNews[]; aiResearch: AiResearchSummary; }
