import { useState, useEffect } from 'react';
import { portfolioAPI } from '../api/api';

function Transactions({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  useEffect(() => {
    loadTransactions();

    // Optional auto refresh every 15 seconds
    const interval = setInterval(loadTransactions, 15000);

    return () => clearInterval(interval);
  }, [user?.userId]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const response = await portfolioAPI.getTransactions(user.userId);

      const sorted = (response.data || []).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      setTransactions(sorted);
    } catch (err) {
      console.error('Transaction load error:', err);
    } finally {
      setLoading(false);
      setInitialFetchDone(true);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      <div className="header">
        <h1>Transactions</h1>
      </div>

      <div className="card">
        {loading && transactions.length === 0 && (
          <div style={{ color: 'var(--text-secondary)', padding: '10px 4px' }}>
            Loading transactions...
          </div>
        )}

        {!loading && initialFetchDone && transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>No transactions yet.</p>
          </div>
        ) : (
          <div className="transaction-list">

            {/* Header Row */}
            <div
              className="transaction-item"
              style={{
                background: 'transparent',
                cursor: 'default',
                fontWeight: 600
              }}
            >
              <div>Type</div>
              <div>Stock</div>
              <div>Quantity</div>
              <div>Price</div>
              <div>Total</div>
              <div>Date</div>
            </div>

            {transactions.map((transaction) => {
              const price = Number(transaction.price || 0);
              const total = Number(transaction.totalAmount || 0);

              return (
                <div key={transaction.id} className="transaction-item">

                  <div
                    className={`transaction-type ${
                      transaction.type?.toLowerCase() === 'buy'
                        ? 'positive'
                        : 'negative'
                    }`}
                  >
                    {transaction.type || 'N/A'}
                  </div>

                  <div>
                    {transaction?.stock?.symbol || 'N/A'}
                  </div>

                  <div>{transaction.quantity || 0}</div>

                  <div>₹{price.toFixed(2)}</div>

                  <div style={{ fontWeight: 600 }}>
                    ₹{total.toFixed(2)}
                  </div>

                  <div>
                    {formatDate(transaction.createdAt)}
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

export default Transactions;
