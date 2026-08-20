import { Router } from 'express';
import { getDashboardSummaryHandler } from '../controllers/analytics.controller.js';
import { requireAuthentication } from '../middleware/auth.middleware.js';

const dashboardRouter = Router();

dashboardRouter.use(requireAuthentication);

dashboardRouter.get('/summary', getDashboardSummaryHandler);

export default dashboardRouter;
