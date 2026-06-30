import { Router } from 'express';
import {
  createHabit,
  getHabits,
  getGoals,
  getGoalTree,
  autoBreakdown,
  getHabitById,
  updateHabit,
  deleteHabit,
} from '../controllers/habits';
import { autoAuth } from '../middleware/autoAuth';
import { validateRequest } from '../middleware/validation';
import {
  createHabitSchema,
  updateHabitSchema,
  getHabitsSchema,
  getHabitByIdSchema,
  deleteHabitSchema,
  autoBreakdownSchema,
} from '../utils/habitValidators';

const router = Router();

router.use(autoAuth);

// Flat list (standalone habits + optionally filtered by level)
router.post('/', validateRequest({ body: createHabitSchema }), createHabit);
router.get('/', validateRequest({ query: getHabitsSchema }), getHabits);

// Goal hierarchy routes
router.get('/goals', getGoals);
router.get('/:habitId/tree', validateRequest({ params: getHabitByIdSchema }), getGoalTree);
router.post(
  '/:habitId/breakdown',
  validateRequest({ params: getHabitByIdSchema, body: autoBreakdownSchema }),
  autoBreakdown
);

// Standard CRUD
router.get('/:habitId', validateRequest({ params: getHabitByIdSchema }), getHabitById);
router.put('/:habitId', validateRequest({ params: getHabitByIdSchema, body: updateHabitSchema }), updateHabit);
router.delete('/:habitId', validateRequest({ params: deleteHabitSchema }), deleteHabit);

export default router;