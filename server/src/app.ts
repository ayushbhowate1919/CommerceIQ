import cors from 'cors';
import express from 'express';
import { getDatabaseStatus } from './config/database.js';
import authRouter from './routes/auth.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', database: getDatabaseStatus() });
});

app.use('/api/auth', authRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
