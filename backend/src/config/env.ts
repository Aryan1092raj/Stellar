import dotenv from "dotenv";
import path from "path";
import { z } from 'zod';

dotenv.config({
  path: path.resolve(process.cwd(), "backend", ".env"),
});

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  
  // Database
  DATABASE_URL: z.string().optional(),
  
  // JWT
  JWT_SECRET: z.string().default('change-me-in-production'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  // AI
  GEMINI_API_KEY: z.string().optional(),
  
  // Stellar Network
  STELLAR_NETWORK: z.enum(['testnet', 'mainnet', 'futurenet']).default('testnet'),
  STELLAR_HORIZON_URL: z.string().default('https://horizon-testnet.stellar.org'),
  SOROBAN_RPC_URL: z.string().default('https://soroban-testnet.stellar.org'),
  
  // IPFS / Pinata
  IPFS_PINATA_API_KEY: z.string().optional(),
  IPFS_PINATA_SECRET: z.string().optional(),
  WEB3_STORAGE_TOKEN: z.string().optional(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
});

const parseEnv = () => {
  try {
    return envSchema.parse({
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      FRONTEND_URL: process.env.FRONTEND_URL,
      DATABASE_URL: process.env.DATABASE_URL,
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      STELLAR_NETWORK: process.env.STELLAR_NETWORK,
      STELLAR_HORIZON_URL: process.env.STELLAR_HORIZON_URL,
      SOROBAN_RPC_URL: process.env.SOROBAN_RPC_URL,
      IPFS_PINATA_API_KEY: process.env.IPFS_PINATA_API_KEY,
      IPFS_PINATA_SECRET: process.env.IPFS_PINATA_SECRET,
      WEB3_STORAGE_TOKEN: process.env.WEB3_STORAGE_TOKEN,
      RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
      RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
    });
  } catch (error) {
    console.error('❌ Invalid environment variables:', error);
    process.exit(1);
  }
};

export const config = parseEnv();

export type Config = z.infer<typeof envSchema>;
