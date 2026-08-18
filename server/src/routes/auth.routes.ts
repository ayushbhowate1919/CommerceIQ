import { Router } from 'express';
import { getCurrentUser, loginUser, logoutUser, registerUser } from '../controllers/auth.controller.js';
import { requireAuthentication } from '../middleware/auth.middleware.js';

const authRouter = Router();

authRouter.post('/register', registerUser);
authRouter.post('/login', loginUser);
authRouter.post('/logout', requireAuthentication, logoutUser);
authRouter.get('/me', requireAuthentication, getCurrentUser);

export default authRouter;
