import { Router } from 'express';
import { z } from 'zod';
import {
  createCompletion,
  getCompletions,
  deleteCompletion,
  getCompletionsByDateRange,
  getCalendarData
} from '../controllers/completions';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import {
  createCompletionSchema,
  getCompletionsSchema,
  deleteCompletionSchema,
  getCompletionsByDateRangeSchema
} from '../utils/completionValidators';
import { z } from 'zod';

const router = Router();

router.use(authenticate); // All completion routes require authentication

router.post('/', validateRequest({ body: createCompletionSchema }), createCompletion);
router.get('/calendar', getCalendarData);
router.get('/range', validateRequest({ query: getCompletionsByDateRangeSchema }), getCompletionsByDateRange);
const habitIdParamSchema = z.object({ habitId: z.string().min(1) });
router.get('/:habitId', validateRequest({ params: habitIdParamSchema, query: getCompletionsSchema }), getCompletions);
router.delete('/:completionId', validateRequest({ params: deleteCompletionSchema }), deleteCompletion);

export default router;