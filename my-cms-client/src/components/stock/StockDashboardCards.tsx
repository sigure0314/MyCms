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
  <Col xs={24} xl={10}><Card className="dashboard-card" title="三大法人買賣超" extra={<SourceTag mock={data.institutionalTrading.isMock}/>}><MiniInstitutionalChart data={data.institutionalTrading} /></Card></Col>
  <Col xs={24} md={12} xl={7}><Card className="dashboard-card" title="融資融券" extra={<SourceTag mock={data.marginTrading.isMock}/>}><div className="data-list">{[['融資餘額',`${formatInteger(data.marginTrading.financingBalance)} 張`,data.marginTrading.financingChange],['融券餘額',`${formatInteger(data.marginTrading.shortBalance)} 張`,data.marginTrading.shortChange]].map(([a,b,c])=><div key={String(a)}><span>{a}</span><b>{b}</b><em className={getChangeTone(Number(c))}>{formatSigned(Number(c))} 張</em></div>)}</div><Text type="secondary">資料日期：{formatDate(data.marginTrading.date)}<br/>資料來源：{data.marginTrading.source}</Text></Card></Col>
  <Col xs={24} md={12} xl={7}><Card className="dashboard-card" title="股權分散" extra={<SourceTag mock={data.shareholdingIsMock}/>}><div className="share-table"><div><b>持股級距</b><b>占比</b><b>人數</b></div>{data.shareholdingDistribution.map(x=><div key={x.range}><span>{x.range}</span><b>{formatPercent(x.thisWeek)}</b><em>{x.holders == null?'—':formatInteger(x.holders)}</em></div>)}</div><Text type="secondary">資料日期：{formatDate(data.shareholdingDate ?? '')}<br/>資料來源：{data.shareholdingSource}</Text></Card></Col>
  </Row>;

const SourceTag = ({mock}:{mock:boolean}) => <Tag color={mock?'orange':'green'}>{mock?'示範資料':'公開資料'}</Tag>;

const MiniInstitutionalChart = ({data}:{data:StockDashboardViewModel['institutionalTrading']}) => { const all=[...data.foreign,...data.investmentTrust,...data.dealer]; const max=Math.max(1,...all.map(Math.abs)); return <div className="institutional-chart"><div className="chart-legend"><span className="foreign">外資</span><span className="trust">投信</span><span className="dealer">自營商</span></div><div className="bar-area">{data.labels.map((label,i)=><div className="institution-group" key={`${label}-${i}`}><div className="institution-bars">{([{name:'外資',value:data.foreign[i],className:'foreign-bar'},{name:'投信',value:data.investmentTrust[i],className:'trust-bar'},{name:'自營商',value:data.dealer[i],className:'dealer-bar'}]).map(item=><i key={item.name} className={`${item.className} ${item.value>=0?'positive':'negative'}`} title={`${label} ${item.name} ${formatInteger(item.value)} 張`} style={{height:`${Math.max(6,Math.abs(item.value)/max*46)}%`}} />)}</div><small>{label}</small></div>)}</div><Text type="secondary">單位：張；{data.source}；滑鼠移至柱狀圖查看明細</Text></div> };

export const EventsAndNews = ({ data }: { data: StockDashboardViewModel }) => <Row gutter={[16,16]}>
  <Col xs={24} xl={9}><Card className="dashboard-card" title="公司事件"><Timeline items={data.events.map(event=>({color:event.isPast?'gray':'blue',children:<div className={event.isPast?'past-event':''}><b>{event.title}</b><Text>{formatDate(event.date)} · {event.detail}</Text><Tag>{event.isPast?'已完成':'即將到來'}</Tag></div>}))} /></Card></Col>
  <Col xs={24} xl={15}><Card className="dashboard-card" title="最新新聞">{data.news.length===0?<Empty description="目前沒有新聞"/>:<div className="news-list">{data.news.map(news=><article key={news.id}><div><Tag color={{positive:'red',neutral:'default',negative:'green'}[news.sentiment]}>{({positive:'正面',neutral:'中性',negative:'負面'} as const)[news.sentiment]}</Tag><Text type="secondary">{news.source} · {formatDateTime(news.publishedAt)}</Text></div><h3>{news.title}</h3><p>{news.summary}</p><a href={news.url} onClick={e=>news.url==='#'&&e.preventDefault()}>閱讀原文 <LinkOutlined /></a></article>)}</div>}</Card></Col>
  </Row>;
