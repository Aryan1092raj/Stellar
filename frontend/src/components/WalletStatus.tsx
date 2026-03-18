"use client";
import { useEffect, useState } from 'react';
import { 
  connectWallet, 
  disconnectWallet, 
  hasFreighter,
  hasXBull,
  hasAlbedo,
  loadWalletInfo, 
  saveWalletInfo,
  getWalletBalance,
  WalletType,
  WalletInfo,
  STELLAR_NETWORK 
} from '../lib/stellar/wallet';
import Modal from './Modal';

export default function WalletStatus() {
  const [connected, setConnected] = useState(false);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [availableWallets, setAvailableWallets] = useState<WalletType[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string>('');

  // Load saved wallet on mount
  useEffect(() => {
    const saved = loadWalletInfo();
    if (saved) {
      setWalletInfo(saved);
      setConnected(true);
      loadBalance(saved.publicKey);
    }

    (async () => {
      const freighterAvailable = await hasFreighter();
      const wallets: WalletType[] = [];
      if (freighterAvailable) wallets.push('freighter');
      if (hasXBull()) wallets.push('xbull');
      if (hasAlbedo()) wallets.push('albedo');
      setAvailableWallets(wallets);
    })();
  }, []);

  // Refresh balance periodically
  useEffect(() => {
    if (connected && walletInfo) {
      const interval = setInterval(() => {
        loadBalance(walletInfo.publicKey);
      }, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [connected, walletInfo]);

  async function loadBalance(publicKey: string) {
    try {
      const bal = await getWalletBalance(publicKey);
      setBalance(bal);
    } catch (err) {
      console.error('Failed to load balance:', err);
    }
  }

  async function handleConnect(type: WalletType) {
    setConnecting(true);
    setError('');
    
    try {
      const info = await connectWallet(type);
      setWalletInfo(info);
      setConnected(true);
      saveWalletInfo(info);
      setShowWalletModal(false);
      await loadBalance(info.publicKey);
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      console.error('Wallet connection error:', err);
    } finally {
      setConnecting(false);
    }
  }

  function handleDisconnect() {
    disconnectWallet();
    setWalletInfo(null);
    setConnected(false);
    setBalance('0');
  }

  function openWalletSelector() {
    setError('');
    setShowWalletModal(true);
  }

  const getWalletIcon = (type: WalletType) => {
    switch (type) {
      case 'freighter': return '🚀';
      case 'xbull': return '🐂';
      case 'albedo': return '⭐';
      case 'lobstr': return '🦞';
      default: return '👛';
    }
  };

  const getWalletName = (type: WalletType) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <>
      <div className="wallet-section">
        {!connected ? (
          <div className="wallet-disconnected">
            <div className="wallet-status-header">
              <div className="wallet-icon">👛</div>
              <div className="wallet-text">
                <div className="wallet-label">Wallet Status</div>
                <div className="wallet-value">Not Connected</div>
              </div>
            </div>
            <button className="connect-wallet-btn" onClick={openWalletSelector}>
              <span className="btn-icon">🔗</span>
              <span>Connect Wallet</span>
            </button>
            {availableWallets.length === 0 && (
              <div className="wallet-hint">
                ℹ️ Install <a href="https://www.freighter.app/" target="_blank" rel="noopener noreferrer">Freighter</a> to connect
              </div>
            )}
          </div>
        ) : (
          <div className="wallet-connected">
            <div className="wallet-info-card">
              <div className="wallet-header-row">
                <div className="wallet-type-badge">
                  <span className="wallet-type-icon">{getWalletIcon(walletInfo!.type)}</span>
                  <span className="wallet-type-name">{getWalletName(walletInfo!.type)}</span>
                </div>
                <div className="network-badge">{STELLAR_NETWORK}</div>
              </div>
              
              <div className="wallet-address-row">
                <div className="address-label">Address</div>
                <div className="address-value" title={walletInfo!.publicKey}>
                  {walletInfo!.publicKey.slice(0, 6)}...{walletInfo!.publicKey.slice(-6)}
                </div>
                <button 
                  className="copy-address-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(walletInfo!.publicKey);
                  }}
                  title="Copy address"
                >
                  📋
                </button>
              </div>

              <div className="wallet-balance-row">
                <div className="balance-label">Balance</div>
                <div className="balance-value">
                  <span className="balance-amount">{parseFloat(balance).toFixed(2)}</span>
                  <span className="balance-currency">XLM</span>
                </div>
              </div>

              <button className="disconnect-wallet-btn" onClick={handleDisconnect}>
                <span className="btn-icon">🔌</span>
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Wallet Selector Modal */}
      <Modal 
        open={showWalletModal} 
        onClose={() => setShowWalletModal(false)} 
        title="Connect Wallet"
      >
        <div className="wallet-selector">
          <p className="wallet-selector-intro">
            Choose a wallet to connect to GeoLedger. Make sure you have one installed.
          </p>

          {error && (
            <div className="wallet-error-message">
              <span className="error-icon">❌</span>
              <span>{error}</span>
            </div>
          )}

          <div className="wallet-options">
            {/* Freighter */}
            <button
              className="wallet-option"
              onClick={() => handleConnect('freighter')}
              disabled={connecting}
            >
              <div className="wallet-option-icon">🚀</div>
              <div className="wallet-option-content">
                <div className="wallet-option-name">Freighter</div>
                <div className="wallet-option-desc">
                  {availableWallets.includes('freighter') 
                    ? 'Most popular Stellar wallet' 
                    : 'Click to connect'}
                </div>
              </div>
              {availableWallets.includes('freighter') && (
                <div className="wallet-option-arrow">→</div>
              )}
            </button>

            {/* xBull */}
            <button
              className="wallet-option"
              onClick={() => handleConnect('xbull')}
              disabled={connecting || !availableWallets.includes('xbull')}
            >
              <div className="wallet-option-icon">🐂</div>
              <div className="wallet-option-content">
                <div className="wallet-option-name">xBull</div>
                <div className="wallet-option-desc">
                  {availableWallets.includes('xbull') 
                    ? 'Advanced Stellar wallet' 
                    : 'Not installed'}
                </div>
              </div>
              {availableWallets.includes('xbull') && (
                <div className="wallet-option-arrow">→</div>
              )}
            </button>

            {/* Albedo */}
            <button
              className="wallet-option"
              onClick={() => handleConnect('albedo')}
              disabled={connecting || !availableWallets.includes('albedo')}
            >
              <div className="wallet-option-icon">⭐</div>
              <div className="wallet-option-content">
                <div className="wallet-option-name">Albedo</div>
                <div className="wallet-option-desc">
                  {availableWallets.includes('albedo') 
                    ? 'Web-based key management' 
                    : 'Not available'}
                </div>
              </div>
              {availableWallets.includes('albedo') && (
                <div className="wallet-option-arrow">→</div>
              )}
            </button>
          </div>

          {connecting && (
            <div className="wallet-connecting">
              <div className="spinner">⏳</div>
              <p>Connecting to wallet...</p>
            </div>
          )}

          <div className="wallet-selector-footer">
            <p>New to Stellar? <a href="https://www.freighter.app/" target="_blank" rel="noopener noreferrer">Install Freighter</a></p>
          </div>
        </div>
      </Modal>
    </>
  );
}
