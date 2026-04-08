import { Alert, Button, Card, Input, Space, Typography } from 'antd';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api, { type StockChartResponse } from '../services/api';

declare global {
  interface Window {
    LightweightCharts?: {
      createChart: (container: HTMLElement, options: Record<string, unknown>) => ChartApi;
      ColorType: { Solid: string };
    };
  }
}

type SeriesDataPoint = {
  time: string;
  value: number;
};

type CandleDataPoint = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

type HistogramDataPoint = SeriesDataPoint & {
  color?: string;
};

type SeriesApi<T> = {
  setData: (data: T[]) => void;
  update: (data: T) => void;
};

type ChartApi = {
  addCandlestickSeries: (options: Record<string, unknown>) => SeriesApi<CandleDataPoint>;
  addLineSeries: (options: Record<string, unknown>) => SeriesApi<SeriesDataPoint>;
  addHistogramSeries: (options: Record<string, unknown>) => SeriesApi<HistogramDataPoint>;
  applyOptions: (options: Record<string, unknown>) => void;
  timeScale: () => { fitContent: () => void };
  remove: () => void;
};

const FINNHUB_SOCKET_URL = 'wss://ws.finnhub.io';
const LIGHTWEIGHT_CHART_SCRIPT =
  'https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js';

const StockChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ChartApi | null>(null);
  const candleSeriesRef = useRef<SeriesApi<CandleDataPoint> | null>(null);
  const ma5SeriesRef = useRef<SeriesApi<SeriesDataPoint> | null>(null);
  const ma20SeriesRef = useRef<SeriesApi<SeriesDataPoint> | null>(null);
  const volumeSeriesRef = useRef<SeriesApi<HistogramDataPoint> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [symbolInput, setSymbolInput] = useState('AAPL');
  const [activeSymbol, setActiveSymbol] = useState('AAPL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [chartData, setChartData] = useState<StockChartResponse | null>(null);

  const finnhubToken = useMemo(() => import.meta.env.VITE_FINNHUB_TOKEN as string | undefined, []);

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

  const fetchStock = useCallback(async (symbol: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.getStockChart(symbol);
      setChartData(data);
      const lastClose = data.prices.at(-1)?.close ?? null;
      setCurrentPrice(lastClose);
      setActiveSymbol(symbol.toUpperCase());
    } catch {
      setError('Failed to load stock history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStock('AAPL');
  }, [fetchStock]);

  useEffect(() => {
    const renderChart = async () => {
      if (!chartContainerRef.current || !chartData) {
        return;
      }

      const LightweightCharts = await loadChartLibrary();

      chartRef.current?.remove();
      const chart = LightweightCharts.createChart(chartContainerRef.current, {
        height: 520,
        layout: {
          background: { type: LightweightCharts.ColorType.Solid, color: '#ffffff' },
          textColor: '#1f2937',
        },
        grid: {
          vertLines: { color: '#f2f2f2' },
          horzLines: { color: '#f2f2f2' },
        },
        rightPriceScale: {
          scaleMargins: { top: 0.05, bottom: 0.32 },
        },
      });

      const candles = chart.addCandlestickSeries({
        upColor: '#16a34a',
        downColor: '#dc2626',
        wickUpColor: '#16a34a',
        wickDownColor: '#dc2626',
        borderVisible: false,
      });

      const ma5 = chart.addLineSeries({ color: '#2563eb', lineWidth: 2 });
      const ma20 = chart.addLineSeries({ color: '#f59e0b', lineWidth: 2 });
      const volume = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: '',
        color: '#94a3b8',
      });

      const candleData: CandleDataPoint[] = chartData.prices.map((point) => ({
        time: point.time.slice(0, 10),
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
      }));

      const ma5Data: SeriesDataPoint[] = chartData.ma5.map((point) => ({
        time: point.time.slice(0, 10),
        value: point.value,
      }));

      const ma20Data: SeriesDataPoint[] = chartData.ma20.map((point) => ({
        time: point.time.slice(0, 10),
        value: point.value,
      }));

      const volumeData: HistogramDataPoint[] = chartData.prices.map((point) => ({
        time: point.time.slice(0, 10),
        value: point.volume,
        color: point.close >= point.open ? '#22c55e80' : '#ef444480',
      }));

      candles.setData(candleData);
      ma5.setData(ma5Data);
      ma20.setData(ma20Data);
      volume.setData(volumeData);
      chart.timeScale().fitContent();

      chartRef.current = chart;
      candleSeriesRef.current = candles;
      ma5SeriesRef.current = ma5;
      ma20SeriesRef.current = ma20;
      volumeSeriesRef.current = volume;
    };

    void renderChart();

    return () => {
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, [chartData, loadChartLibrary]);

  useEffect(() => {
    wsRef.current?.close();
    wsRef.current = null;

    if (!activeSymbol || !finnhubToken) {
      return;
    }

    const socket = new WebSocket(`${FINNHUB_SOCKET_URL}?token=${finnhubToken}`);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'subscribe', symbol: activeSymbol }));
    };

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { data?: Array<{ p: number; t: number }> };
      const trade = payload.data?.at(-1);
      if (!trade) {
        return;
      }

      setCurrentPrice(trade.p);

      const candleSeries = candleSeriesRef.current;
      if (!candleSeries || !chartData?.prices.length) {
        return;
      }

      const latestHistorical = chartData.prices[chartData.prices.length - 1];
      const latestDate = latestHistorical.time.slice(0, 10);
      candleSeries.update({
        time: latestDate,
        open: latestHistorical.open,
        high: Math.max(latestHistorical.high, trade.p),
        low: Math.min(latestHistorical.low, trade.p),
        close: trade.p,
      });
    };

    socket.onerror = () => {
      setError((prev) => prev ?? 'Finnhub websocket disconnected.');
    };

    wsRef.current = socket;

    return () => {
      socket.close();
      wsRef.current = null;
    };
  }, [activeSymbol, chartData, finnhubToken]);

  return (
    <Card title="Stock Dashboard" bordered={false}>
      <Space style={{ marginBottom: 16 }}>
        <Input
          style={{ width: 180 }}
          value={symbolInput}
          onChange={(event) => setSymbolInput(event.target.value.toUpperCase())}
          placeholder="Symbol"
        />
        <Button type="primary" loading={loading} onClick={() => void fetchStock(symbolInput || 'AAPL')}>
          Load
        </Button>
      </Space>

      <Typography.Title level={4} style={{ marginTop: 0 }}>
        {activeSymbol} Real-time Price: {currentPrice ? `$${currentPrice.toFixed(2)}` : '--'}
      </Typography.Title>

      {!finnhubToken && (
        <Alert
          style={{ marginBottom: 12 }}
          type="warning"
          message="Set VITE_FINNHUB_TOKEN in frontend env to enable real-time data."
        />
      )}

      {error && (
        <Alert style={{ marginBottom: 12 }} type="error" message={error} />
      )}

      <div ref={chartContainerRef} style={{ width: '100%', minHeight: 520 }} />
    </Card>
  );
};

export default StockChart;
