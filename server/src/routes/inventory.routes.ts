import { Router } from 'express';
import { getInventoryRisksHandler, getInventorySummaryHandler } from '../controllers/inventory.controller.js';
import { requireAuthentication } from '../middleware/auth.middleware.js';

const inventoryRouter = Router();

inventoryRouter.use(requireAuthentication);

inventoryRouter.get('/risks', getInventoryRisksHandler);
inventoryRouter.get('/summary', getInventorySummaryHandler);

export default inventoryRouter;
