import { z } from 'zod';
import { GoalType } from '../models/Habit';

export const createHabitSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  goalType: z.enum(['daily', 'weekly', 'monthly'] as const),
  targetCount: z.number().min(1, 'Target must be at least 1').max(1000, 'Target too high'),
  startDate: z.string().datetime().optional()
});

export const updateHabitSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  goalType: z.enum(['daily', 'weekly', 'monthly'] as const).optional(),
  targetCount: z.number().min(1, 'Target must be at least 1').max(1000, 'Target too high').optional(),
  active: z.boolean().optional()
});

export const getHabitsSchema = z.object({
  page: z.string().transform(Number).refine(n => n > 0, 'Page must be positive').optional(),
  limit: z.string().transform(Number).refine(n => n > 0 && n <= 100, 'Limit must be between 1-100').optional(),
  goalType: z.enum(['daily', 'weekly', 'monthly'] as const).optional(),
  active: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

export const getHabitByIdSchema = z.object({
  habitId: z.string().min(1, 'Habit ID is required')
});

export const deleteHabitSchema = z.object({
  habitId: z.string().min(1, 'Habit ID is required')
});