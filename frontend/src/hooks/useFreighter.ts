'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getAddress,
  isConnected as checkFreighterConnection,
  requestAccess,
  signTransaction,
} from '@stellar/freighter-api';
import { getNetworkPassphrase } from '../lib/stellar';

const WALLET_PUBLIC_KEY_STORAGE_KEY = 'wallet_public_key';

function freighterErrorMessage(error: unknown) {
  if (!error) return 'Freighter request failed';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message);
  }
  return 'Freighter request failed';
}

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

      const connection = await checkFreighterConnection();
      if (cancelled) return;

      if (connection.error || !connection.isConnected) {
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
    const connection = await checkFreighterConnection();
    if (connection.error || !connection.isConnected) {
      throw new Error('Freighter wallet is not available');
    }

    const access = await requestAccess();
    if (access.error || !access.address) {
      throw new Error(freighterErrorMessage(access.error));
    }

    setConnected(true);
    setPublicKey(access.address);
    localStorage.setItem(WALLET_PUBLIC_KEY_STORAGE_KEY, access.address);

    return access.address;
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
