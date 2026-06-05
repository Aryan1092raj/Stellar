'use client';
import { useEffect, useState } from 'react';
import {
  connectFreighter as connectFreighterWallet,
  getWalletBalance,
  loadWalletInfo,
  saveWalletInfo,
} from '../lib/stellar/wallet';

export default function WalletConnectSection() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [network, setNetwork] = useState<string>(process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet');
  const [balance, setBalance] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshBalance(pk: string) {
    try {
      setBalance(await getWalletBalance(pk));
    } catch (e: unknown) {
      setError('balance-error');
      console.error(e);
    }
  }

  async function connectFreighter() {
    setError(null);
    setLoading(true);
    try {
      const info = await connectFreighterWallet();
      setPublicKey(info.publicKey);
      setNetwork(info.network);
      saveWalletInfo(info);
      await refreshBalance(info.publicKey);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'connect-failed');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const saved = loadWalletInfo();
    if (saved?.type === 'freighter') {
      setPublicKey(saved.publicKey);
      setNetwork(saved.network);
      refreshBalance(saved.publicKey);
    }
  }, []);

  return (
    <div>
      <h3>Wallet</h3>
  {!publicKey && <button onClick={connectFreighter} disabled={loading}>{loading ? 'Connecting...' : 'Connect Freighter'}</button>}
      {publicKey && (
        <div style={{ fontSize: 12 }}>
          <div>Key: {publicKey.slice(0, 10)}...</div>
          <div>Network: {network}</div>
          <div>Balance: {balance || '—'}</div>
          <button onClick={() => setPublicKey(null)}>Disconnect</button>
        </div>
      )}
  {error && <div style={{ color: 'red', fontSize: 12 }}>{error}</div>}
    </div>
  );
}
