import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { portfolioAPI, walletAPI } from '../api/api';
import { connectStockSocket, disconnectStockSocket } from '../services/liveStock';

function Portfolio({ user }) {
  const navigate = useNavigate();

  const [holdings, setHoldings] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  useEffect(() => {
    loadInitialPortfolio();

    // 🔥 Subscribe to live stock updates
    connectStockSocket((liveStocks) => {
      setHoldings((prevHoldings) =>
        prevHoldings.map((holding) => {
          const updatedStock = liveStocks.find(
            (s) => s.symbol === holding.stock.symbol
          );

          if (updatedStock) {
            return {
              ...holding,
              stock: {
                ...holding.stock,
                currentPrice: updatedStock.currentPrice
              }
            };
          }

          return holding;
        })
      );
    });

    return () => disconnectStockSocket();
  }, []);

  const loadInitialPortfolio = async () => {
    setLoading(true);
    try {
      const [holdingsRes, walletRes] = await Promise.all([
        portfolioAPI.getPortfolio(user.userId),
        walletAPI.getBalance(user.userId)
      ]);

      setHoldings(holdingsRes.data || []);
      setWalletBalance(walletRes?.data?.balance || 0);
    } catch (err) {
      console.error("Portfolio load error:", err);
    } finally {
      setLoading(false);
      setInitialFetchDone(true);
    }
  };

  // 🔥 Calculate portfolio dynamically
  const totalInvested = holdings.reduce(
    (sum, h) =>
      sum + Number(h.averagePrice || 0) * Number(h.quantity || 0),
    0
  );

  const totalValue = holdings.reduce(
    (sum, h) =>
      sum + Number(h.stock?.currentPrice || 0) * Number(h.quantity || 0),
    0
  );

  const totalProfit = totalValue - totalInvested;
  const profitPercent =
    totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  const COLORS = [
    '#00D09C','#2E5A88','#FF4757',
    '#FFD700','#9B59B6','#3498DB',
    '#E74C3C','#1ABC9C'
  ];

  const chartData = holdings.map((holding, index) => ({
    name: holding?.stock?.symbol || 'N/A',
    value:
      Number(holding?.stock?.currentPrice || 0) *
      Number(holding.quantity || 0),
    color: COLORS[index % COLORS.length]
  }));

  return (
    <div>

      <div className="header">
        <h1>Portfolio (Live)</h1>
      </div>

      {/* ===== STATS ===== */}
      <div className="stats-grid">

        <div className="stat-card">
          <div className="stat-label">Total Portfolio Value</div>
          <div className="stat-value">
            ₹{totalValue.toLocaleString()}
          </div>
          <div className={`stat-change ${totalProfit >= 0 ? 'positive' : 'negative'}`}>
            {totalProfit >= 0 ? '+' : ''}
            ₹{Math.abs(totalProfit).toLocaleString()}
            ({profitPercent.toFixed(2)}%)
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Invested</div>
          <div className="stat-value">
            ₹{totalInvested.toLocaleString()}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Available Balance</div>
          <div className="stat-value">
            ₹{walletBalance.toLocaleString()}
          </div>
        </div>

      </div>

      {/* ===== PIE CHART ===== */}
      {holdings.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">Allocation</h3>
          </div>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    `₹${Number(value).toLocaleString()}`
                  }
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ===== HOLDINGS ===== */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Holdings</h3>
        </div>

        {loading && holdings.length === 0 && (
          <div style={{ color: 'var(--text-secondary)', padding: '10px 4px' }}>
            Loading portfolio...
          </div>
        )}

        {!loading && initialFetchDone && holdings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>No holdings yet. Start investing by visiting the Markets!</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/markets')}
            >
              Explore Markets
            </button>
          </div>
        ) : (
          <div className="portfolio-grid">
            {holdings.map((holding) => {

              const currentValue =
                Number(holding?.stock?.currentPrice || 0) *
                Number(holding.quantity || 0);

              const investedValue =
                Number(holding.averagePrice || 0) *
                Number(holding.quantity || 0);

              const profit = currentValue - investedValue;
              const profitPercent =
                investedValue > 0 ? (profit / investedValue) * 100 : 0;

              return (
                <div
                  key={holding.id}
                  className="holding-card"
                  onClick={() => navigate(`/stock/${holding?.stock?.symbol}`)}
                >
                  <div>
                    <strong>{holding?.stock?.symbol}</strong>
                    <div>{holding?.stock?.name}</div>
                  </div>

                  <div>
                    ₹{currentValue.toLocaleString()}
                    <div className={profit >= 0 ? 'positive' : 'negative'}>
                      {profit >= 0 ? '+' : ''}
                      ₹{profit.toLocaleString()} ({profitPercent.toFixed(2)}%)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

export default Portfolio;
