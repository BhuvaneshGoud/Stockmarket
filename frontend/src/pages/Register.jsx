import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { authAPI } from "../api/api";

function Register({ onLogin }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await authAPI.register(formData);
      const { token, userId, email } = response.data;

      const userData = {
        userId,
        email,
        name: formData.name,
        balance: 0,
        token,
      };

      if (onLogin) {
        onLogin(userData);
      } else {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(userData));
      }

      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Registration failed"
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

        <form className="auth-form" onSubmit={handleRegister}>
          {error && (
            <div
              style={{
                padding: "12px",
                background: "rgba(255,71,87,0.1)",
                borderRadius: "8px",
                color: "#FF4757",
                fontSize: "14px",
                marginBottom: "12px",
              }}
            >
              {error}
            </div>
          )}

          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
            disabled={loading}
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/">Login</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
