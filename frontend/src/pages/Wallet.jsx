import { useState, useContext } from 'react';
import { walletAPI } from '../api/api';
import { WalletContext } from "../context/WalletContext";

const Wallet = () => {

  const user = JSON.parse(localStorage.getItem('user'));

  const { walletBalance, setWalletBalance } = useContext(WalletContext);

  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message , setMessage] = useState('');

  const handleAddMoney = async (e) => {
    e.preventDefault();

    const parsedAmount = parseFloat(amount);

    if (!parsedAmount || parsedAmount <= 0) {
      setMessage('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await walletAPI.addMoney({
        amount: parsedAmount
      });

      const newBalance = response?.data?.newBalance ?? walletBalance + parsedAmount;

      // ✅ Update context (global state)
      setWalletBalance(newBalance);

      // ✅ Update localStorage user
      const updatedUser = {
        ...user,
        balance: newBalance
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      setMessage(`Successfully added ₹${parsedAmount.toLocaleString()}!`);
      setAmount('');

    } catch (error) {
      setMessage(
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to add money'
      );
    } finally {
      setLoading(false);

      setTimeout(() => {
        setMessage('');
      }, 3000);
    }
  };

  return (
    <div className="wallet-page">
      <div className="page-header">
        <h1>Wallet</h1>
      </div>

      <div className="wallet-container">

        <div className="balance-card">
          <h2>Current Balance</h2>
          <p className="balance-amount">
            ₹{Number(walletBalance).toFixed(2)}
          </p>
        </div>

        <div className="add-money-card">
          <h2>Add Money</h2>

          <form onSubmit={handleAddMoney}>
            <div className="form-group">
              <label>Amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min="1"
                step="0.01"
                disabled={loading}
              />
            </div>

            <div className="quick-amounts">
              {[1000, 5000, 10000, 25000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val.toString())}
                  disabled={loading}
                >
                  ₹{val.toLocaleString()}
                </button>
              ))}
            </div>

            <button
              type="submit"
              className="add-money-btn"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Money'}
            </button>
          </form>

          {message && (
            <div
              className={`message ${
                message.includes('Successfully')
                  ? 'success'
                  : 'error'
              }`}
            >
              {message}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Wallet;
