import cors from 'cors';
import express from 'express';
import { getDatabaseStatus } from './config/database.js';
import authRouter from './routes/auth.routes.js';
import productRouter from './routes/product.routes.js';
import dashboardRouter from './routes/dashboard.routes.js';
import analyticsRouter from './routes/analytics.routes.js';
import inventoryRouter from './routes/inventory.routes.js';
import reviewRouter from './routes/review.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', database: getDatabaseStatus() });
});

app.use('/api/auth', authRouter);
app.use('/api/products', productRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/reviews', reviewRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
