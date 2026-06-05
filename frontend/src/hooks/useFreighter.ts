'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getAddress,
  signTransaction,
} from '@stellar/freighter-api';
import {
  freighterErrorMessage,
  isFreighterAvailable,
  requestFreighterAddress,
} from '../lib/freighter';
import { getNetworkPassphrase } from '../lib/stellar';

const WALLET_PUBLIC_KEY_STORAGE_KEY = 'wallet_public_key';

export function useFreighter() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function restoreConnection() {
      if (typeof window === 'undefined') return;

      const storedPublicKey = localStorage.getItem(WALLET_PUBLIC_KEY_STORAGE_KEY);
      if (storedPublicKey && !cancelled) {
        setPublicKey(storedPublicKey);
      }

      const available = await isFreighterAvailable({ retries: 8, retryDelayMs: 250 });
      if (cancelled) return;

      if (!available) {
        setConnected(false);
        return;
      }

      setConnected(true);

      const address = await getAddress();
      if (!cancelled && !address.error && address.address) {
        setPublicKey(address.address);
        localStorage.setItem(WALLET_PUBLIC_KEY_STORAGE_KEY, address.address);
      }
    }

    restoreConnection().catch(() => {
      if (!cancelled) setConnected(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async () => {
    const address = await requestFreighterAddress();

    setConnected(true);
    setPublicKey(address);
    localStorage.setItem(WALLET_PUBLIC_KEY_STORAGE_KEY, address);

    return address;
  }, []);

  const sign = useCallback(
    async (xdr: string) => {
      const signerAddress =
        publicKey ||
        (typeof window !== 'undefined'
          ? localStorage.getItem(WALLET_PUBLIC_KEY_STORAGE_KEY)
          : null);

      if (!signerAddress) {
        throw new Error('Connect Freighter before signing');
      }

      const signed = await signTransaction(xdr, {
        networkPassphrase: getNetworkPassphrase(),
        address: signerAddress,
      });

      if (signed.error || !signed.signedTxXdr) {
        throw new Error(freighterErrorMessage(signed.error));
      }

      return signed.signedTxXdr;
    },
    [publicKey]
  );

  return {
    connect,
    publicKey,
    connected,
    sign,
  };
}
