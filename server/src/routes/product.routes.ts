import { Router } from 'express';
import {
  createProductHandler,
  deleteProductHandler,
  getProductByIdHandler,
  getProductsHandler,
  updateProductHandler,
} from '../controllers/product.controller.js';
import { requireAuthentication } from '../middleware/auth.middleware.js';

const productRouter = Router();

productRouter.use(requireAuthentication);

productRouter.post('/', createProductHandler);
productRouter.get('/', getProductsHandler);
productRouter.get('/:id', getProductByIdHandler);
productRouter.patch('/:id', updateProductHandler);
productRouter.delete('/:id', deleteProductHandler);

export default productRouter;
