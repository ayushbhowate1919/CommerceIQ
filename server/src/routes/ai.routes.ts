import { Router } from 'express';
import {
  analyzeProductReviewsHandler,
  analyzeSingleReviewHandler,
  generateDescriptionHandler,
  healthTestHandler,
} from '../controllers/ai.controller.js';
import { requireAuthentication } from '../middleware/auth.middleware.js';

const aiRouter = Router();

aiRouter.use(requireAuthentication);

aiRouter.post('/health-test', healthTestHandler);
aiRouter.post('/generate-description', generateDescriptionHandler);
aiRouter.post('/analyze-review/:reviewId', analyzeSingleReviewHandler);
aiRouter.post('/analyze-product-reviews/:productId', analyzeProductReviewsHandler);

export default aiRouter;
