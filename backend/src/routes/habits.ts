import { Router } from 'express';
import {
  createHabit,
  getHabits,
  getHabitById,
  updateHabit,
  deleteHabit
} from '../controllers/habits';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import {
  createHabitSchema,
  updateHabitSchema,
  getHabitsSchema,
  getHabitByIdSchema,
  deleteHabitSchema
} from '../utils/habitValidators';

const router = Router();

router.use(authenticate); // All habit routes require authentication

router.post('/', validateRequest({ body: createHabitSchema }), createHabit);
router.get('/', validateRequest({ query: getHabitsSchema }), getHabits);
router.get('/:habitId', validateRequest({ params: getHabitByIdSchema }), getHabitById);
router.put('/:habitId', validateRequest({ params: getHabitByIdSchema, body: updateHabitSchema }), updateHabit);
router.delete('/:habitId', validateRequest({ params: deleteHabitSchema }), deleteHabit);

export default router;