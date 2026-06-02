"use client";
import { useState, useEffect } from 'react';
import { loadWalletInfo } from '../lib/stellar/wallet';

interface Transaction {
  id: string;
  type: 'donation' | 'receive' | 'send' | 'payment';
  amount: string;
  asset: string;
  timestamp: string;
  status: 'success' | 'pending' | 'failed';
  from?: string;
  to?: string;
  memo?: string;
  hash?: string;
  fee?: string;
}

interface HorizonPaymentRecord {
  id: string;
  created_at: string;
  type: string;
  from?: string;
  to?: string;
  amount?: string;
  starting_balance?: string;
  asset_type?: string;
  asset_code?: string;
  successful?: boolean;
  transaction_hash?: string;
  fee_charged?: string;
  memo?: string;
  funder?: string;
  account?: string;
}

interface HorizonPaymentsResponse {
  _embedded?: {
    records?: HorizonPaymentRecord[];
  };
}

interface DonationApiRecord {
  donor_public_key: string;
  created_at: string;
}

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'donation' | 'payment'>('all');

  useEffect(() => {
    loadTransactions();
  }, []);

  async function loadTransactions() {
    const walletInfo = loadWalletInfo();
    if (!walletInfo) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const horizonUrl = process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'TESTNET'
        ? 'https://horizon-testnet.stellar.org'
        : 'https://horizon.stellar.org';

      // Fetch payments from Horizon
      const response = await fetch(
        `${horizonUrl}/accounts/${walletInfo.publicKey}/payments?order=desc&limit=50`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json() as HorizonPaymentsResponse;
      
      // Also fetch our donation records
      const donationsRes = await fetch('/api/donations', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      const donations = donationsRes.ok ? await donationsRes.json() as DonationApiRecord[] : [];

      // Transform and combine data
      const stellarTxs: Transaction[] = (data._embedded?.records || [])
        .filter((record) =>
          record.type === 'payment' || 
          record.type === 'create_account' ||
          record.type === 'path_payment_strict_receive'
        )
        .map((record) => {
          const isReceive = record.to === walletInfo.publicKey;
          const isDonation = donations.some((d) =>
            d.donor_public_key === walletInfo.publicKey && 
            new Date(d.created_at).getTime() - new Date(record.created_at).getTime() < 60000
          );

          return {
            id: record.id,
            type: isDonation ? 'donation' : (isReceive ? 'receive' : 'send'),
            amount: record.amount || record.starting_balance || '0',
            asset: record.asset_type === 'native' ? 'XLM' : record.asset_code,
            timestamp: record.created_at,
            status: record.successful ? 'success' : 'failed',
            from: record.from || record.funder,
            to: record.to || record.account,
            hash: record.transaction_hash,
            fee: record.fee_charged,
            memo: record.memo,
          } as Transaction;
        });

      setTransactions(stellarTxs);
    } catch (err: unknown) {
      console.error('Error loading transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  }

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    if (filter === 'donation') return tx.type === 'donation';
    if (filter === 'payment') return tx.type === 'send' || tx.type === 'receive';
    return true;
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'donation': return '💝';
      case 'receive': return '📥';
      case 'send': return '📤';
      default: return '💸';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'var(--success)';
      case 'pending': return '#FFBB33';
      case 'failed': return '#dc2626';
      default: return 'var(--gray-500)';
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const walletInfo = loadWalletInfo();
  const myAddress = walletInfo?.publicKey || '';

  return (
    <div className="transaction-history">
      <div className="section-header">
        <div className="section-icon">📜</div>
        <div>
          <h3 className="section-title">Transaction History</h3>
          <p className="section-subtitle">Your recent blockchain transactions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="tx-filters">
        <button
          className={`tx-filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`tx-filter-btn ${filter === 'donation' ? 'active' : ''}`}
          onClick={() => setFilter('donation')}
        >
          💝 Donations
        </button>
        <button
          className={`tx-filter-btn ${filter === 'payment' ? 'active' : ''}`}
          onClick={() => setFilter('payment')}
        >
          💸 Payments
        </button>
        <button
          className="tx-refresh-btn"
          onClick={loadTransactions}
          disabled={loading}
        >
          {loading ? '⏳' : '🔄'}
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="tx-loading">
          <div className="spinner">⏳</div>
          <p>Loading transactions...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="tx-error">
          <span className="error-icon">❌</span>
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredTransactions.length === 0 && (
        <div className="tx-empty">
          <div className="empty-icon">📭</div>
          <p>No transactions yet</p>
          <small>Your transaction history will appear here</small>
        </div>
      )}

      {/* Transaction List */}
      {!loading && !error && filteredTransactions.length > 0 && (
        <div className="tx-list">
          {filteredTransactions.map((tx) => (
            <div key={tx.id} className="tx-item">
              <div className="tx-icon">{getTransactionIcon(tx.type)}</div>
              
              <div className="tx-content">
                <div className="tx-header">
                  <div className="tx-type">
                    {tx.type === 'donation' && 'Donation'}
                    {tx.type === 'receive' && 'Received'}
                    {tx.type === 'send' && 'Sent'}
                    {tx.type === 'payment' && 'Payment'}
                  </div>
                  <div className="tx-amount" style={{ 
                    color: tx.type === 'receive' ? 'var(--success)' : 'var(--gray-900)' 
                  }}>
                    {tx.type === 'receive' ? '+' : '-'}{parseFloat(tx.amount).toFixed(2)} {tx.asset}
                  </div>
                </div>

                <div className="tx-details">
                  <div className="tx-addresses">
                    {tx.from && tx.from !== myAddress && (
                      <div className="tx-address">
                        <span className="address-label">From:</span>
                        <span className="address-value">{tx.from.slice(0, 6)}...{tx.from.slice(-4)}</span>
                      </div>
                    )}
                    {tx.to && tx.to !== myAddress && (
                      <div className="tx-address">
                        <span className="address-label">To:</span>
                        <span className="address-value">{tx.to.slice(0, 6)}...{tx.to.slice(-4)}</span>
                      </div>
                    )}
                  </div>

                  <div className="tx-meta">
                    <span className="tx-time">{formatDate(tx.timestamp)}</span>
                    {tx.fee && (
                      <span className="tx-fee">Fee: {parseFloat(tx.fee).toFixed(4)} XLM</span>
                    )}
                    <span 
                      className="tx-status"
                      style={{ color: getStatusColor(tx.status) }}
                    >
                      {tx.status === 'success' && '✓'}
                      {tx.status === 'pending' && '⏳'}
                      {tx.status === 'failed' && '✗'}
                    </span>
                  </div>
                </div>

                {tx.hash && (
                  <div className="tx-actions">
                    <a
                      href={`${process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'TESTNET' 
                        ? 'https://stellar.expert/explorer/testnet' 
                        : 'https://stellar.expert/explorer/public'}/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tx-explorer-link"
                    >
                      View on Explorer →
                    </a>
                    <button
                      className="tx-copy-btn"
                      onClick={() => navigator.clipboard.writeText(tx.hash!)}
                      title="Copy transaction hash"
                    >
                      📋
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
