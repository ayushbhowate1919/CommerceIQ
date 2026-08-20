import { Router } from 'express';
import {
  getCategoryRevenueHandler,
  getOrderSummaryHandler,
  getPeriodComparisonHandler,
  getProductPerformanceHandler,
  getRevenueTrendHandler,
  getTopProductsHandler,
} from '../controllers/analytics.controller.js';
import { requireAuthentication } from '../middleware/auth.middleware.js';

const analyticsRouter = Router();

analyticsRouter.use(requireAuthentication);

analyticsRouter.get('/revenue', getRevenueTrendHandler);
analyticsRouter.get('/categories', getCategoryRevenueHandler);
analyticsRouter.get('/top-products', getTopProductsHandler);
analyticsRouter.get('/order-summary', getOrderSummaryHandler);
analyticsRouter.get('/period-comparison', getPeriodComparisonHandler);
analyticsRouter.get('/product-performance', getProductPerformanceHandler);

export default analyticsRouter;
