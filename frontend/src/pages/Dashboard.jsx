import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  ArrowUpRight,
  Wallet,
  PieChart,
  Star,
} from "lucide-react";
import { stocksAPI, portfolioAPI, walletAPI } from "../api/api";
import { connectStockSocket, disconnectStockSocket } from "../services/liveStock";
import StockLogo from "../components/StockLogo";
import { getWatchlistSymbols, toggleWatchlistSymbol } from "../services/watchlist";

const DASHBOARD_TABS = [
  { id: "stockDiscovery", label: "Stock Discovery" },
  { id: "indexFo", label: "Index F&O" },
  { id: "stocksFo", label: "Stocks F&O" },
  { id: "commodities", label: "Commodities" },
];

const INDEX_FO_SYMBOLS = ["SPY", "QQQ", "DIA", "IWM", "VOO"];
const COMMODITY_SYMBOLS = ["GLD", "SLV", "USO", "UNG", "DBA", "CPER"];

function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0 });
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [activeTab, setActiveTab] = useState("stockDiscovery");
  const [moverView, setMoverView] = useState("gainers");
  const [stockFilter, setStockFilter] = useState("default");
  const [moversFilter, setMoversFilter] = useState("default");
  const [holdingsFilter, setHoldingsFilter] = useState("default");
  const [watchlist, setWatchlist] = useState(getWatchlistSymbols());

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      navigate("/");
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    loadInitialData(parsedUser.userId);

    connectStockSocket((liveStocks) => {
      setStocks(liveStocks || []);
    });

    return () => disconnectStockSocket();
  }, []);

  const loadInitialData = async (userId) => {
    try {
      const [holdingsResult, walletResult] = await Promise.allSettled([
        portfolioAPI.getPortfolio(userId),
        walletAPI.getBalance(userId),
      ]);

      const holdingsData = holdingsResult.status === "fulfilled" ? holdingsResult.value.data || [] : [];
      const walletData = walletResult.status === "fulfilled" ? walletResult.value.data || { balance: 0 } : { balance: 0 };

      setHoldings(holdingsData);
      setWallet(walletData);
    } catch (err) {
      console.error(err);
    }
    // Do not block initial render on stocks API.
    stocksAPI
      .getAll()
      .then((res) => setStocks(res?.data || []))
      .catch((err) => {
        console.error(err);
      });
  };

  useEffect(() => {
    let totalValue = 0;
    holdings.forEach((holding) => {
      const stock = stocks.find((s) => s.symbol === holding.symbol);
      const liveOrFallbackPrice = stock
        ? Number(stock.currentPrice || 0)
        : Number(holding.averagePrice || 0);
      totalValue += Number(holding.quantity || 0) * liveOrFallbackPrice;
    });
    setPortfolioValue(totalValue);
  }, [holdings, stocks]);

  const sortedStocks = [...stocks].sort((a, b) => (a.symbol || "").localeCompare(b.symbol || ""));
  const getChange = (stock) => {
    const direct = Number(stock?.priceChange);
    if (!Number.isNaN(direct) && Number.isFinite(direct) && direct !== 0) {
      return direct;
    }
    const current = Number(stock?.currentPrice);
    const prev = Number(stock?.previousClose);
    if (Number.isFinite(current) && Number.isFinite(prev) && prev > 0) {
      return current - prev;
    }
    return 0;
  };

  const getPercentChange = (stock) => {
    const direct = Number(stock?.priceChangePercent);
    if (!Number.isNaN(direct) && Number.isFinite(direct) && direct !== 0) {
      return direct;
    }
    const current = Number(stock?.currentPrice);
    const prev = Number(stock?.previousClose);
    if (Number.isFinite(current) && Number.isFinite(prev) && prev > 0) {
      return ((current - prev) / prev) * 100;
    }
    return 0;
  };

  const sortStocksByFilter = (list, filterValue) => {
    return [...list].sort((a, b) => {
      const aPrice = Number(a?.currentPrice || 0);
      const bPrice = Number(b?.currentPrice || 0);
      const aProfit = getPercentChange(a);
      const bProfit = getPercentChange(b);

      if (filterValue === "moneyLowHigh") return aPrice - bPrice;
      if (filterValue === "moneyHighLow") return bPrice - aPrice;
      if (filterValue === "profitLowHigh") return aProfit - bProfit;
      if (filterValue === "profitHighLow") return bProfit - aProfit;
      return (a.symbol || "").localeCompare(b.symbol || "");
    });
  };

  const rankedByPct = [...stocks].sort((a, b) => getPercentChange(b) - getPercentChange(a));
  const gainers = rankedByPct.filter((s) => getPercentChange(s) > 0).slice(0, 5);
  const losers = [...rankedByPct].reverse().filter((s) => getPercentChange(s) < 0).slice(0, 5);
  const fallbackGainers = gainers.length ? gainers : rankedByPct.slice(0, 5);
  const fallbackLosers = losers.length ? losers : [...rankedByPct].reverse().slice(0, 5);

  const tabStocks = (() => {
    if (activeTab === "indexFo") {
      return sortedStocks.filter((s) => INDEX_FO_SYMBOLS.includes((s.symbol || "").toUpperCase()));
    }

    if (activeTab === "commodities") {
      return sortedStocks.filter((s) => COMMODITY_SYMBOLS.includes((s.symbol || "").toUpperCase()));
    }

    if (activeTab === "stocksFo") {
      return sortedStocks.filter((s) => {
        const symbol = (s.symbol || "").toUpperCase();
        return !INDEX_FO_SYMBOLS.includes(symbol) && !COMMODITY_SYMBOLS.includes(symbol);
      });
    }

    return sortedStocks;
  })();

  const topStocks = tabStocks;
  const filteredTopStocks = sortStocksByFilter(topStocks, stockFilter);
  const moverStocks = moverView === "gainers" ? fallbackGainers : fallbackLosers;
  const filteredMoverStocks = sortStocksByFilter(moverStocks, moversFilter);
  const holdingsRows = holdings.map((holding) => {
    const stock = stocks.find((s) => s.symbol === holding.symbol);
    const avgPrice = Number(holding.averagePrice || 0);
    const currentPrice = stock ? Number(stock.currentPrice || 0) : avgPrice;
    const quantity = Number(holding.quantity || 0);
    const pl = (currentPrice - avgPrice) * quantity;
    const plPercent = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
    const holdingValue = currentPrice * quantity;
    return { holding, stock, currentPrice, avgPrice, quantity, pl, plPercent, holdingValue };
  });
  const filteredHoldings = [...holdingsRows]
    .sort((a, b) => {
      if (holdingsFilter === "moneyLowHigh") return a.holdingValue - b.holdingValue;
      if (holdingsFilter === "moneyHighLow") return b.holdingValue - a.holdingValue;
      if (holdingsFilter === "profitLowHigh") return a.pl - b.pl;
      if (holdingsFilter === "profitHighLow") return b.pl - a.pl;
      return (a.holding.symbol || "").localeCompare(b.holding.symbol || "");
    })
    .slice(0, 5);
  const activeTabLabel = DASHBOARD_TABS.find((t) => t.id === activeTab)?.label || "Live Markets";
  const isWatch = (symbol) => watchlist.includes((symbol || "").toUpperCase());
  const handleToggleWatch = (e, symbol) => {
    e.stopPropagation();
    const updated = toggleWatchlistSymbol(symbol);
    setWatchlist(updated);
  };

  return (
    <div style={{ color: "white", padding: "20px" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1>Welcome back, {user?.name || "Trader"}!</h1>
        <p style={{ color: "var(--text-secondary)" }}>Here is your portfolio overview</p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "20px",
          marginBottom: "40px",
        }}
      >
        <div className="card" style={{ cursor: "pointer" }} onClick={() => navigate("/wallet")}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                background: "rgba(0, 208, 156, 0.1)",
                padding: "12px",
                borderRadius: "12px",
              }}
            >
              <Wallet size={24} color="#00D09C" />
            </div>
            <div>
              <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "14px" }}>Wallet Balance</p>
              <h2 style={{ margin: 0, fontSize: "24px" }}>Rs {Number(wallet.balance || 0).toLocaleString()}</h2>
            </div>
          </div>
        </div>

        <div className="card" style={{ cursor: "pointer" }} onClick={() => navigate("/portfolio")}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                background: "rgba(0, 208, 156, 0.1)",
                padding: "12px",
                borderRadius: "12px",
              }}
            >
              <PieChart size={24} color="#00D09C" />
            </div>
            <div>
              <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "14px" }}>Portfolio Value</p>
              <h2 style={{ margin: 0, fontSize: "24px" }}>Rs {portfolioValue.toLocaleString()}</h2>
            </div>
          </div>
        </div>

        <div className="card" style={{ cursor: "pointer" }} onClick={() => navigate("/portfolio")}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                background: "rgba(255, 159, 67, 0.1)",
                padding: "12px",
                borderRadius: "12px",
              }}
            >
              <Briefcase size={24} color="#FF9F43" />
            </div>
            <div>
              <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "14px" }}>Total Holdings</p>
              <h2 style={{ margin: 0, fontSize: "24px" }}>{holdings.length} Stocks</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="dashboard-tabs">
          {DASHBOARD_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`dashboard-tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <h3 className="card-title">{activeTabLabel} ({filteredTopStocks.length})</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <select
              className="toolbar-select"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              style={{ minWidth: "220px" }}
            >
              <option value="default">Default (A-Z)</option>
              <option value="moneyLowHigh">Money: Low to High</option>
              <option value="moneyHighLow">Money: High to Low</option>
              <option value="profitLowHigh">Profit: Low to High</option>
              <option value="profitHighLow">Profit: High to Low</option>
            </select>
            <button className="btn btn-outline" onClick={() => navigate("/markets")} style={{ padding: "8px 16px" }}>
              View All <ArrowUpRight size={16} />
            </button>
          </div>
        </div>

        {filteredTopStocks.length === 0 ? (
          <div className="chart-empty" style={{ minHeight: "140px", marginTop: "0" }}>
            No symbols available in this tab right now.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <th style={{ width: "44px", padding: "10px" }}></th>
                  <th style={{ textAlign: "left", padding: "10px", color: "var(--text-secondary)" }}>Stock</th>
                  <th style={{ textAlign: "right", padding: "10px", color: "var(--text-secondary)" }}>LTP</th>
                  <th style={{ textAlign: "right", padding: "10px", color: "var(--text-secondary)" }}>Chng</th>
                  <th style={{ textAlign: "right", padding: "10px", color: "var(--text-secondary)" }}>%Chng</th>
                </tr>
              </thead>
              <tbody>
                {filteredTopStocks.map((stock, index) => {
                  const ltp = Number(stock.currentPrice || 0);
                  const chng = getChange(stock);
                  const pchng = getPercentChange(stock);
                  const isPositive = pchng >= 0;

                  return (
                    <tr
                      key={`${stock.symbol || "stock"}-${index}`}
                      style={{ borderBottom: "1px solid var(--border-color)", cursor: "pointer" }}
                      onClick={() => navigate(`/stock/${stock.symbol}`)}
                    >
                      <td style={{ padding: "10px" }}>
                        <button
                          type="button"
                          className="toolbar-icon-btn"
                          onClick={(e) => handleToggleWatch(e, stock.symbol)}
                          title={isWatch(stock.symbol) ? "Remove from watchlist" : "Add to watchlist"}
                        >
                          <Star size={14} fill={isWatch(stock.symbol) ? "#f6c945" : "none"} color={isWatch(stock.symbol) ? "#f6c945" : "var(--text-secondary)"} />
                        </button>
                      </td>
                      <td style={{ padding: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <StockLogo symbol={stock.symbol} name={stock.name} logoUrl={stock.logoUrl} />
                          <div>
                            <div style={{ fontWeight: "bold" }}>{stock.symbol}</div>
                            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{stock.name}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: "right", padding: "10px", color: isPositive ? "#00D09C" : "#FF4757", fontWeight: 600 }}>
                        Rs {ltp.toFixed(2)}
                      </td>
                      <td style={{ textAlign: "right", padding: "10px", color: isPositive ? "#00D09C" : "#FF4757" }}>
                        {isPositive ? "+" : ""}{chng.toFixed(2)}
                      </td>
                      <td style={{ textAlign: "right", padding: "10px", color: isPositive ? "#00D09C" : "#FF4757" }}>
                        {isPositive ? "+" : ""}{pchng.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3 className="card-title">Top Movers and Losers</h3>
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
          <button
            type="button"
            className={`btn ${moverView === "gainers" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setMoverView("gainers")}
            style={{ padding: "6px 14px" }}
          >
            Gainers
          </button>
          <button
            type="button"
            className={`btn ${moverView === "losers" ? "btn-danger" : "btn-outline"}`}
            onClick={() => setMoverView("losers")}
            style={{ padding: "6px 14px" }}
          >
            Losers
          </button>
          <select
            className="toolbar-select"
            value={moversFilter}
            onChange={(e) => setMoversFilter(e.target.value)}
            style={{ minWidth: "220px" }}
          >
            <option value="default">Default (A-Z)</option>
            <option value="moneyLowHigh">Money: Low to High</option>
            <option value="moneyHighLow">Money: High to Low</option>
            <option value="profitLowHigh">Profit: Low to High</option>
            <option value="profitHighLow">Profit: High to Low</option>
          </select>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                <th style={{ width: "44px", padding: "10px" }}></th>
                <th style={{ textAlign: "left", padding: "10px", color: "var(--text-secondary)" }}>Stock</th>
                <th style={{ textAlign: "right", padding: "10px", color: "var(--text-secondary)" }}>LTP</th>
                <th style={{ textAlign: "right", padding: "10px", color: "var(--text-secondary)" }}>Chng</th>
                <th style={{ textAlign: "right", padding: "10px", color: "var(--text-secondary)" }}>%Chng</th>
              </tr>
            </thead>
            <tbody>
              {filteredMoverStocks.map((stock, index) => {
                const ltp = Number(stock.currentPrice || 0);
                const chng = getChange(stock);
                const pchng = getPercentChange(stock);
                const isPositive = pchng >= 0;
                return (
                  <tr
                    key={`${moverView}-${stock.symbol || "stock"}-${index}`}
                    style={{ borderBottom: "1px solid var(--border-color)", cursor: "pointer" }}
                    onClick={() => navigate(`/stock/${stock.symbol}`)}
                  >
                    <td style={{ padding: "10px" }}>
                      <button
                        type="button"
                        className="toolbar-icon-btn"
                        onClick={(e) => handleToggleWatch(e, stock.symbol)}
                        title={isWatch(stock.symbol) ? "Remove from watchlist" : "Add to watchlist"}
                      >
                        <Star size={14} fill={isWatch(stock.symbol) ? "#f6c945" : "none"} color={isWatch(stock.symbol) ? "#f6c945" : "var(--text-secondary)"} />
                      </button>
                    </td>
                    <td style={{ padding: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <StockLogo symbol={stock.symbol} name={stock.name} logoUrl={stock.logoUrl} />
                        <div>
                          <div style={{ fontWeight: "bold" }}>{stock.symbol}</div>
                          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{stock.name}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: "right", padding: "10px", color: isPositive ? "#00D09C" : "#FF4757", fontWeight: 600 }}>
                      Rs {ltp.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right", padding: "10px", color: isPositive ? "#00D09C" : "#FF4757" }}>
                      {isPositive ? "+" : ""}{chng.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right", padding: "10px", color: isPositive ? "#00D09C" : "#FF4757" }}>
                      {isPositive ? "+" : ""}{pchng.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {holdings.length > 0 && (
        <div className="card" style={{ marginTop: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <h3 className="card-title">Your Holdings</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <select
                className="toolbar-select"
                value={holdingsFilter}
                onChange={(e) => setHoldingsFilter(e.target.value)}
                style={{ minWidth: "220px" }}
              >
                <option value="default">Default (A-Z)</option>
                <option value="moneyLowHigh">Money: Low to High</option>
                <option value="moneyHighLow">Money: High to Low</option>
                <option value="profitLowHigh">Profit: Low to High</option>
                <option value="profitHighLow">Profit: High to Low</option>
              </select>
              <button className="btn btn-outline" onClick={() => navigate("/portfolio")} style={{ padding: "8px 16px" }}>
                View Portfolio <ArrowUpRight size={16} />
              </button>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <th style={{ textAlign: "left", padding: "12px", color: "var(--text-secondary)" }}>Stock</th>
                  <th style={{ textAlign: "right", padding: "12px", color: "var(--text-secondary)" }}>Quantity</th>
                  <th style={{ textAlign: "right", padding: "12px", color: "var(--text-secondary)" }}>Avg Price</th>
                  <th style={{ textAlign: "right", padding: "12px", color: "var(--text-secondary)" }}>Current Price</th>
                  <th style={{ textAlign: "right", padding: "12px", color: "var(--text-secondary)" }}>P/L</th>
                </tr>
              </thead>
              <tbody>
                {filteredHoldings.map(({ holding, stock, currentPrice, avgPrice, pl, plPercent, quantity }, index) => {
                  const isPositive = pl >= 0;

                  return (
                    <tr key={`${holding.symbol || "holding"}-${holding.id || index}`} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <StockLogo symbol={holding.symbol} name={stock?.name || holding.symbol} logoUrl={stock?.logoUrl} />
                          <div>
                            <div style={{ fontWeight: "bold" }}>{holding.symbol}</div>
                            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{stock?.name || "-"}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: "right", padding: "12px" }}>{quantity}</td>
                      <td style={{ textAlign: "right", padding: "12px" }}>Rs {avgPrice.toFixed(2)}</td>
                      <td style={{ textAlign: "right", padding: "12px" }}>Rs {currentPrice.toFixed(2)}</td>
                      <td style={{ textAlign: "right", padding: "12px", color: isPositive ? "#00D09C" : "#FF4757" }}>
                        {isPositive ? "+" : ""}Rs {pl.toFixed(2)} ({plPercent.toFixed(2)}%)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {holdings.length === 0 && (
        <div className="card" style={{ marginTop: "20px", textAlign: "center", padding: "40px" }}>
          <Briefcase size={48} style={{ color: "var(--text-secondary)", marginBottom: "16px" }} />
          <h3>No holdings yet</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>
            Start investing by exploring the markets
          </p>
          <button className="btn btn-primary" onClick={() => navigate("/markets")}>
            Explore Markets
          </button>
        </div>
      )}

    </div>
  );
}

export default Dashboard;
