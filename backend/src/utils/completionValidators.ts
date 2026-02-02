import { z } from 'zod';

export const createCompletionSchema = z.object({
  habitId: z.string().min(1, 'Habit ID is required'),
  date: z.string().datetime().optional()
});

export const getCompletionsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.string().transform(Number).refine(n => n > 0, 'Page must be positive').optional(),
  limit: z.string().transform(Number).refine(n => n > 0 && n <= 100, 'Limit must be between 1-100').optional()
});

export const deleteCompletionSchema = z.object({
  completionId: z.string().min(1, 'Completion ID is required')
});

export const getCompletionsByDateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  habitIds: z.string().optional().transform(val => val ? val.split(',') : undefined)
});