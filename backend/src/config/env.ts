import dotenv from "dotenv";

dotenv.config();

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '4000',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: (() => {
    const s = process.env.JWT_SECRET;
    if ((!s || s === 'dev') && process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    return s || 'dev-only';
  })(),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  STELLAR_NETWORK: process.env.STELLAR_NETWORK || process.env.NETWORK || 'testnet',
  STELLAR_HORIZON_URL: process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
  SOROBAN_RPC_URL: process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
  DONATION_REGISTRY_CONTRACT_ID: process.env.DONATION_REGISTRY_CONTRACT_ID,
  NGO_VERIFICATION_CONTRACT_ID: process.env.NGO_VERIFICATION_CONTRACT_ID,
  IMPACT_ESCROW_CONTRACT_ID: process.env.IMPACT_ESCROW_CONTRACT_ID,
  TOKEN_MANAGER_CONTRACT_ID: process.env.TOKEN_MANAGER_CONTRACT_ID,
  NFT_MINTING_CONTRACT_ID: process.env.NFT_MINTING_CONTRACT_ID,
  NATIVE_TOKEN_CONTRACT_ID: process.env.NATIVE_TOKEN_CONTRACT_ID,
  EVIDENCE_CONTRACT_ID: process.env.EVIDENCE_CONTRACT_ID,
  PINATA_API_KEY: process.env.PINATA_API_KEY || process.env.IPFS_PINATA_API_KEY,
  PINATA_SECRET_KEY: process.env.PINATA_SECRET_KEY || process.env.IPFS_PINATA_SECRET,
  IPFS_PINATA_API_KEY: process.env.IPFS_PINATA_API_KEY || process.env.PINATA_API_KEY,
  IPFS_PINATA_SECRET: process.env.IPFS_PINATA_SECRET || process.env.PINATA_SECRET_KEY,
  WEB3_STORAGE_TOKEN: process.env.WEB3_STORAGE_TOKEN,
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS || '60000',
  RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS || '100',
};
