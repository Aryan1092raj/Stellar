'use client';
import React from 'react';

interface Props {
  open: boolean;
  status: 'idle' | 'signing' | 'submitted' | 'confirmed' | 'error';
  hash?: string;
  error?: string;
  receipt?: {
    donationId: number;
    amount: number;
    ngoName: string;
    timestamp: string;
  };
  onClose: () => void;
}

export default function TransactionModal({ open, status, hash, error, receipt, onClose }: Props) {
  if (!open) return null;
  const explorerBase =
    process.env.NEXT_PUBLIC_STELLAR_EXPERT_BASE ||
    'https://stellar.expert/explorer/testnet';
  const explorerUrl = hash ? `${explorerBase}/tx/${hash}` : undefined;
  const showImpactNft = status === 'confirmed' && hash && receipt;

  return (
    <div className="transaction-modal-overlay">
      <div className="transaction-modal-card">
        <div className="transaction-modal-header">
          <h3>Transaction</h3>
          <span className={`transaction-state transaction-state-${status}`}>{status}</span>
        </div>
        {hash && (
          <div className="transaction-hash-block">
            <div>Hash</div>
            <code>{hash}</code>
            {explorerUrl && (
              <a href={explorerUrl} target="_blank" rel="noreferrer">
                View on Stellar Expert
              </a>
            )}
          </div>
        )}
        {showImpactNft && (
          <section className="impact-nft-card">
            <div className="impact-nft-kicker">Your Impact NFT</div>
            <div className="impact-nft-title">{receipt.ngoName}</div>
            <div className="impact-nft-grid">
              <span>Donation ID</span>
              <strong>#{receipt.donationId}</strong>
              <span>Amount</span>
              <strong>{receipt.amount.toFixed(2)} XLM</strong>
              <span>Timestamp</span>
              <strong>{new Date(receipt.timestamp).toLocaleString()}</strong>
              <span>Stellar hash</span>
              <strong>{hash.slice(0, 10)}...{hash.slice(-10)}</strong>
            </div>
            <p>This NFT on Stellar blockchain permanently records your contribution.</p>
            {explorerUrl && (
              <a href={explorerUrl} target="_blank" rel="noreferrer">
                Open blockchain record
              </a>
            )}
          </section>
        )}
        {error && <div className="transaction-error">{error}</div>}
        <button className="transaction-close-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
