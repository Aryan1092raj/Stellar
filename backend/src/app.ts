import express from 'express';
import cors from 'cors';
import helmet from "helmet";
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import routes from './routes';
import { config } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { initializeDatabase } from './config/database';
import { logger } from './utils/logger';
import { prisma } from './db';

const ALLOWED = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);

const app = express();              // CREATE APP FIRST
app.use(cookieParser());            // THEN USE PLUGINS

app.use(helmet());

// CORS configuration
app.use(cors({
  origin: (origin, cb) => (!origin || ALLOWED.includes(origin)) ? cb(null, true) : cb(new Error('CORS blocked')),
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: Number(config.RATE_LIMIT_WINDOW_MS),
  max: Number(config.RATE_LIMIT_MAX_REQUESTS),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'ok', ts: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'unreachable' });
  }
});

app.get('/', (_req, res) => {
  res.json({
    name: 'GeoLedger API',
    status: 'running',
    health: '/health',
    api: ['/api/ngos', '/api/projects', '/api/donations'],
  });
});

// API routes
app.use("/api", routes);


// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Initialize dependencies (database etc.)
initializeDatabase().catch((err) => {
  logger.error({ err }, 'Failed to initialize database');
});

export default app;
