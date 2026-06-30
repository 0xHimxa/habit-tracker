import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared sub-schemas
// ---------------------------------------------------------------------------

const goalPeriodSchema = z
  .object({
    year: z.number().int().min(2000).max(2100).optional(),
    month: z.number().int().min(1).max(12).optional(),
    weekOfMonth: z.number().int().min(1).max(5).optional(),
    daysOfWeek: z
      .array(z.number().int().min(0).max(6))
      .max(7)
      .optional(),
  })
  .optional();

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export const createHabitSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    goalType: z.enum(['daily', 'weekly', 'monthly'] as const),
    targetCount: z
      .number()
      .min(1, 'Target must be at least 1')
      .max(1000, 'Target too high'),
    startDate: z.string().datetime().optional(),
    // Hierarchy
    level: z
      .enum(['standalone', 'month', 'week', 'day'] as const)
      .default('standalone'),
    parentId: z.string().optional(),
    period: goalPeriodSchema,
  })
  .superRefine((data, ctx) => {
    if (data.level === 'month' || data.level === 'week' || data.level === 'day') {
      if (!data.period?.year) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'period.year is required for month/week/day level goals',
          path: ['period', 'year'],
        });
      }
      if (!data.period?.month) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'period.month is required for month/week/day level goals',
          path: ['period', 'month'],
        });
      }
    }
    if (data.level === 'week' || data.level === 'day') {
      if (!data.period?.weekOfMonth) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'period.weekOfMonth is required for week/day level goals',
          path: ['period', 'weekOfMonth'],
        });
      }
    }
  });

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export const updateHabitSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  goalType: z.enum(['daily', 'weekly', 'monthly'] as const).optional(),
  targetCount: z
    .number()
    .min(1, 'Target must be at least 1')
    .max(1000, 'Target too high')
    .optional(),
  active: z.boolean().optional(),
  period: goalPeriodSchema,
});

// ---------------------------------------------------------------------------
// Auto-breakdown request
// ---------------------------------------------------------------------------

export const autoBreakdownSchema = z.object({
  weeks: z.number().int().min(1).max(5),
  dailyTarget: z.number().int().min(1).max(100),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).max(7),
});

// ---------------------------------------------------------------------------
// Query / param helpers
// ---------------------------------------------------------------------------

export const getHabitsSchema = z.object({
  page: z
    .string()
    .transform(Number)
    .refine((n) => n > 0, 'Page must be positive')
    .optional(),
  limit: z
    .string()
    .transform(Number)
    .refine((n) => n > 0 && n <= 100, 'Limit must be between 1-100')
    .optional(),
  goalType: z.enum(['daily', 'weekly', 'monthly'] as const).optional(),
  level: z
    .enum(['standalone', 'month', 'week', 'day'] as const)
    .optional(),
  active: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  sortBy: z
    .enum(['name', 'createdAt', 'updatedAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const getHabitByIdSchema = z.object({
  habitId: z.string().min(1, 'Habit ID is required'),
});

export const deleteHabitSchema = z.object({
  habitId: z.string().min(1, 'Habit ID is required'),
});