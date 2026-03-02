import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star } from 'lucide-react';
import { stocksAPI } from '../api/api';
import { connectStockSocket, disconnectStockSocket } from '../services/liveStock';
import { getWatchlistSymbols, toggleWatchlistSymbol } from '../services/watchlist';

function Markets() {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [watchlist, setWatchlist] = useState(getWatchlistSymbols());

  useEffect(() => {
    loadInitialStocks();

    // 🔥 Connect WebSocket for live updates
    connectStockSocket((liveStocks) => {
      setStocks(liveStocks);
      setInitialFetchDone(true);
    });

    // Cleanup on unmount
    return () => {
      disconnectStockSocket();
    };
  }, []);

  const loadInitialStocks = async () => {
    setLoading(true);
    try {
      const response = await stocksAPI.getAll();
      setStocks(response.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setInitialFetchDone(true);
    }
  };

  const filteredStocks = stocks.filter((stock) =>
    (stock.symbol || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (stock.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleWatch = (e, symbol) => {
    e.stopPropagation();
    const updated = toggleWatchlistSymbol(symbol);
    setWatchlist(updated);
  };

  return (
    <div>
      <div className="header">
        <h1>Markets (Live)</h1>
      </div>

      <div className="search-container">
        <div style={{ position: 'relative' }}>
          <Search
            size={20}
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)',
            }}
          />
          <input
            type="text"
            className="search-input"
            placeholder="Search stocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '48px' }}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">All Stocks</h3>
        </div>

        {loading && stocks.length === 0 && (
          <div style={{ color: 'var(--text-secondary)', padding: '10px 4px' }}>
            Loading market data...
          </div>
        )}

        {!loading && initialFetchDone && filteredStocks.length === 0 && (
          <div style={{ color: 'var(--text-secondary)', padding: '10px 4px' }}>
            No stocks found.
          </div>
        )}

        <div className="stock-list">
          {filteredStocks.map((stock) => {
            const price = Number(stock.currentPrice || 0);
            const change = Number(stock.priceChangePercent || 0);
            const volume = stock.volume
              ? (Number(stock.volume) / 1000000).toFixed(1)
              : '0.0';

            return (
              <div
                key={stock.symbol}
                className="stock-item"
                onClick={() => navigate(`/stock/${stock.symbol}`)}
              >
                <button
                  type="button"
                  className="toolbar-icon-btn"
                  title={watchlist.includes((stock.symbol || '').toUpperCase()) ? 'Remove from watchlist' : 'Add to watchlist'}
                  onClick={(e) => handleToggleWatch(e, stock.symbol)}
                  style={{ marginRight: '8px' }}
                >
                  <Star
                    size={14}
                    fill={watchlist.includes((stock.symbol || '').toUpperCase()) ? '#f6c945' : 'none'}
                    color={watchlist.includes((stock.symbol || '').toUpperCase()) ? '#f6c945' : 'var(--text-secondary)'}
                  />
                </button>
                <div className="stock-info">
                  <span className="stock-symbol">{stock.symbol}</span>
                  <span className="stock-name">{stock.name}</span>
                </div>

                <div className="stock-price">
                  ₹{price.toFixed(2)}
                </div>

                <div
                  className={`stock-change ${
                    change >= 0 ? 'positive' : 'negative'
                  }`}
                >
                  {change >= 0 ? '+' : ''}
                  {change.toFixed(2)}%
                </div>

                <div
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                  }}
                >
                  {volume}M
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Markets;
