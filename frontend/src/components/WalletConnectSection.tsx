'use client';
import { useEffect, useState } from 'react';

type HorizonBalance = {
  asset_type: string;
  balance: string;
};

type HorizonAccountResponse = {
  balances?: HorizonBalance[];
};

export default function WalletConnectSection() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [network, setNetwork] = useState<string>(process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet');
  const [balance, setBalance] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const horizonUrl = process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';

  async function refreshBalance(pk: string) {
    try {
      const res = await fetch(`${horizonUrl}/accounts/${pk}`);
      if (!res.ok) throw new Error('horizon-failed');
      const data = await res.json() as HorizonAccountResponse;
      const native = (data.balances || []).find((b) => b.asset_type === 'native');
      if (native) setBalance(native.balance);
    } catch (e: unknown) {
      setError('balance-error');
      console.error(e);
    }
  }

  async function connectFreighter() {
    setError(null);
    setLoading(true);
    try {
      if (!window.freighterApi) {
        setError('Freighter not found');
        return;
      }
      await window.freighterApi.requestAccess();
      const info = await window.freighterApi.getUserInfo();
      setPublicKey(info.publicKey);
      await refreshBalance(info.publicKey);
    } catch (e: unknown) {
      setError('connect-failed');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        if (window.freighterApi && await window.freighterApi.isConnected()) {
          const info = await window.freighterApi.getUserInfo();
          setPublicKey(info.publicKey);
          refreshBalance(info.publicKey);
        }
      } catch (_) {}
    })();
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
