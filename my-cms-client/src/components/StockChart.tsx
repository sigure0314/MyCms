import { Alert, Button, Card, Input, Space, Typography } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import api, { type TaiwanStockKLineResponse } from '../services/api';

declare global {
  interface Window {
    LightweightCharts?: {
      createChart: (container: HTMLElement, options: Record<string, unknown>) => ChartApi;
      ColorType: { Solid: string };
    };
  }
}

type CandleDataPoint = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

type HistogramDataPoint = {
  time: string;
  value: number;
  color?: string;
};

type SeriesApi<T> = {
  setData: (data: T[]) => void;
};

type ChartApi = {
  addCandlestickSeries: (options: Record<string, unknown>) => SeriesApi<CandleDataPoint>;
  addHistogramSeries: (options: Record<string, unknown>) => SeriesApi<HistogramDataPoint>;
  timeScale: () => { fitContent: () => void };
  remove: () => void;
};

const LIGHTWEIGHT_CHART_SCRIPT =
  'https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js';

const StockChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ChartApi | null>(null);

  const [stockNoInput, setStockNoInput] = useState('2330');
  const [activeStockNo, setActiveStockNo] = useState('2330');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<TaiwanStockKLineResponse | null>(null);

  const loadChartLibrary = useCallback(async () => {
    if (window.LightweightCharts) {
      return window.LightweightCharts;
    }

    await new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${LIGHTWEIGHT_CHART_SCRIPT}"]`,
      );

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Failed to load chart library')), {
          once: true,
        });
        return;
      }

      const script = document.createElement('script');
      script.src = LIGHTWEIGHT_CHART_SCRIPT;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load chart library'));
      document.body.appendChild(script);
    });

    if (!window.LightweightCharts) {
      throw new Error('Lightweight Charts did not initialize.');
    }

    return window.LightweightCharts;
  }, []);

  const fetchStock = useCallback(async (stockNo: string) => {
    setLoading(true);
    setError(null);

    try {
      const normalizedStockNo = stockNo.trim() || '2330';
      const { data } = await api.getStockChart(normalizedStockNo);
      setChartData(data);
      setActiveStockNo(normalizedStockNo);
    } catch {
      setError('Failed to load Taiwan stock K-line data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStock('2330');
  }, [fetchStock]);

  useEffect(() => {
    const renderChart = async () => {
      if (!chartContainerRef.current || !chartData) {
        return;
      }

      const LightweightCharts = await loadChartLibrary();

      chartRef.current?.remove();
      const chart = LightweightCharts.createChart(chartContainerRef.current, {
        height: 560,
        layout: {
          background: { type: LightweightCharts.ColorType.Solid, color: '#ffffff' },
          textColor: '#1f2937',
        },
        grid: {
          vertLines: { color: '#f2f2f2' },
          horzLines: { color: '#f2f2f2' },
        },
        rightPriceScale: {
          scaleMargins: { top: 0.08, bottom: 0.3 },
        },
      });

      const candles = chart.addCandlestickSeries({
        upColor: '#16a34a',
        downColor: '#dc2626',
        wickUpColor: '#16a34a',
        wickDownColor: '#dc2626',
        borderVisible: false,
      });

      const volume = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: '',
        color: '#94a3b8',
      });

      const candleData: CandleDataPoint[] = chartData.data.map((point) => ({
        time: point.date.slice(0, 10),
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
      }));

      const volumeData: HistogramDataPoint[] = chartData.data.map((point) => ({
        time: point.date.slice(0, 10),
        value: point.volume,
        color: point.close >= point.open ? '#22c55e88' : '#ef444488',
      }));

      candles.setData(candleData);
      volume.setData(volumeData);
      chart.timeScale().fitContent();

      chartRef.current = chart;
    };

    void renderChart();

    return () => {
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, [chartData, loadChartLibrary]);

  return (
    <Card title="Taiwan Stock K-Line" bordered={false}>
      <Space style={{ marginBottom: 16 }}>
        <Input
          style={{ width: 180 }}
          value={stockNoInput}
          onChange={(event) => setStockNoInput(event.target.value)}
          placeholder="Stock No (e.g. 2330)"
        />
        <Button type="primary" loading={loading} onClick={() => void fetchStock(stockNoInput)}>
          Load
        </Button>
      </Space>

      <Typography.Title level={5} style={{ marginTop: 0 }}>
        Stock No: {activeStockNo}
      </Typography.Title>

      {error && <Alert style={{ marginBottom: 12 }} type="error" message={error} />}

      <div ref={chartContainerRef} style={{ width: '100%', minHeight: 560 }} />
    </Card>
  );
};

export default StockChart;
