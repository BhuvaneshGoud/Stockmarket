import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Plus,
  Expand,
  LayoutPanelLeft,
  MousePointer2,
  PenLine,
  Ruler,
  Magnet,
  Eye,
  BarChart3,
  SlidersHorizontal,
  Bell,
  Trash2,
} from "lucide-react";
import {
  createChart,
  CandlestickSeries,
  BarSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
  BaselineSeries,
} from "lightweight-charts";
import { portfolioAPI, marketAPI, stocksAPI } from "../api/api";
import { connectStockSocket, disconnectStockSocket } from "../services/liveStock";
import StockLogo from "../components/StockLogo";

const TIMEFRAME_OPTIONS = [
  { id: "15s", label: "15s" },
  { id: "1m", label: "1m" },
  { id: "5m", label: "5m" },
  { id: "15m", label: "15m" },
  { id: "1h", label: "1h" },
  { id: "1W", label: "1W" },
  { id: "1M", label: "1M" },
  { id: "1Y", label: "1Y" },
];

const CHART_TYPES = [
  { id: "bars", label: "Bars" },
  { id: "candles", label: "Candles" },
  { id: "hollow", label: "Hollow Candles" },
  { id: "volumeCandles", label: "Volume Candles" },
  { id: "line", label: "Line" },
  { id: "lineMarkers", label: "Line With Markers" },
  { id: "stepLine", label: "Step Line" },
  { id: "area", label: "Area" },
  { id: "hlcArea", label: "HLC Area" },
  { id: "baseline", label: "Baseline" },
  { id: "columns", label: "Columns" },
  { id: "highLow", label: "High-Low" },
  { id: "heikin", label: "Heikin Ashi" },
  { id: "renko", label: "Renko" },
  { id: "lineBreak", label: "Line Break" },
  { id: "kagi", label: "Kagi" },
  { id: "pointFigure", label: "Point & Figure" },
  { id: "range", label: "Range" },
];

const RENKO_LIKE_TYPES = new Set(["renko", "lineBreak", "kagi", "pointFigure", "range"]);
const LINE_LIKE_TYPES = new Set(["line", "lineMarkers", "stepLine"]);

const INDICATORS = [
  { id: "sma20", label: "SMA 20" },
  { id: "sma50", label: "SMA 50" },
  { id: "sma200", label: "SMA 200" },
  { id: "ema20", label: "EMA 20" },
  { id: "ema50", label: "EMA 50" },
  { id: "ema200", label: "EMA 200" },
  { id: "wma20", label: "WMA 20" },
  { id: "vwap", label: "VWAP" },
  { id: "bb20", label: "Bollinger Bands (20)" },
  { id: "macd", label: "MACD" },
  { id: "rsi14", label: "RSI 14" },
  { id: "stoch14", label: "Stochastic (14)" },
  { id: "atr14", label: "ATR 14" },
  { id: "cci20", label: "CCI 20" },
  { id: "roc10", label: "ROC 10" },
  { id: "mom10", label: "Momentum 10" },
  { id: "obv", label: "OBV" },
  { id: "adl", label: "Accumulation/Distribution" },
];

const INDICATOR_SHORT_LABEL = {
  sma20: "SMA",
  sma50: "SMA50",
  sma200: "SMA200",
  ema20: "EMA",
  ema50: "EMA50",
  ema200: "EMA200",
  wma20: "WMA",
  vwap: "VWAP",
  bb20: "BB",
  macd: "MACD",
  rsi14: "RSI",
  stoch14: "STOCH",
  atr14: "ATR",
  cci20: "CCI",
  roc10: "ROC",
  mom10: "MOM",
  obv: "OBV",
  adl: "ADL",
};

const TOOL_ITEMS = [
  { id: "cursor", label: "Cursor", Icon: MousePointer2 },
  { id: "trendline", label: "Trendline", Icon: PenLine },
  { id: "arrow", label: "Arrow", Icon: ArrowUpRight },
  { id: "measure", label: "Measure", Icon: Ruler },
  { id: "magnet", label: "Magnet", Icon: Magnet },
  { id: "visibility", label: "Visibility", Icon: Eye },
];

function buildFallbackCandles(price) {
  const p = Math.max(1, Number(price || 100));
  const now = Math.floor(Date.now() / 1000);
  return Array.from({ length: 120 }, (_, i) => {
    const time = now - (119 - i) * 60;
    const drift = Math.sin(i / 8) * p * 0.01;
    const wave = Math.cos(i / 5) * p * 0.004;
    const close = p + drift + wave;
    const open = close + (i % 2 === 0 ? -1 : 1) * p * 0.002;
    const high = Math.max(open, close) + p * 0.003;
    const low = Math.min(open, close) - p * 0.003;
    return {
      timestamp: time,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Math.round(25000 + Math.random() * 70000),
    };
  });
}

function aggregateCandles(candles, bucketSize) {
  if (!candles.length || bucketSize <= 1) {
    return candles;
  }
  const out = [];
  for (let i = 0; i < candles.length; i += bucketSize) {
    const chunk = candles.slice(i, i + bucketSize);
    if (!chunk.length) {
      continue;
    }
    out.push({
      timestamp: chunk[chunk.length - 1].timestamp,
      open: chunk[0].open,
      high: Math.max(...chunk.map((c) => c.high)),
      low: Math.min(...chunk.map((c) => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((sum, c) => sum + (c.volume || 0), 0),
    });
  }
  return out;
}

function withSMA(candles, key, period = 20) {
  return candles.map((c, i) => {
    if (i < period - 1) {
      return { ...c, [key]: null };
    }
    const slice = candles.slice(i - period + 1, i + 1);
    const avg = slice.reduce((sum, x) => sum + x.close, 0) / period;
    return { ...c, [key]: Number(avg.toFixed(2)) };
  });
}

function withEMA(candles, key, period = 20) {
  const k = 2 / (period + 1);
  let prev = candles[0]?.close ?? 0;
  return candles.map((c, i) => {
    if (i === 0) {
      return { ...c, [key]: Number(prev.toFixed(2)) };
    }
    prev = c.close * k + prev * (1 - k);
    return { ...c, [key]: Number(prev.toFixed(2)) };
  });
}

function withWMA(candles, key, period = 20) {
  const weightSum = (period * (period + 1)) / 2;
  return candles.map((c, i) => {
    if (i < period - 1) {
      return { ...c, [key]: null };
    }
    let weighted = 0;
    for (let j = 0; j < period; j += 1) {
      const price = Number(candles[i - period + 1 + j]?.close || 0);
      weighted += price * (j + 1);
    }
    return { ...c, [key]: Number((weighted / weightSum).toFixed(2)) };
  });
}

function withVWAP(candles) {
  let cumulativePV = 0;
  let cumulativeVolume = 0;
  return candles.map((c) => {
    cumulativePV += c.close * (c.volume || 0);
    cumulativeVolume += c.volume || 0;
    const vwap = cumulativeVolume > 0 ? cumulativePV / cumulativeVolume : c.close;
    return { ...c, vwap: Number(vwap.toFixed(2)) };
  });
}

function withBollinger(candles, period = 20, mult = 2) {
  return candles.map((c, i) => {
    if (i < period - 1) {
      return { ...c, bbUpper: null, bbMiddle: null, bbLower: null };
    }
    const slice = candles.slice(i - period + 1, i + 1);
    const mean = slice.reduce((sum, x) => sum + x.close, 0) / period;
    const variance = slice.reduce((sum, x) => sum + (x.close - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    return {
      ...c,
      bbUpper: Number((mean + mult * sd).toFixed(2)),
      bbMiddle: Number(mean.toFixed(2)),
      bbLower: Number((mean - mult * sd).toFixed(2)),
    };
  });
}

function withATR(candles, period = 14) {
  if (!candles.length) return candles;
  const tr = candles.map((c, i) => {
    const prevClose = Number(candles[i - 1]?.close ?? c.close);
    const high = Number(c.high || c.close || 0);
    const low = Number(c.low || c.close || 0);
    return Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
  });
  return candles.map((c, i) => {
    if (i < period - 1) return { ...c, atr14: null };
    const slice = tr.slice(i - period + 1, i + 1);
    const avg = slice.reduce((s, x) => s + x, 0) / period;
    return { ...c, atr14: Number(avg.toFixed(2)) };
  });
}

function withMACD(candles) {
  const ema12 = withEMA(candles, "ema12", 12);
  const ema26 = withEMA(ema12, "ema26", 26);
  const withMacdLine = ema26.map((c) => ({
    ...c,
    macd: c.ema12 != null && c.ema26 != null ? Number((c.ema12 - c.ema26).toFixed(2)) : null,
  }));
  let prevSignal = withMacdLine[0]?.macd ?? 0;
  const k = 2 / (9 + 1);
  return withMacdLine.map((c, i) => {
    if (i === 0 || c.macd == null) {
      return { ...c, signal: c.macd ?? 0 };
    }
    prevSignal = c.macd * k + prevSignal * (1 - k);
    return { ...c, signal: Number(prevSignal.toFixed(2)) };
  });
}

function withStochastic(candles, period = 14, signal = 3) {
  const out = candles.map((c, i) => {
    if (i < period - 1) return { ...c, stochK: null, stochD: null };
    const slice = candles.slice(i - period + 1, i + 1);
    const highest = Math.max(...slice.map((x) => Number(x.high || x.close || 0)));
    const lowest = Math.min(...slice.map((x) => Number(x.low || x.close || 0)));
    const k = highest === lowest ? 50 : ((Number(c.close || 0) - lowest) / (highest - lowest)) * 100;
    return { ...c, stochK: Number(k.toFixed(2)), stochD: null };
  });
  return out.map((c, i) => {
    if (i < period - 1 + signal - 1 || c.stochK == null) return c;
    const slice = out.slice(i - signal + 1, i + 1).map((x) => Number(x.stochK || 0));
    const d = slice.reduce((s, x) => s + x, 0) / signal;
    return { ...c, stochD: Number(d.toFixed(2)) };
  });
}

function withCCI(candles, period = 20) {
  return candles.map((c, i) => {
    if (i < period - 1) return { ...c, cci20: null };
    const slice = candles.slice(i - period + 1, i + 1);
    const tps = slice.map((x) => (Number(x.high || 0) + Number(x.low || 0) + Number(x.close || 0)) / 3);
    const tp = tps[tps.length - 1];
    const sma = tps.reduce((s, x) => s + x, 0) / period;
    const md = tps.reduce((s, x) => s + Math.abs(x - sma), 0) / period;
    const cci = md === 0 ? 0 : (tp - sma) / (0.015 * md);
    return { ...c, cci20: Number(cci.toFixed(2)) };
  });
}

function withROC(candles, period = 10) {
  return candles.map((c, i) => {
    if (i < period) return { ...c, roc10: null };
    const prev = Number(candles[i - period]?.close || 0);
    const curr = Number(c.close || 0);
    const roc = prev === 0 ? 0 : ((curr - prev) / prev) * 100;
    return { ...c, roc10: Number(roc.toFixed(2)) };
  });
}

function withMomentum(candles, period = 10) {
  return candles.map((c, i) => {
    if (i < period) return { ...c, mom10: null };
    const prev = Number(candles[i - period]?.close || 0);
    const curr = Number(c.close || 0);
    return { ...c, mom10: Number((curr - prev).toFixed(2)) };
  });
}

function withOBV(candles) {
  let obv = 0;
  return candles.map((c, i) => {
    if (i === 0) return { ...c, obv: 0 };
    const prevClose = Number(candles[i - 1]?.close || c.close || 0);
    const close = Number(c.close || 0);
    const vol = Number(c.volume || 0);
    if (close > prevClose) obv += vol;
    else if (close < prevClose) obv -= vol;
    return { ...c, obv };
  });
}

function withADL(candles) {
  let adl = 0;
  return candles.map((c) => {
    const high = Number(c.high || c.close || 0);
    const low = Number(c.low || c.close || 0);
    const close = Number(c.close || 0);
    const vol = Number(c.volume || 0);
    const mfm = high === low ? 0 : ((close - low) - (high - close)) / (high - low);
    adl += mfm * vol;
    return { ...c, adl: Number(adl.toFixed(2)) };
  });
}

function calculateRSI(candles, period = 14) {
  if (candles.length <= period) {
    return null;
  }
  let gains = 0;
  let losses = 0;
  for (let i = candles.length - period; i < candles.length; i += 1) {
    const prev = candles[i - 1]?.close ?? candles[i].close;
    const diff = candles[i].close - prev;
    if (diff >= 0) {
      gains += diff;
    } else {
      losses += Math.abs(diff);
    }
  }
  if (losses === 0) {
    return 100;
  }
  const rs = gains / losses;
  return Number((100 - 100 / (1 + rs)).toFixed(2));
}

function calculateRSISeries(candles, period = 14) {
  const out = [];
  for (let i = 0; i < candles.length; i += 1) {
    if (i < period) {
      out.push(null);
      continue;
    }
    let gains = 0;
    let losses = 0;
    for (let j = i - period + 1; j <= i; j += 1) {
      const prev = candles[j - 1]?.close ?? candles[j].close;
      const diff = candles[j].close - prev;
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    if (losses === 0) {
      out.push(100);
      continue;
    }
    const rs = gains / losses;
    out.push(Number((100 - 100 / (1 + rs)).toFixed(2)));
  }
  return out;
}

function toHeikinAshi(candles) {
  if (!candles.length) {
    return candles;
  }
  let prevOpen = (candles[0].open + candles[0].close) / 2;
  let prevClose = (candles[0].open + candles[0].high + candles[0].low + candles[0].close) / 4;
  return candles.map((c, i) => {
    if (i === 0) {
      return { ...c, open: prevOpen, close: prevClose, high: Math.max(c.high, prevOpen, prevClose), low: Math.min(c.low, prevOpen, prevClose) };
    }
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = (prevOpen + prevClose) / 2;
    prevOpen = haOpen;
    prevClose = haClose;
    return { ...c, open: Number(haOpen.toFixed(2)), close: Number(haClose.toFixed(2)), high: Number(Math.max(c.high, haOpen, haClose).toFixed(2)), low: Number(Math.min(c.low, haOpen, haClose).toFixed(2)) };
  });
}

function normalizeToSecTimestamp(value) {
  const ts = Number(value || 0);
  if (!Number.isFinite(ts) || ts <= 0) {
    return Math.floor(Date.now() / 1000);
  }
  return ts > 1e12 ? Math.floor(ts / 1000) : Math.floor(ts);
}

function toRenko(candles) {
  if (!candles.length) {
    return candles;
  }
  const avgClose = candles.reduce((s, c) => s + c.close, 0) / candles.length;
  const brick = Math.max(0.3, avgClose * 0.004);
  const out = [];
  let lastClose = candles[0].close;
  let lastTime = normalizeToSecTimestamp(candles[0].timestamp) - 1;
  for (const c of candles) {
    let nextTime = Math.max(normalizeToSecTimestamp(c.timestamp), lastTime + 1);
    let diff = c.close - lastClose;
    while (Math.abs(diff) >= brick) {
      const direction = diff > 0 ? 1 : -1;
      const close = lastClose + direction * brick;
      out.push({
        ...c,
        timestamp: nextTime,
        open: Number(lastClose.toFixed(2)),
        close: Number(close.toFixed(2)),
        high: Number(Math.max(lastClose, close).toFixed(2)),
        low: Number(Math.min(lastClose, close).toFixed(2)),
      });
      lastTime = nextTime;
      nextTime += 1;
      lastClose = close;
      diff = c.close - lastClose;
    }
  }
  return out.length ? out : candles.slice(-30);
}

function ensureStrictlyAscendingCandles(candles) {
  if (!candles.length) {
    return candles;
  }
  const sorted = [...candles].sort((a, b) => normalizeToSecTimestamp(a.timestamp) - normalizeToSecTimestamp(b.timestamp));
  let last = normalizeToSecTimestamp(sorted[0].timestamp) - 1;
  return sorted.map((c) => {
    let timestamp = normalizeToSecTimestamp(c.timestamp || last + 1);
    if (!Number.isFinite(timestamp) || timestamp <= last) {
      timestamp = last + 1;
    }
    last = timestamp;
    return { ...c, timestamp };
  });
}

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function applyLivePriceToCandles(candles, livePrice) {
  const price = Number(livePrice);
  if (!Number.isFinite(price) || price <= 0) {
    return candles;
  }

  const bucketTime = Math.floor(Date.now() / 60) * 60;
  if (!candles.length) {
    return buildFallbackCandles(price);
  }

  const next = [...candles];
  const last = { ...next[next.length - 1], timestamp: normalizeToSecTimestamp(next[next.length - 1]?.timestamp) };
  const lastClose = Number(last.close || price);

  if (last.timestamp === bucketTime) {
    last.close = Number(price.toFixed(2));
    last.high = Number(Math.max(Number(last.high || price), price).toFixed(2));
    last.low = Number(Math.min(Number(last.low || price), price).toFixed(2));
    last.volume = Number((Number(last.volume || 0) + Math.round(100 + Math.random() * 900)).toFixed(0));
    next[next.length - 1] = last;
    return next;
  }

  if (last.timestamp < bucketTime) {
    next.push({
      timestamp: bucketTime,
      open: Number(lastClose.toFixed(2)),
      high: Number(Math.max(lastClose, price).toFixed(2)),
      low: Number(Math.min(lastClose, price).toFixed(2)),
      close: Number(price.toFixed(2)),
      volume: Math.round(300 + Math.random() * 1500),
    });
    return next.slice(-500);
  }

  return candles;
}

function withLatestPrice(candles, livePrice) {
  if (!candles.length) return candles;
  return applyLivePriceToCandles(candles, livePrice);
}

function StockDetail() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const chartWrapRef = useRef(null);
  const chartTypeMenuRef = useRef(null);
  const indicatorMenuRef = useRef(null);
  const alertMenuRef = useRef(null);
  const livePriceRef = useRef(null);

  const [stock, setStock] = useState(() => ({
    symbol: (symbol || "").toUpperCase(),
    name: `${(symbol || "").toUpperCase()} Holdings`,
    currentPrice: 0,
    previousClose: 0,
    priceChange: 0,
    priceChangePercent: 0,
    volume: 0,
    marketCap: 0,
    sector: "Unknown",
    logoUrl: "",
  }));
  const [quantity, setQuantity] = useState(1);
  const [ordering, setOrdering] = useState(false);
  const [toast, setToast] = useState(null);
  const [intradayCandles, setIntradayCandles] = useState([]);
  const [deliveryCandles, setDeliveryCandles] = useState([]);
  const [timeframe, setTimeframe] = useState("5m");
  const [chartType, setChartType] = useState(() => localStorage.getItem("stock_chart_type") || "candles");
  const [indicatorToAdd, setIndicatorToAdd] = useState("sma20");
  const [activeIndicators, setActiveIndicators] = useState([]);
  const [editingIndicator, setEditingIndicator] = useState(null);
  const [indicatorSettings, setIndicatorSettings] = useState({
    sma20: { period: 20 },
    sma50: { period: 50 },
    sma200: { period: 200 },
    ema20: { period: 20 },
    ema50: { period: 50 },
    ema200: { period: 200 },
    wma20: { period: 20 },
    bb20: { period: 20, multiplier: 2 },
    macd: { fast: 12, slow: 26, signal: 9 },
    rsi14: { period: 14 },
    stoch14: { period: 14, signal: 3 },
    atr14: { period: 14 },
    cci20: { period: 20 },
    roc10: { period: 10 },
    mom10: { period: 10 },
  });
  const [analysisMode, setAnalysisMode] = useState(false);
  const [crosshairInfo, setCrosshairInfo] = useState(null);
  const [detailTab, setDetailTab] = useState("charts");
  const [overviewTab, setOverviewTab] = useState("activity");
  const [showChartTypeMenu, setShowChartTypeMenu] = useState(false);
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const [showAlertMenu, setShowAlertMenu] = useState(false);
  const [stockAlerts, setStockAlerts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("stock_chart_alerts") || "[]");
    } catch {
      return [];
    }
  });
  const [triggeredAlertMap, setTriggeredAlertMap] = useState({});
  const [alertNotice, setAlertNotice] = useState(null);
  const [alertForm, setAlertForm] = useState({
    entryPrice: "",
    targetProfit: "5",
    maxLoss: "3",
  });
  const selectedChartType = CHART_TYPES.some((t) => t.id === chartType) ? chartType : "candles";
  const currentSymbol = (stock?.symbol || symbol || "").toUpperCase();
  const currentSymbolAlerts = stockAlerts.filter((r) => (r.symbol || "").toUpperCase() === currentSymbol);

  useEffect(() => {
    const loadStock = async () => {
      try {
        const response = await stocksAPI.getBySymbol(symbol);
        setStock(response.data);
        livePriceRef.current = Number(response?.data?.currentPrice || 0) || null;
      } catch {
        setStock((prev) => prev || {
          symbol: (symbol || "").toUpperCase(),
          name: `${(symbol || "").toUpperCase()} Holdings`,
          currentPrice: 0,
          previousClose: 0,
          priceChange: 0,
          priceChangePercent: 0,
          volume: 0,
          marketCap: 0,
          sector: "Unknown",
          logoUrl: "",
        });
      }
    };
    loadStock();
    connectStockSocket((liveStocks) => {
      const selected = liveStocks.find((s) => s.symbol === symbol?.toUpperCase());
      if (selected) {
        setStock(selected);
        livePriceRef.current = Number(selected.currentPrice || 0) || null;
        setIntradayCandles((prev) => applyLivePriceToCandles(prev, selected.currentPrice));
      }
    });
    return () => disconnectStockSocket();
  }, [symbol]);

  const onSelectChartType = (nextType) => {
    setChartType(nextType);
    localStorage.setItem("stock_chart_type", nextType);
  };

  useEffect(() => {
    const onDocClick = (event) => {
      if (chartTypeMenuRef.current && !chartTypeMenuRef.current.contains(event.target)) {
        setShowChartTypeMenu(false);
      }
      if (indicatorMenuRef.current && !indicatorMenuRef.current.contains(event.target)) {
        setShowIndicatorMenu(false);
      }
      if (alertMenuRef.current && !alertMenuRef.current.contains(event.target)) {
        setShowAlertMenu(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    localStorage.setItem("stock_chart_alerts", JSON.stringify(stockAlerts));
  }, [stockAlerts]);

  useEffect(() => {
    const cp = Number(stock?.currentPrice || 0);
    setAlertForm((prev) => {
      if (prev.entryPrice && Number(prev.entryPrice) > 0) return prev;
      return { ...prev, entryPrice: cp > 0 ? cp.toFixed(2) : prev.entryPrice };
    });
  }, [currentSymbol, stock?.currentPrice]);

  useEffect(() => {
    const cp = Number(stock?.currentPrice || 0);
    if (!Number.isFinite(cp) || cp <= 0 || !currentSymbolAlerts.length) return;

    currentSymbolAlerts.forEach((rule) => {
      const entry = Number(rule.entryPrice || 0);
      if (!Number.isFinite(entry) || entry <= 0) return;
      const pnlPct = ((cp - entry) / entry) * 100;
      const lossHit = Number(rule.maxLoss || 0) > 0 && pnlPct <= -Math.abs(Number(rule.maxLoss));
      const profitHit = Number(rule.targetProfit || 0) > 0 && pnlPct >= Math.abs(Number(rule.targetProfit));

      const lossKey = `${rule.id}-loss`;
      const profitKey = `${rule.id}-profit`;

      if (lossHit && !triggeredAlertMap[lossKey]) {
        setTriggeredAlertMap((prev) => ({ ...prev, [lossKey]: true }));
        setAlertNotice({ type: "error", message: `${rule.symbol}: loss alert hit (${pnlPct.toFixed(2)}%)` });
      }
      if (profitHit && !triggeredAlertMap[profitKey]) {
        setTriggeredAlertMap((prev) => ({ ...prev, [profitKey]: true }));
        setAlertNotice({ type: "success", message: `${rule.symbol}: target alert hit (+${pnlPct.toFixed(2)}%)` });
      }
    });
  }, [stock?.currentPrice, currentSymbolAlerts, triggeredAlertMap]);

  useEffect(() => {
    if (!alertNotice) return;
    const t = setTimeout(() => setAlertNotice(null), 4500);
    return () => clearTimeout(t);
  }, [alertNotice]);

  useEffect(() => {
    const loadCharts = async () => {
      try {
        const [intradayRes, deliveryRes] = await Promise.all([marketAPI.getIntraday(symbol), marketAPI.getDelivery(symbol)]);
        const mapCandles = (arr) => (arr || []).map((c) => ({
          timestamp: normalizeToSecTimestamp(c.time || c.timestamp || c.date),
          open: Number(c.open || c.close || 0),
          high: Number(c.high || c.close || 0),
          low: Number(c.low || c.close || 0),
          close: Number(c.close || 0),
          volume: Number(c.volume || 0),
        }));
        setIntradayCandles(withLatestPrice(mapCandles(intradayRes.data), livePriceRef.current));
        setDeliveryCandles(mapCandles(deliveryRes.data));
      } catch {
        setIntradayCandles([]);
        setDeliveryCandles([]);
      }
    };
    loadCharts();
    const interval = setInterval(loadCharts, 30000);
    return () => clearInterval(interval);
  }, [symbol]);

  const chartCandles = useMemo(() => {
    let selected = intradayCandles;
    if (timeframe === "15s") {
      selected = aggregateCandles(intradayCandles, 1).slice(-50);
    } else if (timeframe === "1m") {
      selected = aggregateCandles(intradayCandles, 1);
    } else if (timeframe === "5m") {
      selected = aggregateCandles(intradayCandles, 5);
    } else if (timeframe === "15m") {
      selected = aggregateCandles(intradayCandles, 15);
    } else if (timeframe === "1h") {
      selected = aggregateCandles(intradayCandles, 60);
    } else if (timeframe === "1W") {
      selected = aggregateCandles(deliveryCandles, 7);
    } else if (timeframe === "1M") {
      selected = aggregateCandles(deliveryCandles, 30);
    } else if (timeframe === "1Y") {
      selected = aggregateCandles(deliveryCandles, 365);
    }
    if (!selected.length) {
      selected = buildFallbackCandles(stock?.currentPrice);
    }
    if (selectedChartType === "heikin") {
      return ensureStrictlyAscendingCandles(toHeikinAshi(selected));
    }
    if (RENKO_LIKE_TYPES.has(selectedChartType)) {
      return ensureStrictlyAscendingCandles(toRenko(selected));
    }
    return ensureStrictlyAscendingCandles(selected);
  }, [intradayCandles, deliveryCandles, timeframe, selectedChartType, stock?.currentPrice]);

  const enrichedCandles = useMemo(() => {
    let out = [...chartCandles];
    if (activeIndicators.includes("sma20")) {
      out = withSMA(out, "sma20", Number(indicatorSettings.sma20?.period || 20));
    }
    if (activeIndicators.includes("sma50")) {
      out = withSMA(out, "sma50", Number(indicatorSettings.sma50?.period || 50));
    }
    if (activeIndicators.includes("sma200")) {
      out = withSMA(out, "sma200", Number(indicatorSettings.sma200?.period || 200));
    }
    if (activeIndicators.includes("ema20")) {
      out = withEMA(out, "ema20", Number(indicatorSettings.ema20?.period || 20));
    }
    if (activeIndicators.includes("ema50")) {
      out = withEMA(out, "ema50", Number(indicatorSettings.ema50?.period || 50));
    }
    if (activeIndicators.includes("ema200")) {
      out = withEMA(out, "ema200", Number(indicatorSettings.ema200?.period || 200));
    }
    if (activeIndicators.includes("wma20")) {
      out = withWMA(out, "wma20", Number(indicatorSettings.wma20?.period || 20));
    }
    if (activeIndicators.includes("vwap")) {
      out = withVWAP(out);
    }
    if (activeIndicators.includes("bb20")) {
      out = withBollinger(
        out,
        Number(indicatorSettings.bb20?.period || 20),
        Number(indicatorSettings.bb20?.multiplier || 2)
      );
    }
    if (activeIndicators.includes("macd")) {
      out = withMACD(out);
    }
    if (activeIndicators.includes("stoch14")) {
      out = withStochastic(
        out,
        Number(indicatorSettings.stoch14?.period || 14),
        Number(indicatorSettings.stoch14?.signal || 3)
      );
    }
    if (activeIndicators.includes("atr14")) {
      out = withATR(out, Number(indicatorSettings.atr14?.period || 14));
    }
    if (activeIndicators.includes("cci20")) {
      out = withCCI(out, Number(indicatorSettings.cci20?.period || 20));
    }
    if (activeIndicators.includes("roc10")) {
      out = withROC(out, Number(indicatorSettings.roc10?.period || 10));
    }
    if (activeIndicators.includes("mom10")) {
      out = withMomentum(out, Number(indicatorSettings.mom10?.period || 10));
    }
    if (activeIndicators.includes("obv")) {
      out = withOBV(out);
    }
    if (activeIndicators.includes("adl")) {
      out = withADL(out);
    }
    return out;
  }, [chartCandles, activeIndicators, indicatorSettings]);

  const latestRSI = useMemo(() => calculateRSI(enrichedCandles, 14), [enrichedCandles]);
  const intradayStats = useMemo(() => {
    const source = intradayCandles.length ? intradayCandles : enrichedCandles;
    if (!source.length) {
      const p = Number(stock?.currentPrice || 0);
      return {
        open: p,
        high: p,
        low: p,
        close: p,
        volume: Number(stock?.volume || 0),
      };
    }
    return {
      open: Number(source[0]?.open || 0),
      high: Number(Math.max(...source.map((c) => Number(c.high || 0)))),
      low: Number(Math.min(...source.map((c) => Number(c.low || 0)))),
      close: Number(source[source.length - 1]?.close || 0),
      volume: Number(source.reduce((sum, c) => sum + Number(c.volume || 0), 0)),
    };
  }, [intradayCandles, enrichedCandles, stock]);

  const averagePrice = useMemo(() => {
    const source = intradayCandles.length ? intradayCandles : enrichedCandles;
    if (!source.length) return Number(stock?.currentPrice || 0);
    const total = source.reduce((sum, c) => sum + Number(c.close || 0), 0);
    return total / source.length;
  }, [intradayCandles, enrichedCandles, stock]);

  const range52 = useMemo(() => {
    const source = deliveryCandles.length ? deliveryCandles : enrichedCandles;
    if (!source.length) {
      const p = Number(stock?.currentPrice || 0);
      return { low: p, high: p };
    }
    return {
      low: Number(Math.min(...source.map((c) => Number(c.low || 0)))),
      high: Number(Math.max(...source.map((c) => Number(c.high || 0)))),
    };
  }, [deliveryCandles, enrichedCandles, stock]);

  const shortTermTrend = useMemo(() => {
    const source = enrichedCandles.slice(-20);
    if (source.length < 2) return "Neutral";
    const first = Number(source[0].close || 0);
    const last = Number(source[source.length - 1].close || 0);
    const pct = first > 0 ? ((last - first) / first) * 100 : 0;
    if (pct > 1) return "Bullish";
    if (pct < -1) return "Bearish";
    return "Neutral";
  }, [enrichedCandles]);

  const longTermTrend = useMemo(() => {
    const source = deliveryCandles.length ? deliveryCandles.slice(-30) : enrichedCandles.slice(-30);
    if (source.length < 2) return "Neutral";
    const first = Number(source[0].close || 0);
    const last = Number(source[source.length - 1].close || 0);
    const pct = first > 0 ? ((last - first) / first) * 100 : 0;
    if (pct > 3) return "Positive";
    if (pct < -3) return "Very Negative";
    return "Neutral";
  }, [deliveryCandles, enrichedCandles]);

  const overallTrend = useMemo(() => {
    if (shortTermTrend === "Bullish" && longTermTrend === "Positive") return "Strong Positive";
    if (shortTermTrend === "Bearish" || longTermTrend.includes("Negative")) return "Negative";
    return "Neutral";
  }, [shortTermTrend, longTermTrend]);

  const fundamentalMetrics = useMemo(() => {
    const safe = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
    const close = Number(stock?.currentPrice || 0);
    const prev = Number(stock?.previousClose || 0);
    const eps = safe(stock?.eps, Math.max(close * 0.06, 0.1));
    const bookValue = safe(stock?.bookValue, Math.max(close * 0.75, 0.1));
    const peRatio = safe(stock?.peRatio, eps > 0 ? close / eps : 0);
    const pbRatio = safe(stock?.pbRatio, bookValue > 0 ? close / bookValue : 0);
    const roe = safe(stock?.roe, ((close - prev) / Math.max(prev || close, 1)) * 100);
    const dividendYield = safe(stock?.dividendYield, Math.max((eps / Math.max(close, 1)) * 10, 0));
    const dailyGain = safe(stock?.dailyGain, ((close - prev) / Math.max(prev || close, 1)) * 100);
    const monthBase = deliveryCandles.length ? Number(deliveryCandles[Math.max(0, deliveryCandles.length - 22)]?.close || close) : close;
    const monthlyGain = safe(stock?.monthlyGain, ((close - monthBase) / Math.max(monthBase, 1)) * 100);

    return {
      peRatio,
      pbRatio,
      roe,
      eps,
      bookValue,
      dividendYield,
      dailyGain,
      monthlyGain,
    };
  }, [stock, deliveryCandles]);

  const addIndicator = () => {
    if (!indicatorToAdd) return;
    setActiveIndicators((prev) => (prev.includes(indicatorToAdd) ? prev : [...prev, indicatorToAdd]));
  };

  const removeIndicator = (id) => {
    setActiveIndicators((prev) => prev.filter((x) => x !== id));
    if (editingIndicator === id) setEditingIndicator(null);
  };

  const updateIndicatorSetting = (id, key, value) => {
    setIndicatorSettings((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [key]: Number(value) },
    }));
  };

  const addStockAlert = () => {
    const entry = Number(alertForm.entryPrice);
    const target = Number(alertForm.targetProfit);
    const maxLoss = Number(alertForm.maxLoss);
    if (!currentSymbol || !Number.isFinite(entry) || entry <= 0) return;
    setStockAlerts((prev) => [
      {
        id: `${currentSymbol}-${Date.now()}`,
        symbol: currentSymbol,
        entryPrice: entry,
        targetProfit: Number.isFinite(target) ? Math.max(0, target) : 0,
        maxLoss: Number.isFinite(maxLoss) ? Math.max(0, maxLoss) : 0,
      },
      ...prev,
    ]);
  };

  const deleteStockAlert = (id) => {
    setStockAlerts((prev) => prev.filter((x) => x.id !== id));
    setTriggeredAlertMap((prev) => {
      const next = { ...prev };
      delete next[`${id}-loss`];
      delete next[`${id}-profit`];
      return next;
    });
  };

  useEffect(() => {
    if (!chartWrapRef.current || !enrichedCandles.length) {
      return undefined;
    }

    const chart = createChart(chartWrapRef.current, {
      width: chartWrapRef.current.clientWidth,
      height: analysisMode ? 620 : 420,
      layout: { background: { color: "#1A2332" }, textColor: "#B8C6D3" },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: true },
      grid: { vertLines: { color: "rgba(255,255,255,0.06)" }, horzLines: { color: "rgba(255,255,255,0.06)" } },
      crosshair: { mode: 1 },
      handleScroll: true,
      handleScale: true,
    });

    let priceSeries;
    if (LINE_LIKE_TYPES.has(selectedChartType)) {
      priceSeries = chart.addSeries(LineSeries, { color: "#00D09C", lineWidth: 2 });
      priceSeries.setData(enrichedCandles.map((c) => ({ time: c.timestamp, value: c.close })));
      if (selectedChartType === "lineMarkers" && typeof priceSeries.setMarkers === "function") {
        priceSeries.setMarkers(
          enrichedCandles
            .filter((_, idx) => idx % 12 === 0)
            .map((c) => ({
              time: c.timestamp,
              position: "inBar",
              color: "#7ea6ff",
              shape: "circle",
              text: "",
            }))
        );
      }
    } else if (selectedChartType === "area") {
      priceSeries = chart.addSeries(AreaSeries, { lineColor: "#00D09C", topColor: "rgba(0,208,156,0.35)", bottomColor: "rgba(0,208,156,0.03)" });
      priceSeries.setData(enrichedCandles.map((c) => ({ time: c.timestamp, value: c.close })));
    } else if (selectedChartType === "hlcArea") {
      priceSeries = chart.addSeries(AreaSeries, { lineColor: "#8ab4ff", topColor: "rgba(138,180,255,0.32)", bottomColor: "rgba(138,180,255,0.04)" });
      priceSeries.setData(enrichedCandles.map((c) => ({ time: c.timestamp, value: Number(((c.high + c.low + c.close) / 3).toFixed(2)) })));
    } else if (selectedChartType === "baseline") {
      const base = Number(enrichedCandles[0]?.close || 0);
      priceSeries = chart.addSeries(BaselineSeries, {
        baseValue: { type: "price", price: base },
        topLineColor: "#00D09C",
        topFillColor1: "rgba(0,208,156,0.24)",
        topFillColor2: "rgba(0,208,156,0.03)",
        bottomLineColor: "#FF4757",
        bottomFillColor1: "rgba(255,71,87,0.22)",
        bottomFillColor2: "rgba(255,71,87,0.03)",
      });
      priceSeries.setData(enrichedCandles.map((c) => ({ time: c.timestamp, value: c.close })));
    } else if (selectedChartType === "columns") {
      priceSeries = chart.addSeries(HistogramSeries, { color: "#6ea8ff" });
      priceSeries.setData(
        enrichedCandles.map((c) => ({
          time: c.timestamp,
          value: c.close,
          color: c.close >= c.open ? "rgba(0,208,156,0.72)" : "rgba(255,71,87,0.72)",
        }))
      );
    } else if (selectedChartType === "highLow") {
      priceSeries = chart.addSeries(BarSeries, { upColor: "#00D09C", downColor: "#FF4757", thinBars: true });
      priceSeries.setData(enrichedCandles.map((c) => ({ time: c.timestamp, open: c.low, high: c.high, low: c.low, close: c.high })));
    } else if (selectedChartType === "bars") {
      priceSeries = chart.addSeries(BarSeries, { upColor: "#00D09C", downColor: "#FF4757", thinBars: false });
      priceSeries.setData(enrichedCandles.map((c) => ({ time: c.timestamp, open: c.open, high: c.high, low: c.low, close: c.close })));
    } else {
      priceSeries = chart.addSeries(CandlestickSeries, selectedChartType === "hollow"
        ? {
            upColor: "rgba(0,0,0,0)",
            downColor: "#FF4757",
            borderVisible: true,
            borderUpColor: "#00D09C",
            borderDownColor: "#FF4757",
            wickUpColor: "#00D09C",
            wickDownColor: "#FF4757",
          }
        : {
            upColor: "#00D09C",
            downColor: "#FF4757",
            borderVisible: true,
            borderUpColor: "#00D09C",
            borderDownColor: "#FF4757",
            wickUpColor: "#00D09C",
            wickDownColor: "#FF4757",
          });
      priceSeries.setData(enrichedCandles.map((c) => ({ time: c.timestamp, open: c.open, high: c.high, low: c.low, close: c.close })));
    }

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: "",
      priceFormat: { type: "volume" },
      color: "#5aa9ff",
      base: 0,
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });
    volumeSeries.setData(
      enrichedCandles.map((c) => ({
        time: c.timestamp,
        value: c.volume || 0,
        color: c.close >= c.open ? "rgba(0,208,156,0.45)" : "rgba(255,71,87,0.45)",
      }))
    );

    const addLine = (key, color) => {
      const s = chart.addSeries(LineSeries, { color, lineWidth: 1.5 });
      s.setData(enrichedCandles.filter((c) => c[key] != null).map((c) => ({ time: c.timestamp, value: c[key] })));
    };
    if (activeIndicators.includes("sma20")) addLine("sma20", "#7ea6ff");
    if (activeIndicators.includes("sma50")) addLine("sma50", "#4cc9f0");
    if (activeIndicators.includes("sma200")) addLine("sma200", "#4895ef");
    if (activeIndicators.includes("ema20")) addLine("ema20", "#ffb347");
    if (activeIndicators.includes("ema50")) addLine("ema50", "#f9844a");
    if (activeIndicators.includes("ema200")) addLine("ema200", "#f3722c");
    if (activeIndicators.includes("wma20")) addLine("wma20", "#b565f5");
    if (activeIndicators.includes("vwap")) addLine("vwap", "#d6a3ff");
    if (activeIndicators.includes("bb20")) {
      addLine("bbUpper", "#ff9f43");
      addLine("bbMiddle", "#7ea6ff");
      addLine("bbLower", "#ff9f43");
    }
    if (activeIndicators.includes("atr14")) addLine("atr14", "#ffd166");
    if (activeIndicators.includes("cci20")) addLine("cci20", "#90be6d");
    if (activeIndicators.includes("roc10")) addLine("roc10", "#43aa8b");
    if (activeIndicators.includes("mom10")) addLine("mom10", "#577590");
    if (activeIndicators.includes("obv")) addLine("obv", "#9d4edd");
    if (activeIndicators.includes("adl")) addLine("adl", "#c77dff");
    if (activeIndicators.includes("macd")) {
      const macdLine = chart.addSeries(LineSeries, { color: "#6ae3ff", lineWidth: 1.5 }, 2);
      const signalLine = chart.addSeries(LineSeries, { color: "#ff88dc", lineWidth: 1.5 }, 2);
      const histSeries = chart.addSeries(HistogramSeries, { priceScaleId: "macdScale" }, 2);
      macdLine.setData(enrichedCandles.filter((c) => c.macd != null).map((c) => ({ time: c.timestamp, value: c.macd })));
      signalLine.setData(enrichedCandles.filter((c) => c.signal != null).map((c) => ({ time: c.timestamp, value: c.signal })));
      histSeries.setData(
        enrichedCandles
          .filter((c) => c.macd != null && c.signal != null)
          .map((c) => ({
            time: c.timestamp,
            value: Number((c.macd - c.signal).toFixed(2)),
            color: c.macd - c.signal >= 0 ? "rgba(0,208,156,0.55)" : "rgba(255,71,87,0.55)",
          }))
      );
    }

    if (activeIndicators.includes("rsi14")) {
      const rsiValues = calculateRSISeries(enrichedCandles, Number(indicatorSettings.rsi14?.period || 14));
      const rsiSeries = chart.addSeries(LineSeries, { color: "#f6c945", lineWidth: 1.5 }, 2);
      const upper = chart.addSeries(LineSeries, { color: "rgba(255,255,255,0.35)", lineWidth: 1 }, 2);
      const lower = chart.addSeries(LineSeries, { color: "rgba(255,255,255,0.35)", lineWidth: 1 }, 2);
      rsiSeries.setData(
        enrichedCandles
          .map((c, idx) => ({ time: c.timestamp, value: rsiValues[idx] }))
          .filter((x) => x.value != null)
      );
      upper.setData(enrichedCandles.map((c) => ({ time: c.timestamp, value: 70 })));
      lower.setData(enrichedCandles.map((c) => ({ time: c.timestamp, value: 30 })));
    }
    if (activeIndicators.includes("stoch14")) {
      const stochK = chart.addSeries(LineSeries, { color: "#ffca3a", lineWidth: 1.5 }, 2);
      const stochD = chart.addSeries(LineSeries, { color: "#8ac926", lineWidth: 1.5 }, 2);
      stochK.setData(enrichedCandles.filter((c) => c.stochK != null).map((c) => ({ time: c.timestamp, value: c.stochK })));
      stochD.setData(enrichedCandles.filter((c) => c.stochD != null).map((c) => ({ time: c.timestamp, value: c.stochD })));
    }

    const byTime = new Map(enrichedCandles.map((c) => [c.timestamp, c]));
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time) {
        return;
      }
      const time = Number(param.time);
      const candle = byTime.get(time);
      if (!candle) {
        return;
      }
      setCrosshairInfo({
        time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume || 0,
      });
    });

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (chartWrapRef.current) {
        chart.applyOptions({ width: chartWrapRef.current.clientWidth, height: analysisMode ? 620 : 420 });
      }
    });
    ro.observe(chartWrapRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [enrichedCandles, selectedChartType, activeIndicators, indicatorSettings, analysisMode]);

  const handleOrder = async (type) => {
    if (!stock || quantity < 1) {
      setToast({ type: "error", message: "Enter valid quantity" });
      return;
    }
    setOrdering(true);
    try {
      const payload = {
        symbol: stock.symbol,
        quantity: Number(quantity),
        orderType: type,
      };
      const response = type === "BUY" ? await portfolioAPI.buyStock(payload) : await portfolioAPI.sellStock(payload);
      if (response?.data?.success) setToast({ type: "success", message: response.data.message });
      else setToast({ type: "error", message: response?.data?.error || response?.data?.message || "Order failed" });
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.error || err.response?.data?.message || "Order failed" });
    } finally {
      setOrdering(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const toggleFullscreen = async () => {
    const el = chartWrapRef.current?.parentElement;
    if (!el) return;
    if (!document.fullscreenElement) await el.requestFullscreen();
    else await document.exitFullscreen();
  };
  const adjustQty = (delta) => setQuantity((prev) => Math.max(1, Number(prev || 1) + delta));
  const onQtyChange = (value) => setQuantity(Math.max(1, Math.floor(Number(value) || 1)));
  const totalValue = useMemo(() => Number(stock?.currentPrice || 0) * Number(quantity || 1), [stock, quantity]);
  const price = Number(stock.currentPrice || 0);
  const changePercent = Number(stock.priceChangePercent || 0);
  const changeValue = Number(stock.priceChange || 0);
  const isPositive = changePercent >= 0;
  const last = enrichedCandles[enrichedCandles.length - 1];
  const lowerCircuit = Number((price * 0.9).toFixed(2));
  const upperCircuit = Number((price * 1.1).toFixed(2));
  const dayRangePosition = clampPercent(
    ((price - intradayStats.low) / Math.max(intradayStats.high - intradayStats.low, 0.0001)) * 100
  );
  const yearRangePosition = clampPercent(
    ((price - range52.low) / Math.max(range52.high - range52.low, 0.0001)) * 100
  );

  return (
    <div className="stock-detail-page">
      <button className="btn btn-outline" onClick={() => navigate("/markets")} style={{ marginBottom: "14px" }}>
        <ArrowLeft size={18} />
        Back
      </button>

      {!analysisMode && (
        <div className="card order-header-card">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <StockLogo symbol={stock.symbol} name={stock.name} logoUrl={stock.logoUrl} size={32} />
            <h2 style={{ margin: 0 }}>{stock.symbol}</h2>
          </div>
          <div style={{ color: "var(--text-secondary)", marginBottom: "8px" }}>{stock.name}</div>
          <div className="order-price">Rs {price.toFixed(2)}</div>
          <div className={`order-change ${isPositive ? "positive" : "negative"}`}>
            {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {changeValue >= 0 ? "+" : ""}{changeValue.toFixed(2)} ({changePercent.toFixed(2)}%)
          </div>
        </div>
      )}

      <div className={`stock-detail ${analysisMode ? "analysis-only" : ""}`}>
        <div>
          <div className="chart-container">
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <button
                type="button"
                className={`btn ${detailTab === "charts" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setDetailTab("charts")}
                style={{ padding: "6px 14px" }}
              >
                Charts
              </button>
              <button
                type="button"
                className={`btn ${detailTab === "overview" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setDetailTab("overview")}
                style={{ padding: "6px 14px" }}
              >
                Overview
              </button>
            </div>

            {detailTab === "charts" && (
              <>
            <div className="trade-toolbar">
              <div className="trade-toolbar-group">
                {TIMEFRAME_OPTIONS.map((opt) => (
                  <button key={opt.id} type="button" className={`toolbar-btn ${timeframe === opt.id ? "active" : ""}`} onClick={() => setTimeframe(opt.id)}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="trade-toolbar-group">
                <button type="button" className={`toolbar-btn ${analysisMode ? "active" : ""}`} onClick={() => setAnalysisMode((p) => !p)}>
                  <LayoutPanelLeft size={14} /> Analysis View
                </button>
                <button type="button" className="toolbar-btn" onClick={toggleFullscreen}>
                  <Expand size={14} /> Full View
                </button>
                <div className="symbol-dropdown" ref={chartTypeMenuRef}>
                  <button
                    type="button"
                    className="toolbar-icon-btn has-tooltip"
                    data-tooltip={`Chart Type: ${CHART_TYPES.find((t) => t.id === selectedChartType)?.label || "Candles"}`}
                    onClick={() => setShowChartTypeMenu((prev) => !prev)}
                  >
                    <BarChart3 size={15} />
                  </button>
                  {showChartTypeMenu && (
                    <div className="symbol-dropdown-menu">
                      {CHART_TYPES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className={`symbol-dropdown-item ${selectedChartType === t.id ? "active" : ""}`}
                          onClick={() => {
                            onSelectChartType(t.id);
                            setShowChartTypeMenu(false);
                          }}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="symbol-dropdown" ref={indicatorMenuRef}>
                  <button
                    type="button"
                    className="toolbar-icon-btn has-tooltip"
                    data-tooltip={`Indicator: ${INDICATORS.find((i) => i.id === indicatorToAdd)?.label || "SMA 20"}`}
                    onClick={() => setShowIndicatorMenu((prev) => !prev)}
                  >
                    <SlidersHorizontal size={15} />
                  </button>
                  {showIndicatorMenu && (
                    <div className="symbol-dropdown-menu">
                      {INDICATORS.map((i) => (
                        <button
                          key={i.id}
                          type="button"
                          className={`symbol-dropdown-item ${indicatorToAdd === i.id ? "active" : ""}`}
                          onClick={() => {
                            setIndicatorToAdd(i.id);
                            setShowIndicatorMenu(false);
                          }}
                        >
                          {i.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="symbol-dropdown" ref={alertMenuRef}>
                  <button
                    type="button"
                    className="toolbar-btn has-tooltip"
                    data-tooltip="Alert"
                    onClick={() => setShowAlertMenu((prev) => !prev)}
                  >
                    <Bell size={14} /> Alert
                  </button>
                  {showAlertMenu && (
                    <div className="symbol-dropdown-menu" style={{ minWidth: "320px", right: "0" }}>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", padding: "4px 8px 8px 8px" }}>
                        {currentSymbol} Alerts
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "6px", padding: "0 6px 8px 6px" }}>
                        <input
                          className="auth-input"
                          type="number"
                          step="0.01"
                          placeholder="Entry"
                          value={alertForm.entryPrice}
                          onChange={(e) => setAlertForm((prev) => ({ ...prev, entryPrice: e.target.value }))}
                          style={{ padding: "7px 8px", minWidth: 0 }}
                        />
                        <input
                          className="auth-input"
                          type="number"
                          step="0.1"
                          placeholder="Target %"
                          value={alertForm.targetProfit}
                          onChange={(e) => setAlertForm((prev) => ({ ...prev, targetProfit: e.target.value }))}
                          style={{ padding: "7px 8px", minWidth: 0 }}
                        />
                        <input
                          className="auth-input"
                          type="number"
                          step="0.1"
                          placeholder="Max Loss %"
                          value={alertForm.maxLoss}
                          onChange={(e) => setAlertForm((prev) => ({ ...prev, maxLoss: e.target.value }))}
                          style={{ padding: "7px 8px", minWidth: 0 }}
                        />
                        <button type="button" className="toolbar-btn" onClick={addStockAlert}>Add</button>
                      </div>
                      <div style={{ maxHeight: "160px", overflowY: "auto", padding: "0 6px 6px 6px" }}>
                        {currentSymbolAlerts.length === 0 && (
                          <div style={{ color: "var(--text-secondary)", fontSize: "12px", padding: "6px 4px" }}>No alerts</div>
                        )}
                        {currentSymbolAlerts.map((r) => (
                          <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: "6px", padding: "6px 4px", borderBottom: "1px solid var(--border)" }}>
                            <div style={{ fontSize: "12px" }}>
                              Entry {Number(r.entryPrice || 0).toFixed(2)} | +{Number(r.targetProfit || 0).toFixed(2)}% / -{Number(r.maxLoss || 0).toFixed(2)}%
                            </div>
                            <button type="button" className="toolbar-btn" onClick={() => deleteStockAlert(r.id)} style={{ padding: "4px 6px" }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button type="button" className="toolbar-btn" onClick={addIndicator}>Add</button>
              </div>
            </div>

            {activeIndicators.length > 0 && (
              <div className="indicator-manager">
                {activeIndicators.map((id) => {
                  const meta = INDICATORS.find((x) => x.id === id);
                  return (
                    <div key={id} className="indicator-chip">
                      <button
                        type="button"
                        className="indicator-chip-name has-tooltip"
                        data-tooltip={meta?.label || id}
                        onClick={() => setEditingIndicator(editingIndicator === id ? null : id)}
                      >
                        {INDICATOR_SHORT_LABEL[id] || id.toUpperCase()}
                      </button>
                      <button type="button" className="indicator-chip-remove" onClick={() => removeIndicator(id)}>x</button>
                    </div>
                  );
                })}
              </div>
            )}

            {editingIndicator && (
              <div className="indicator-settings">
                {editingIndicator === "sma20" && (
                  <>
                    <label>Period</label>
                    <input type="number" min="2" value={indicatorSettings.sma20?.period || 20} onChange={(e) => updateIndicatorSetting("sma20", "period", e.target.value)} />
                  </>
                )}
                {editingIndicator === "sma50" && (
                  <>
                    <label>Period</label>
                    <input type="number" min="2" value={indicatorSettings.sma50?.period || 50} onChange={(e) => updateIndicatorSetting("sma50", "period", e.target.value)} />
                  </>
                )}
                {editingIndicator === "sma200" && (
                  <>
                    <label>Period</label>
                    <input type="number" min="2" value={indicatorSettings.sma200?.period || 200} onChange={(e) => updateIndicatorSetting("sma200", "period", e.target.value)} />
                  </>
                )}
                {editingIndicator === "ema20" && (
                  <>
                    <label>Period</label>
                    <input type="number" min="2" value={indicatorSettings.ema20?.period || 20} onChange={(e) => updateIndicatorSetting("ema20", "period", e.target.value)} />
                  </>
                )}
                {editingIndicator === "ema50" && (
                  <>
                    <label>Period</label>
                    <input type="number" min="2" value={indicatorSettings.ema50?.period || 50} onChange={(e) => updateIndicatorSetting("ema50", "period", e.target.value)} />
                  </>
                )}
                {editingIndicator === "ema200" && (
                  <>
                    <label>Period</label>
                    <input type="number" min="2" value={indicatorSettings.ema200?.period || 200} onChange={(e) => updateIndicatorSetting("ema200", "period", e.target.value)} />
                  </>
                )}
                {editingIndicator === "wma20" && (
                  <>
                    <label>Period</label>
                    <input type="number" min="2" value={indicatorSettings.wma20?.period || 20} onChange={(e) => updateIndicatorSetting("wma20", "period", e.target.value)} />
                  </>
                )}
                {editingIndicator === "bb20" && (
                  <>
                    <label>Period</label>
                    <input type="number" min="2" value={indicatorSettings.bb20?.period || 20} onChange={(e) => updateIndicatorSetting("bb20", "period", e.target.value)} />
                    <label>Std Dev</label>
                    <input type="number" min="1" step="0.1" value={indicatorSettings.bb20?.multiplier || 2} onChange={(e) => updateIndicatorSetting("bb20", "multiplier", e.target.value)} />
                  </>
                )}
                {editingIndicator === "rsi14" && (
                  <>
                    <label>Period</label>
                    <input type="number" min="2" value={indicatorSettings.rsi14?.period || 14} onChange={(e) => updateIndicatorSetting("rsi14", "period", e.target.value)} />
                  </>
                )}
                {editingIndicator === "stoch14" && (
                  <>
                    <label>Period</label>
                    <input type="number" min="2" value={indicatorSettings.stoch14?.period || 14} onChange={(e) => updateIndicatorSetting("stoch14", "period", e.target.value)} />
                    <label>Signal</label>
                    <input type="number" min="1" value={indicatorSettings.stoch14?.signal || 3} onChange={(e) => updateIndicatorSetting("stoch14", "signal", e.target.value)} />
                  </>
                )}
                {editingIndicator === "atr14" && (
                  <>
                    <label>Period</label>
                    <input type="number" min="2" value={indicatorSettings.atr14?.period || 14} onChange={(e) => updateIndicatorSetting("atr14", "period", e.target.value)} />
                  </>
                )}
                {editingIndicator === "cci20" && (
                  <>
                    <label>Period</label>
                    <input type="number" min="2" value={indicatorSettings.cci20?.period || 20} onChange={(e) => updateIndicatorSetting("cci20", "period", e.target.value)} />
                  </>
                )}
                {editingIndicator === "roc10" && (
                  <>
                    <label>Period</label>
                    <input type="number" min="2" value={indicatorSettings.roc10?.period || 10} onChange={(e) => updateIndicatorSetting("roc10", "period", e.target.value)} />
                  </>
                )}
                {editingIndicator === "mom10" && (
                  <>
                    <label>Period</label>
                    <input type="number" min="2" value={indicatorSettings.mom10?.period || 10} onChange={(e) => updateIndicatorSetting("mom10", "period", e.target.value)} />
                  </>
                )}
              </div>
            )}

            <div className="tv-chart-shell">
              <div className="chart-left-tools">
                {TOOL_ITEMS.map((tool) => (
                  <button
                    key={tool.id}
                    className="chart-tool-btn has-tooltip"
                    type="button"
                    data-tooltip={tool.label}
                    aria-label={tool.label}
                  >
                    <tool.Icon size={14} />
                  </button>
                ))}
              </div>

              <div className="tv-chart-main">
                {crosshairInfo && (
                  <div className="ohlc-floating">
                    <span>O {Number(crosshairInfo.open).toFixed(2)}</span>
                    <span>H {Number(crosshairInfo.high).toFixed(2)}</span>
                    <span>L {Number(crosshairInfo.low).toFixed(2)}</span>
                    <span>C {Number(crosshairInfo.close).toFixed(2)}</span>
                    <span>V {Number(crosshairInfo.volume).toLocaleString()}</span>
                  </div>
                )}
                <div ref={chartWrapRef} className="tv-chart-host" style={{ height: analysisMode ? "620px" : "420px" }} />
              </div>
            </div>

            <div className="indicator-status">
              <span>O: {Number(last?.open || price).toFixed(2)}</span>
              <span>H: {Number(last?.high || price).toFixed(2)}</span>
              <span>L: {Number(last?.low || price).toFixed(2)}</span>
              <span>C: {Number(last?.close || price).toFixed(2)}</span>
              <span>Vol: {Number(last?.volume || 0).toLocaleString()}</span>
              {activeIndicators.includes("rsi14") && <span>RSI: {latestRSI ?? "--"}</span>}
            </div>
              </>
            )}

            {detailTab === "overview" && (
              <div style={{ marginTop: "6px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "16px",
                    marginBottom: "10px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#7ea6ff",
                  }}
                >
                  <span style={{ cursor: "pointer" }}>TECHNICALS</span>
                  <span style={{ cursor: "pointer" }}>SECURITY DETAILS</span>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
                  {[
                    ["activity", "Activity"],
                    ["fundamental", "Fundamental Ratios"],
                    ["performance", "Performance Overview"],
                    ["price", "Price Summary"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={`btn ${overviewTab === id ? "btn-primary" : "btn-outline"}`}
                      onClick={() => setOverviewTab(id)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {overviewTab === "activity" && (
                  <div className="card" style={{ padding: "14px", border: "1px solid var(--border-color)" }}>
                    <h3 style={{ marginBottom: "12px" }}>Activity</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
                      <div><div style={{ color: "var(--text-secondary)" }}>Open</div><strong>{intradayStats.open.toFixed(2)}</strong></div>
                      <div><div style={{ color: "var(--text-secondary)" }}>High</div><strong style={{ color: "#00D09C" }}>{intradayStats.high.toFixed(2)}</strong></div>
                      <div><div style={{ color: "var(--text-secondary)" }}>Low</div><strong style={{ color: "#FF4757" }}>{intradayStats.low.toFixed(2)}</strong></div>
                      <div><div style={{ color: "var(--text-secondary)" }}>Close</div><strong>{intradayStats.close.toFixed(2)}</strong></div>
                    </div>

                    <h4 style={{ marginTop: "16px", marginBottom: "10px" }}>Price Details</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
                      <div><div style={{ color: "var(--text-secondary)" }}>Average Price</div><strong>{averagePrice.toFixed(2)}</strong></div>
                      <div><div style={{ color: "var(--text-secondary)" }}>Volume</div><strong>{Number(intradayStats.volume || stock.volume || 0).toLocaleString()}</strong></div>
                      <div><div style={{ color: "var(--text-secondary)" }}>Bid / Ask</div><strong>{(price - 0.05).toFixed(2)} / {(price + 0.05).toFixed(2)}</strong></div>
                    </div>

                    <h4 style={{ marginTop: "16px", marginBottom: "8px" }}>Lower Circuit / Upper Circuit</h4>
                    <div style={{ height: "6px", background: "linear-gradient(90deg,#FF6666,#00D09C)", borderRadius: "6px", position: "relative" }}>
                      <div style={{ position: "absolute", left: `${dayRangePosition}%`, top: "-4px", width: "2px", height: "14px", background: "#cbd5e1" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "12px" }}>
                      <span>{lowerCircuit.toFixed(2)} Low</span>
                      <span>{upperCircuit.toFixed(2)} High</span>
                    </div>

                    <h4 style={{ marginTop: "14px", marginBottom: "8px" }}>52 Week Low / High</h4>
                    <div style={{ height: "6px", background: "linear-gradient(90deg,#FF6666,#00D09C)", borderRadius: "6px", position: "relative" }}>
                      <div style={{ position: "absolute", left: `${yearRangePosition}%`, top: "-4px", width: "2px", height: "14px", background: "#cbd5e1" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "12px" }}>
                      <span>{range52.low.toFixed(2)} Low</span>
                      <span>{range52.high.toFixed(2)} High</span>
                    </div>
                  </div>
                )}

                {overviewTab === "fundamental" && (
                  <div className="card" style={{ padding: "14px", border: "1px solid var(--border-color)" }}>
                    <h3 style={{ marginBottom: "12px" }}>Fundamental Ratios</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                      <div><div style={{ color: "var(--text-secondary)" }}>PE Ratio</div><strong>{fundamentalMetrics.peRatio.toFixed(2)}</strong></div>
                      <div><div style={{ color: "var(--text-secondary)" }}>Price to Book</div><strong>{fundamentalMetrics.pbRatio.toFixed(2)}</strong></div>
                      <div><div style={{ color: "var(--text-secondary)" }}>ROE</div><strong>{fundamentalMetrics.roe.toFixed(2)}%</strong></div>
                      <div><div style={{ color: "var(--text-secondary)" }}>EPS</div><strong>{fundamentalMetrics.eps.toFixed(2)}</strong></div>
                      <div><div style={{ color: "var(--text-secondary)" }}>Dividend Yield</div><strong>{fundamentalMetrics.dividendYield.toFixed(2)}%</strong></div>
                      <div><div style={{ color: "var(--text-secondary)" }}>Book Value</div><strong>{fundamentalMetrics.bookValue.toFixed(2)}</strong></div>
                      <div><div style={{ color: "var(--text-secondary)" }}>Market Cap</div><strong>{stock.marketCap ? Number(stock.marketCap).toLocaleString() : "-"}</strong></div>
                    </div>
                  </div>
                )}

                {overviewTab === "performance" && (
                  <div className="card" style={{ padding: "14px", border: "1px solid var(--border-color)" }}>
                    <h3 style={{ marginBottom: "12px" }}>Performance Overview</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                      <div className="card" style={{ padding: "10px", border: "1px solid var(--border-color)" }}>
                        <div style={{ color: "var(--text-secondary)", marginBottom: "4px" }}>Sector</div>
                        <strong>{stock.sector || "Unknown"}</strong>
                      </div>
                      <div className="card" style={{ padding: "10px", border: "1px solid var(--border-color)" }}>
                        <div style={{ color: "var(--text-secondary)", marginBottom: "4px" }}>Overall Trend</div>
                        <strong style={{ color: overallTrend.includes("Positive") ? "#00D09C" : overallTrend === "Negative" ? "#FF4757" : "#B8C6D3" }}>
                          {overallTrend}
                        </strong>
                      </div>
                      <div className="card" style={{ padding: "10px", border: "1px solid var(--border-color)" }}>
                        <div style={{ color: "var(--text-secondary)", marginBottom: "4px" }}>Daily Gain</div>
                        <strong style={{ color: fundamentalMetrics.dailyGain >= 0 ? "#00D09C" : "#FF4757" }}>
                          {fundamentalMetrics.dailyGain >= 0 ? "+" : ""}{fundamentalMetrics.dailyGain.toFixed(2)}%
                        </strong>
                      </div>
                      <div className="card" style={{ padding: "10px", border: "1px solid var(--border-color)" }}>
                        <div style={{ color: "var(--text-secondary)", marginBottom: "4px" }}>Monthly Gain</div>
                        <strong style={{ color: fundamentalMetrics.monthlyGain >= 0 ? "#00D09C" : "#FF4757" }}>
                          {fundamentalMetrics.monthlyGain >= 0 ? "+" : ""}{fundamentalMetrics.monthlyGain.toFixed(2)}%
                        </strong>
                      </div>
                      <div className="card" style={{ padding: "10px", border: "1px solid var(--border-color)" }}>
                        <div style={{ color: "var(--text-secondary)", marginBottom: "4px" }}>Short Term</div>
                        <strong style={{ color: shortTermTrend === "Bullish" ? "#00D09C" : shortTermTrend === "Bearish" ? "#FF4757" : "#B8C6D3" }}>
                          {shortTermTrend}
                        </strong>
                      </div>
                      <div className="card" style={{ padding: "10px", border: "1px solid var(--border-color)" }}>
                        <div style={{ color: "var(--text-secondary)", marginBottom: "4px" }}>Long Term</div>
                        <strong style={{ color: longTermTrend.includes("Positive") ? "#00D09C" : longTermTrend.includes("Negative") ? "#FF4757" : "#B8C6D3" }}>
                          {longTermTrend}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {overviewTab === "price" && (
                  <div className="card" style={{ padding: "14px", border: "1px solid var(--border-color)" }}>
                    <h3 style={{ marginBottom: "12px" }}>Price Summary</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                      <div><div style={{ color: "var(--text-secondary)" }}>Current Price</div><strong>{price.toFixed(2)}</strong></div>
                      <div><div style={{ color: "var(--text-secondary)" }}>Previous Close</div><strong>{Number(stock.previousClose || 0).toFixed(2)}</strong></div>
                      <div><div style={{ color: "var(--text-secondary)" }}>Day Change</div><strong style={{ color: isPositive ? "#00D09C" : "#FF4757" }}>{changeValue.toFixed(2)}</strong></div>
                      <div><div style={{ color: "var(--text-secondary)" }}>% Change</div><strong style={{ color: isPositive ? "#00D09C" : "#FF4757" }}>{changePercent.toFixed(2)}%</strong></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {!analysisMode && (
          <div className="order-card">
            <div className="order-form">
              <div className="qty-label">Stock Quantity</div>
              <div className="qty-control">
                <button type="button" className="qty-btn" onClick={() => adjustQty(-1)} disabled={ordering}><Minus size={16} /></button>
                <input className="qty-input" type="number" min="1" value={quantity} onChange={(e) => onQtyChange(e.target.value)} />
                <button type="button" className="qty-btn" onClick={() => adjustQty(1)} disabled={ordering}><Plus size={16} /></button>
              </div>
              <div className="order-total">
                <div className="order-total-label">Total</div>
                <div className="order-total-value">Rs {totalValue.toLocaleString()}</div>
              </div>
              <div className="order-buttons">
                <button className="btn btn-primary" onClick={() => handleOrder("BUY")} disabled={ordering}>{ordering ? "Placing..." : "Buy"}</button>
                <button className="btn btn-danger" onClick={() => handleOrder("SELL")} disabled={ordering}>{ordering ? "Placing..." : "Sell"}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
      {alertNotice && <div className={`toast ${alertNotice.type}`}>{alertNotice.message}</div>}
    </div>
  );
}

export default StockDetail;

