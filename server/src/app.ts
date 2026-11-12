import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { getDatabaseStatus } from './config/database.js';
import authRouter from './routes/auth.routes.js';
import productRouter from './routes/product.routes.js';
import dashboardRouter from './routes/dashboard.routes.js';
import analyticsRouter from './routes/analytics.routes.js';
import inventoryRouter from './routes/inventory.routes.js';
import reviewRouter from './routes/review.routes.js';
import aiRouter from './routes/ai.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { aiRateLimiter, generalRateLimiter } from './middleware/rate-limiter.middleware.js';

export function getAllowedOrigins(configuredOrigins = process.env.CLIENT_URL): string[] {
  const configured = configuredOrigins && configuredOrigins.trim() ? configuredOrigins : 'http://localhost:5173';
  const origins = configured
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter((origin) => origin.length > 0);

  const originSet = new Set<string>();
  for (const origin of origins) {
    originSet.add(origin);
    originSet.add(`${origin}/`);
  }
  return Array.from(originSet);
}

export const corsOptions: cors.CorsOptions = {
  origin: (_requestOrigin, callback) => {
    callback(null, getAllowedOrigins());
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
};

const app = express();

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(generalRateLimiter);

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', database: getDatabaseStatus() });
});

app.use('/api/auth', authRouter);
app.use('/api/products', productRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/ai', aiRateLimiter, aiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
