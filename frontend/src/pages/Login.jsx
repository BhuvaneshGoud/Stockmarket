import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { authAPI } from '../api/api';

function Login({ onLogin }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(formData);

      if (!response?.data?.token) {
        throw new Error('Invalid login response');
      }

      const userData = {
        email: response.data.email,
        userId: response.data.userId,
        token: response.data.token,
      };

      // ✅ Save user data and token
      onLogin(userData);

      // ✅ Redirect correctly
      navigate('/dashboard');

    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Invalid email or password'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <Zap size={48} color="#00D09C" />
          <h1>StockMarket</h1>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                padding: '12px',
                background: 'rgba(255,71,87,0.1)',
                borderRadius: '8px',
                color: '#FF4757',
                fontSize: '14px',
              }}
            >
              {error}
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Register</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
