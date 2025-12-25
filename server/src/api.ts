
import { Router } from 'express';
import { securityHeaders } from './middleware';
import authRouter from './routes/auth';
import gameRouter from './routes/game';

const router = Router();

// Apply global security headers to all API responses
router.use(securityHeaders as any);

// Mount Sub-Routers
router.use(authRouter);
router.use(gameRouter);

export default router;
