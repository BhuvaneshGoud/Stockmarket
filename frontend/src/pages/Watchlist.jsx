import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star } from "lucide-react";
import { connectStockSocket, disconnectStockSocket } from "../services/liveStock";
import { stocksAPI } from "../api/api";
import StockLogo from "../components/StockLogo";
import { getWatchlistSymbols, toggleWatchlistSymbol } from "../services/watchlist";

function Watchlist() {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [watchlist, setWatchlist] = useState(getWatchlistSymbols());

  useEffect(() => {
    stocksAPI
      .getAll()
      .then((res) => setStocks(res?.data || []))
      .catch(() => {});

    connectStockSocket((liveStocks) => {
      setStocks(liveStocks || []);
    });

    return () => disconnectStockSocket();
  }, []);

  const watchlistStocks = useMemo(() => {
    const watchSet = new Set(watchlist.map((s) => s.toUpperCase()));
    return (stocks || []).filter((s) => watchSet.has((s.symbol || "").toUpperCase()));
  }, [stocks, watchlist]);

  const handleToggle = (e, symbol) => {
    e.stopPropagation();
    const updated = toggleWatchlistSymbol(symbol);
    setWatchlist(updated);
  };

  return (
    <div>
      <div className="header">
        <h1>Watchlist</h1>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Starred Stocks ({watchlistStocks.length})</h3>
        </div>

        {watchlistStocks.length === 0 ? (
          <div style={{ color: "var(--text-secondary)" }}>
            No stocks in watchlist. Click star on Markets or Dashboard to add.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <th style={{ width: "40px", padding: "10px" }}></th>
                  <th style={{ textAlign: "left", padding: "10px", color: "var(--text-secondary)" }}>Stock</th>
                  <th style={{ textAlign: "right", padding: "10px", color: "var(--text-secondary)" }}>LTP</th>
                  <th style={{ textAlign: "right", padding: "10px", color: "var(--text-secondary)" }}>%Chng</th>
                </tr>
              </thead>
              <tbody>
                {watchlistStocks.map((stock) => {
                  const ltp = Number(stock.currentPrice || 0);
                  const pct = Number(stock.priceChangePercent || 0);
                  const positive = pct >= 0;
                  return (
                    <tr
                      key={stock.symbol}
                      style={{ borderBottom: "1px solid var(--border-color)", cursor: "pointer" }}
                      onClick={() => navigate(`/stock/${stock.symbol}`)}
                    >
                      <td style={{ padding: "10px" }}>
                        <button
                          type="button"
                          className="toolbar-icon-btn"
                          onClick={(e) => handleToggle(e, stock.symbol)}
                          title="Remove from watchlist"
                        >
                          <Star size={14} fill="#f6c945" color="#f6c945" />
                        </button>
                      </td>
                      <td style={{ padding: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <StockLogo symbol={stock.symbol} name={stock.name} logoUrl={stock.logoUrl} />
                          <div>
                            <div style={{ fontWeight: 700 }}>{stock.symbol}</div>
                            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{stock.name}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: "right", padding: "10px", fontWeight: 600, color: positive ? "#00D09C" : "#FF4757" }}>
                        Rs {ltp.toFixed(2)}
                      </td>
                      <td style={{ textAlign: "right", padding: "10px", color: positive ? "#00D09C" : "#FF4757" }}>
                        {positive ? "+" : ""}{pct.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Watchlist;
