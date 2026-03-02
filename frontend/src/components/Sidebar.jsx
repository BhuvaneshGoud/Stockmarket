import { NavLink } from 'react-router-dom';
import { useContext } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Briefcase,
  History,
  Wallet,
  Star,
  LogOut,
  Zap
} from 'lucide-react';
import { WalletContext } from '../context/WalletContext';

function Sidebar({ user, onLogout }) {

  const { walletBalance } = useContext(WalletContext);

  if (!user) return null;

  const displayName = user.username || user.name || user.email || "User";

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/markets', icon: TrendingUp, label: 'Markets' },
    { path: '/portfolio', icon: Briefcase, label: 'Portfolio' },
    { path: '/transactions', icon: History, label: 'Transactions' },
    { path: '/watchlist', icon: Star, label: 'Watchlist' },
    { path: '/wallet', icon: Wallet, label: 'Wallet' },
  ];

  return (
    <aside className="sidebar">

      <div className="logo">
        <div className="logo-icon">
          <Zap size={24} color="white" />
        </div>
        <span>StockMarket</span>
      </div>

      <nav style={{ flex: 1 }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div
        style={{
          marginTop: 'auto',
          paddingTop: '20px',
          borderTop: '1px solid var(--border)'
        }}
      >
        <div
          className="user-info"
          style={{
            marginBottom: '16px',
            flexDirection: 'column',
            alignItems: 'flex-start'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>

            <div>
              <div style={{ fontWeight: 600 }}>
                {displayName}
              </div>

              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)'
                }}
              >
                ₹{Number(walletBalance || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <button
          className="nav-item"
          onClick={onLogout}
          style={{
            width: '100%',
            border: 'none',
            background: 'transparent'
          }}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>

    </aside>
  );
}

export default Sidebar;
