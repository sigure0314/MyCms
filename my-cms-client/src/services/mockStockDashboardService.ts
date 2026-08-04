import type { IStockDashboardService } from './stockResearchService';
import type { FinancialMetricSeries, StockDashboardViewModel } from '../types/stockDashboard';

const months = Array.from({ length: 24 }, (_, index) => `${String((index % 12) + 1).padStart(2, '0')}月`);
const waves = (length: number, base: number, step: number) => Array.from({ length }, (_, i) => Number((base + Math.sin(i * .8) * step + i * step * .18).toFixed(2)));

const financials: FinancialMetricSeries[] = [
  { key: 'revenue', title: '近 24 個月營收', period: '2024/09–2026/08', labels: months, series: [{ name: '營收（億元）', values: waves(24, 1950, 180), color: '#3b82f6', type: 'bar' }, { name: '年增率（%）', values: waves(24, 18, 7), color: '#ef4444', type: 'line' }] },
  { key: 'eps', title: '最近 8 季 EPS', period: '2024 Q3–2026 Q2', labels: ['24Q3','24Q4','25Q1','25Q2','25Q3','25Q4','26Q1','26Q2'], series: [{ name: 'EPS（元）', values: [12.54, 14.45, 13.94, 15.36, 16.21, 17.02, 16.48, 18.12], color: '#6366f1', type: 'bar' }] },
  { key: 'margin', title: '毛利率與營業利益率', period: '最近 8 季', labels: ['24Q3','24Q4','25Q1','25Q2','25Q3','25Q4','26Q1','26Q2'], series: [{ name: '毛利率', values: [54.3, 55.1, 56.2, 57.8, 58.1, 57.4, 58.6, 59.1], color: '#ef4444', type: 'line' }, { name: '營益率', values: [44.2, 45.0, 46.1, 47.5, 48.2, 47.8, 48.9, 49.3], color: '#f59e0b', type: 'line' }] },
  { key: 'roe-fcf', title: 'ROE 與自由現金流', period: '最近 8 季', labels: ['24Q3','24Q4','25Q1','25Q2','25Q3','25Q4','26Q1','26Q2'], series: [{ name: 'ROE（%）', values: [7.2, 7.8, 8.1, 8.4, 8.8, 9.1, 9.0, 9.5], color: '#10b981', type: 'line' }, { name: '自由現金流（百億）', values: [5.2, 6.1, 4.8, 7.2, 6.8, 8.3, 7.9, 9.1], color: '#0ea5e9', type: 'bar' }] },
];

const names: Record<string, string> = { '2330': '台積電', '2317': '鴻海', '2454': '聯發科', '2308': '台達電' };

export class MockStockDashboardService implements IStockDashboardService {
  async getDashboard(stockNo: string): Promise<StockDashboardViewModel | null> {
    await new Promise(resolve => window.setTimeout(resolve, 450));
    const normalized = stockNo.trim();
    const now = new Date().toISOString();
    return {
      summary: { name: names[normalized] ?? '台股公司', stockNo: normalized, market: '上市 · TWSE', updatedAt: now, source: '示範資料', isMock: true },
      quote: { currentPrice: 2425, change: 35, changePercent: 1.46, open: 2395, high: 2440, low: 2385, previousClose: 2390, volume: 28694581, turnover: 69480000000 },
      valuationMetrics: [
        { key:'pe', name:'本益比 PE', value:22.4, unit:'倍', comparison:'高於五年平均 12%', date:'2026-08-02' }, { key:'pb', name:'股價淨值比 PB', value:7.1, unit:'倍', comparison:'高於五年平均 8%', date:'2026-08-02' },
        { key:'yield', name:'殖利率', value:1.75, unit:'%', comparison:'低於五年平均 0.3%', date:'2026-08-02' }, { key:'eps', name:'EPS', value:62.3, unit:'元', comparison:'年增 18.6%', date:'2026-06-30' },
        { key:'roe', name:'ROE', value:31.6, unit:'%', comparison:'高於同業平均 9.2%', date:'2026-06-30' }, { key:'cap', name:'市值', value:62.89, unit:'兆元', comparison:'台股市值排名第 1', date:'2026-08-02' },
      ], financials,
      institutionalTrading: { labels: Array.from({length:20},(_,i)=>`07/${14+i}`), foreign: waves(20, 1200, 420).map((v,i)=>i%4===0?-v:v), investmentTrust: waves(20, 180, 90), dealer: waves(20, 50, 120).map((v,i)=>i%3===0?-v:v), source: '近 20 日示範資料', isMock: true },
      marginTrading: { financingBalance: 34128, shortBalance: 8214, securitiesLending: 23851, financingChange: -824, shortChange: 316, lendingChange: 524, date:'2026-08-02', source: '示範資料', isMock: true },
      shareholdingDistribution: ['1–10 張','11–50 張','51–100 張','101–400 張','400 張以上'].map((range,i)=>({range,thisWeek:[19.6,14.2,7.8,10.5,47.9][i],lastWeek:[20.1,14.4,7.9,10.6,47.0][i]})),
      events: [ {id:'e1',title:'股東常會',date:'2026-06-04',detail:'年度股東常會',isPast:true}, {id:'e2',title:'除息日',date:'2026-06-18',detail:'現金股利 5.00 元',isPast:true}, {id:'e3',title:'法說會',date:'2026-10-15',detail:'2026 年第三季法人說明會',isPast:false}, {id:'e4',title:'財報公布',date:'2026-11-12',detail:'2026 年第三季財務報告',isPast:false}, {id:'e5',title:'股票股利',date:'2026-12-01',detail:'本期股票股利 0 元',isPast:false} ],
      news: [
        {id:'n1',title:'先進製程需求續強，法人關注下半年展望',source:'研究市場日報',publishedAt:now,summary:'高效能運算與 AI 需求支撐先進製程產能利用率，市場持續關注資本支出與海外廠進度。',sentiment:'positive',url:'#'},
        {id:'n2',title:'供應鏈進入旺季，匯率仍是短期觀察重點',source:'產業觀察',publishedAt:'2026-08-03T08:30:00Z',summary:'主要客戶新品備貨逐步展開，但新台幣波動可能影響單季毛利率表現。',sentiment:'neutral',url:'#'},
        {id:'n3',title:'海外擴廠成本升高，市場評估折舊壓力',source:'財經焦點',publishedAt:'2026-08-02T06:10:00Z',summary:'海外新廠量產初期成本與折舊增加，可能成為未來數季獲利率的潛在壓力。',sentiment:'negative',url:'#'},
      ],
      aiResearch: { highlights:['外資近五日偏多','月營收年增 24.8%','短線成交量放大','本益比高於歷史平均'], positives:['先進製程需求維持強勁','高效能運算營收占比提升','自由現金流持續改善'], risks:['目前估值高於五年平均','海外擴廠初期成本增加','匯率波動影響毛利率'], assessment:'中性偏多', score:78, generatedAt:now },
    };
  }
}
export const stockDashboardService = new MockStockDashboardService();
