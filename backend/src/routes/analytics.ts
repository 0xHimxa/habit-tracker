import { Router } from 'express';
import { autoAuth } from '../middleware/autoAuth';
import { getAnalytics } from '../controllers/analytics';

const router = Router();

router.use(autoAuth);

// GET /api/analytics - Get analytics data
router.get('/', getAnalytics);

export default router;
