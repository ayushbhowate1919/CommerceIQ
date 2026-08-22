import { Router } from 'express';
import {
  listReviewsHandler,
  getReviewSummaryHandler,
  getProductReviewsHandler,
} from '../controllers/review.controller.js';
import { requireAuthentication } from '../middleware/auth.middleware.js';

const reviewRouter = Router();

reviewRouter.use(requireAuthentication);

reviewRouter.get('/', listReviewsHandler);
reviewRouter.get('/summary', getReviewSummaryHandler);
reviewRouter.get('/product/:productId', getProductReviewsHandler);

export default reviewRouter;
