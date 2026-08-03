import { Card, Col, Empty, Row, Skeleton, Typography } from 'antd';
import type { DataStatus, FinancialMetricSeries } from '../../types/stockDashboard';

const MiniChart = ({ chart }: { chart: FinancialMetricSeries }) => {
  const all = chart.series.flatMap(x=>x.values); const min=Math.min(0,...all); const max=Math.max(...all); const range=max-min||1;
  const points=(values:number[])=>values.map((v,i)=>`${(i/(values.length-1||1))*100},${94-((v-min)/range)*78}`).join(' ');
  return <div className="mini-chart" role="img" aria-label={`${chart.title} mock 圖表`}><svg viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="0" y1="94" x2="100" y2="94" className="axis"/>{chart.series.map((series,sIndex)=>series.type==='bar'?series.values.map((v,i)=><rect key={`${series.name}-${i}`} x={(i/series.values.length)*100+1+sIndex*2} y={94-((v-min)/range)*78} width={Math.max(1.5,75/series.values.length/chart.series.length)} height={((v-min)/range)*78} fill={series.color} opacity=".72"><title>{chart.labels[i]} · {series.name}: {v}</title></rect>):<polyline key={series.name} points={points(series.values)} fill="none" stroke={series.color} strokeWidth="1.8" vectorEffect="non-scaling-stroke"><title>{series.name}</title></polyline>)}</svg><div className="chart-legend">{chart.series.map(x=><span key={x.name} style={{'--legend-color':x.color} as React.CSSProperties}>{x.name}</span>)}</div></div>;
};

export const FinancialCharts = ({ charts, status }: { charts: FinancialMetricSeries[]; status: DataStatus }) => {
  if(status==='loading') return <Row gutter={[16,16]}>{[1,2,3,4].map(x=><Col xs={24} lg={12} key={x}><Card><Skeleton active /></Card></Col>)}</Row>;
  if(status==='empty') return <Card><Empty description="目前沒有基本面資料" /></Card>;
  return <Row gutter={[16,16]}>{charts.map(chart=><Col xs={24} lg={12} key={chart.key}><Card className="dashboard-card chart-card" title={chart.title} extra={<Typography.Text type="secondary">{chart.period}</Typography.Text>}><MiniChart chart={chart}/></Card></Col>)}</Row>;
};

