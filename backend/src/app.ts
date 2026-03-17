import express from 'express';
import cors from 'cors';
import helmet from "helmet";
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import { config } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { initializeDatabase } from './config/database.js';
import { logger } from './utils/logger.js';

// console.log("FRONTEND_URL ACTUAL VALUE:", config.FRONTEND_URL);

const app = express();              // CREATE APP FIRST
app.use(cookieParser());            // THEN USE PLUGINS

app.use(helmet());

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (
      origin === "http://localhost:3000" ||
      origin.endsWith(".vercel.app")
    ) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));


console.log({
  corsType: typeof cors,
  helmetType: typeof helmet,
  cookieParserType: typeof cookieParser,
  rateLimitType: typeof rateLimit,
  routesType: typeof routes,
  notFoundHandlerType: typeof notFoundHandler,
  errorHandlerType: typeof errorHandler
});

// console.log("ROUTES IMPORT RAW VALUE:", routes);


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

console.log("ROUTES IMPORT:", routes);
console.log("ROUTES TYPE:", typeof routes);


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
