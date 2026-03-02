import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Markets from './pages/Markets';
import Portfolio from './pages/Portfolio';
import Transactions from './pages/Transactions';
import StockDetail from './pages/StockDetail';
import Wallet from './pages/Wallet';
import Watchlist from './pages/Watchlist';
import Sidebar from './components/Sidebar';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isLikelyJwt = (value) =>
    typeof value === 'string' &&
    value !== 'undefined' &&
    value !== 'null' &&
    value.split('.').length === 3;

  // ✅ Check authentication on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (isLikelyJwt(token) && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.clear();
        setUser(null);
      }
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }

    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    if (!isLikelyJwt(userData?.token)) return;

    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userData.token);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.clear();
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <Router>
      {!user ? (
        <Routes>
          <Route path="/" element={<Login onLogin={handleLogin} />} />
          <Route path="/register" element={<Register onLogin={handleLogin} />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/markets" element={<Navigate to="/" replace />} />
          <Route path="/portfolio" element={<Navigate to="/" replace />} />
          <Route path="/transactions" element={<Navigate to="/" replace />} />
          <Route path="/watchlist" element={<Navigate to="/" replace />} />
          <Route path="/wallet" element={<Navigate to="/" replace />} />
          <Route path="/stock/:symbol" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      ) : (
        <div className="app">
          <Sidebar user={user} onLogout={handleLogout} />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              
              <Route path="/markets" element={<Markets user={user} />} />
              <Route path="/portfolio" element={<Portfolio user={user} />} />
              <Route path="/transactions" element={<Transactions user={user} />} />
              <Route path="/watchlist" element={<Watchlist user={user} />} />
              <Route path="/stock/:symbol" element={<StockDetail user={user} />} />
              <Route path="/wallet" element={<Wallet user={user} setUser={setUser} />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      )}
    </Router>
  );
}

export default App;
