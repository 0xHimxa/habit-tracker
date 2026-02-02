import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getAnalytics } from '../controllers/analytics';

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

// GET /api/analytics - Get analytics data
router.get('/', getAnalytics);

export default router;
