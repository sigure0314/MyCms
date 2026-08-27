import { CheckCircleFilled, ExclamationCircleFilled, LinkOutlined, RobotOutlined } from '@ant-design/icons';
import { Card, Col, Empty, Progress, Row, Space, Tag, Timeline, Typography } from 'antd';
import type { AiResearchSummary, StockDashboardViewModel } from '../../types/stockDashboard';
import { formatCompactNumber, formatDate, formatDateTime, formatInteger, formatNumber, formatPercent, formatSigned, getChangeTone } from '../../utils/stockFormatters';

const { Text, Title } = Typography;

export const StockSummaryCard = ({ data }: { data: StockDashboardViewModel }) => {
  const tone = getChangeTone(data.quote.change);
  const fields = [ ['開盤價', formatNumber(data.quote.open)], ['最高價', formatNumber(data.quote.high)], ['最低價', formatNumber(data.quote.low)], ['昨收價', formatNumber(data.quote.previousClose)], ['成交量', `${formatInteger(data.quote.volume)} 股`], ['成交金額', formatCompactNumber(data.quote.turnover)] ];
  return <Card className="dashboard-card summary-card">
    <div className="summary-main"><div><Text type="secondary">{data.summary.market}</Text><Title level={2}>{data.summary.name} <small>{data.summary.stockNo}</small></Title></div><div className={`quote-main ${tone}`}><strong>{formatNumber(data.quote.currentPrice)}</strong><span>{formatSigned(data.quote.change)}（{formatPercent(data.quote.changePercent)}）</span></div></div>
    <div className="quote-grid">{fields.map(([label,value])=><div key={label}><Text type="secondary">{label}</Text><b>{value}</b></div>)}</div>
    <Text type="secondary" className="updated-at">
      更新時間：{formatDateTime(data.summary.updatedAt)} · 資料來源：{data.summary.source}
    </Text>
  </Card>;
};

export const MetricsGrid = ({ metrics }: { metrics: StockDashboardViewModel['valuationMetrics'] }) => <Row gutter={[16,16]}>{metrics.map(metric=><Col xs={12} md={8} xl={4} key={metric.key}><Card className="dashboard-card metric-card"><Text type="secondary">{metric.name}</Text><div className="metric-value">{formatNumber(metric.value)} <small>{metric.unit}</small></div><Text className="metric-compare">{metric.comparison}</Text><Text type="secondary" className="metric-date">資料日期：{formatDate(metric.date)}</Text></Card></Col>)}</Row>;

export const AiResearchCard = ({ data }: { data: AiResearchSummary }) => <Card className="dashboard-card ai-card" title={<Space><RobotOutlined />AI 重點摘要 <Tag color="blue">Mock</Tag></Space>}>
  <section><h4>今日重點</h4><ul>{data.highlights.map(item=><li key={item}>{item}</li>)}</ul></section>
  <Row gutter={16}><Col span={12}><h4 className="positive-heading">正面因素</h4>{data.positives.map(item=><p className="factor" key={item}><CheckCircleFilled />{item}</p>)}</Col><Col span={12}><h4 className="risk-heading">風險因素</h4>{data.risks.map(item=><p className="factor risk" key={item}><ExclamationCircleFilled />{item}</p>)}</Col></Row>
  <div className="ai-score"><div><Text type="secondary">綜合評估</Text><strong>{data.assessment}</strong></div><Progress type="circle" percent={data.score} size={82} strokeColor="#ef4444" format={value=>`${value} 分`} /></div>
  <div className="disclaimer">以上內容為資料整理與研究輔助，不構成投資建議。</div>
</Card>;

export const ChipAnalysis = ({ data }: { data: StockDashboardViewModel }) => <Row gutter={[16,16]}>
  <Col xs={24} xl={10}><Card className="dashboard-card" title="三大法人（近 20 日）"><MiniInstitutionalChart data={data.institutionalTrading} /></Card></Col>
  <Col xs={24} md={12} xl={7}><Card className="dashboard-card" title="融資融券"><div className="data-list">{[['融資餘額',`${formatInteger(data.marginTrading.financingBalance)} 張`,data.marginTrading.financingChange],['融券餘額',`${formatInteger(data.marginTrading.shortBalance)} 張`,data.marginTrading.shortChange],['借券賣出',`${formatInteger(data.marginTrading.securitiesLending)} 張`,data.marginTrading.lendingChange]].map(([a,b,c])=><div key={String(a)}><span>{a}</span><b>{b}</b><em className={getChangeTone(Number(c))}>{formatSigned(Number(c))}</em></div>)}</div><Text type="secondary">資料日期：{formatDate(data.marginTrading.date)} · {data.marginTrading.source}</Text></Card></Col>
  <Col xs={24} md={12} xl={7}><Card className="dashboard-card" title="股權分散"><div className="share-table"><div><b>持股級距</b><b>本週</b><b>週變化</b></div>{data.shareholdingDistribution.map(x=><div key={x.range}><span>{x.range}</span><b>{formatPercent(x.thisWeek)}</b><em className={getChangeTone(x.thisWeek-x.lastWeek)}>{formatSigned(x.thisWeek-x.lastWeek)}%</em></div>)}</div></Card></Col>
  </Row>;

const MiniInstitutionalChart = ({data}:{data:StockDashboardViewModel['institutionalTrading']}) => { const values=data.foreign; const max=Math.max(...values.map(Math.abs)); return <div className="institutional-chart"><div className="chart-legend"><span className="foreign">外資</span><span className="trust">投信</span><span className="dealer">自營商</span></div><div className="bar-area">{values.map((value,i)=><div className="bar-column" key={`${data.labels[i]}-${i}`} title={`${data.labels[i]} 外資 ${formatInteger(value)} 張`}><i className={value>=0?'positive-bar':'negative-bar'} style={{height:`${Math.max(4,Math.abs(value)/max*46)}%`}} /></div>)}</div><Text type="secondary">單位：張；{data.source}；滑鼠移至柱狀圖查看資料</Text></div> };

export const EventsAndNews = ({ data }: { data: StockDashboardViewModel }) => <Row gutter={[16,16]}>
  <Col xs={24} xl={9}><Card className="dashboard-card" title="公司事件"><Timeline items={data.events.map(event=>({color:event.isPast?'gray':'blue',children:<div className={event.isPast?'past-event':''}><b>{event.title}</b><Text>{formatDate(event.date)} · {event.detail}</Text><Tag>{event.isPast?'已完成':'即將到來'}</Tag></div>}))} /></Card></Col>
  <Col xs={24} xl={15}><Card className="dashboard-card" title="最新新聞">{data.news.length===0?<Empty description="目前沒有新聞"/>:<div className="news-list">{data.news.map(news=><article key={news.id}><div><Tag color={{positive:'red',neutral:'default',negative:'green'}[news.sentiment]}>{({positive:'正面',neutral:'中性',negative:'負面'} as const)[news.sentiment]}</Tag><Text type="secondary">{news.source} · {formatDateTime(news.publishedAt)}</Text></div><h3>{news.title}</h3><p>{news.summary}</p><a href={news.url} onClick={e=>news.url==='#'&&e.preventDefault()}>閱讀原文 <LinkOutlined /></a></article>)}</div>}</Card></Col>
  </Row>;
