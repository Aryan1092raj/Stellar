type StellarSignOptions = {
  networkPassphrase?: string;
  network?: string;
  accountToSign?: string;
};

// Stellar wallet type declarations
interface FreighterApi {
  isConnected: () => Promise<boolean>;
  getUserInfo: () => Promise<{ publicKey: string }>;
  requestAccess: () => Promise<void>;
  signTransaction: (xdr: string, opts: StellarSignOptions) => Promise<string>;
  getNetwork: () => Promise<string>;
}

interface XBullSDK {
  connect: () => Promise<void>;
  getPublicKey: () => Promise<string>;
  signTransaction: (xdr: string, opts: StellarSignOptions) => Promise<string>;
}

interface AlbedoAPI {
  publicKey: (opts: { require_existing?: boolean }) => Promise<{ pubkey: string }>;
  tx: (opts: { xdr: string; network: string }) => Promise<{ signed_envelope_xdr: string }>;
}

interface Window {
  freighterApi?: FreighterApi;
  xBullSDK?: XBullSDK;
  albedo?: AlbedoAPI;
}
