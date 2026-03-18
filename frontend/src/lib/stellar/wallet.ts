import { StellarWalletsKit, WalletNetwork, FreighterModule } from '@creit.tech/stellar-wallets-kit';
import {
  isConnected,
  requestAccess,
  getAddress,
  getNetwork,
} from '@stellar/freighter-api';

export type WalletType = 'freighter' | 'albedo' | 'xbull' | 'lobstr';

export interface WalletInfo {
  publicKey: string;
  type: WalletType;
  network: string;
}

// Network configuration
export const STELLAR_NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'TESTNET';
export const NETWORK_PASSPHRASE = STELLAR_NETWORK === 'TESTNET' 
  ? 'Test SDF Network ; September 2015'
  : 'Public Global Stellar Network ; September 2015';

// Wallet detection
export async function hasFreighter(): Promise<boolean> {
  try {
    const result = await isConnected();
    return result.isConnected;
  } catch {
    return false;
  }
}

export function hasXBull() {
  return typeof window !== 'undefined' && !!window.xBullSDK;
}

export function hasAlbedo() {
  return typeof window !== 'undefined' && !!window.albedo;
}

export async function detectWallets() {
  const wallets: WalletType[] = [];
  if (await hasFreighter()) wallets.push('freighter');
  if (hasXBull()) wallets.push('xbull');
  if (hasAlbedo()) wallets.push('albedo');
  return wallets;
}

// Freighter connection
export async function connectFreighter(): Promise<WalletInfo> {
  try {
    const connected = await isConnected();
    if (!connected.isConnected) {
      throw new Error('Freighter wallet not installed. Please install from https://www.freighter.app/');
    }

    const accessResult = await requestAccess();
    if (accessResult.error) {
      throw new Error('User declined access');
    }

    const keyResult = await getAddress();
    if (!keyResult.address) {
      throw new Error('Failed to get public key');
    }

    const networkResult = await getNetwork();
    
    return {
      publicKey: keyResult.address,
      type: 'freighter',
      network: networkResult.network || STELLAR_NETWORK,
    };
  } catch (error: any) {
    throw new Error(`Failed to connect Freighter: ${error.message}`);
  }
}

// XBull connection
export async function connectXBull(): Promise<WalletInfo> {
  if (!hasXBull()) {
    throw new Error('xBull wallet not installed. Please install from https://xbull.app/');
  }
  
  try {
    const xBullSDK = window.xBullSDK;
    await xBullSDK.connect();
    const publicKey = await xBullSDK.getPublicKey();
    
    return {
      publicKey,
      type: 'xbull',
      network: STELLAR_NETWORK,
    };
  } catch (error: any) {
    throw new Error(`Failed to connect xBull: ${error.message || 'Unknown error'}`);
  }
}

// Albedo connection
export async function connectAlbedo(): Promise<WalletInfo> {
  if (!hasAlbedo()) {
    throw new Error('Albedo not available. Please enable Albedo support.');
  }
  
  try {
    const albedo = window.albedo;
    const result = await albedo.publicKey({});
    
    return {
      publicKey: result.pubkey,
      type: 'albedo',
      network: STELLAR_NETWORK,
    };
  } catch (error: any) {
    throw new Error(`Failed to connect Albedo: ${error.message || 'Unknown error'}`);
  }
}

// Generic connect function
export async function connectWallet(type: WalletType): Promise<WalletInfo> {
  switch (type) {
    case 'freighter':
      return await connectFreighter();
    case 'xbull':
      return await connectXBull();
    case 'albedo':
      return await connectAlbedo();
    default:
      throw new Error(`Unsupported wallet type: ${type}`);
  }
}

// Check if wallet is connected
export async function isFreighterConnected() {
  if (!(await hasFreighter())) return false;
  try {
    return await window.freighterApi!.isConnected();
  } catch {
    return false;
  }
}

// Sign transaction XDR
export async function signXdr(xdr: string, type: WalletType = 'freighter'): Promise<string> {
  try {
    switch (type) {
      case 'freighter':
        if (!(await hasFreighter())) throw new Error('Freighter not found');
        const freighterResult = await window.freighterApi!.signTransaction(xdr, {
          networkPassphrase: NETWORK_PASSPHRASE,
        });
        return freighterResult;
      
      case 'xbull':
        if (!hasXBull()) throw new Error('xBull not found');
        const xBullResult = await window.xBullSDK.signTransaction(xdr, {
          networkPassphrase: NETWORK_PASSPHRASE,
        });
        return xBullResult;
      
      case 'albedo':
        if (!hasAlbedo()) throw new Error('Albedo not found');
        const albedoResult = await window.albedo.tx({
          xdr,
          network: STELLAR_NETWORK.toLowerCase(),
        });
        return albedoResult.signed_envelope_xdr;
      
      default:
        throw new Error(`Unsupported wallet type: ${type}`);
    }
  } catch (error: any) {
    if (error.message?.includes('User declined') || error.message?.includes('rejected')) {
      throw new Error('Transaction signing rejected by user');
    }
    throw new Error(`Failed to sign transaction: ${error.message || 'Unknown error'}`);
  }
}

// Get wallet balance
export async function getWalletBalance(publicKey: string): Promise<string> {
  try {
    const horizonUrl = STELLAR_NETWORK === 'TESTNET'
      ? 'https://horizon-testnet.stellar.org'
      : 'https://horizon.stellar.org';
    
    const response = await fetch(`${horizonUrl}/accounts/${publicKey}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return '0';
      }
      throw new Error('Failed to fetch account balance');
    }
    
    const data = await response.json();
    const xlmBalance = data.balances.find((b: any) => b.asset_type === 'native');
    
    return xlmBalance ? xlmBalance.balance : '0';
  } catch (error: any) {
    console.error('Error fetching balance:', error);
    return '0';
  }
}

// Disconnect wallet
export function disconnectWallet() {
  // Clear stored wallet info from localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('wallet_public_key');
    localStorage.removeItem('wallet_type');
    localStorage.removeItem('wallet_network');
  }
}

// Save wallet info to localStorage
export function saveWalletInfo(info: WalletInfo) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('wallet_public_key', info.publicKey);
    localStorage.setItem('wallet_type', info.type);
    localStorage.setItem('wallet_network', info.network);
  }
}

// Load wallet info from localStorage
export function loadWalletInfo(): WalletInfo | null {
  if (typeof window === 'undefined') return null;
  
  const publicKey = localStorage.getItem('wallet_public_key');
  const type = localStorage.getItem('wallet_type') as WalletType;
  const network = localStorage.getItem('wallet_network');
  
  if (publicKey && type && network) {
    return { publicKey, type, network };
  }
  
  return null;
}
