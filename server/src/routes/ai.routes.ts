import { Router } from 'express';
import { generateDescriptionHandler, healthTestHandler } from '../controllers/ai.controller.js';
import { requireAuthentication } from '../middleware/auth.middleware.js';

const aiRouter = Router();

aiRouter.use(requireAuthentication);

aiRouter.post('/health-test', healthTestHandler);
aiRouter.post('/generate-description', generateDescriptionHandler);

export default aiRouter;
