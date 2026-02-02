import { z } from 'zod';

// Common validation patterns
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(254, 'Email address too long');

const dateSchema = z
  .string()
  .refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, 'Invalid date format')
  .refine((date) => {
    const parsed = new Date(date);
    return parsed <= new Date();
  }, 'Date cannot be in the future');

const habitNameSchema = z
  .string()
  .min(1, 'Habit name is required')
  .max(100, 'Habit name must be less than 100 characters')
  .trim()
  .refine((name) => name.length > 0, 'Habit name cannot be empty');

const habitDescriptionSchema = z
  .string()
  .max(500, 'Description must be less than 500 characters')
  .trim()
  .optional();

const goalTypeSchema = z.enum(['daily', 'weekly', 'monthly'], {
  errorMap: () => ({ message: 'Goal type must be daily, weekly, or monthly' })
});

const targetCountSchema = z
  .number()
  .int('Target count must be an integer')
  .min(1, 'Target count must be at least 1')
  .max(1000, 'Target count must be less than 1000');

const timezoneSchema = z
  .string()
  .min(1, 'Timezone is required')
  .optional();

// Authentication validation schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .refine((name) => name.length > 0, 'Name cannot be empty'),
  timezone: timezoneSchema
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

// Habit validation schemas
export const createHabitSchema = z.object({
  name: habitNameSchema,
  description: habitDescriptionSchema,
  goalType: goalTypeSchema,
  targetCount: targetCountSchema,
  startDate: z.string().optional().transform(val => val ? new Date(val) : new Date())
});

export const updateHabitSchema = z.object({
  name: habitNameSchema.optional(),
  description: habitDescriptionSchema.optional(),
  goalType: goalTypeSchema.optional(),
  targetCount: targetCountSchema.optional(),
  active: z.boolean().optional(),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined)
}).refine((data) => {
  // Ensure at least one field is provided
  return Object.keys(data).length > 0;
}, {
  message: 'At least one field must be provided for update'
});

// Completion validation schemas
export const createCompletionSchema = z.object({
  habitId: z.string().min(1, 'Habit ID is required'),
  date: dateSchema.optional().default(() => new Date().toISOString().split('T')[0])
});

export const deleteCompletionSchema = z.object({
  completionId: z.string().min(1, 'Completion ID is required')
});

// Query parameter validation schemas
export const getHabitsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  goalType: goalTypeSchema.optional(),
  active: z.coerce.boolean().optional(),
  sortBy: z.enum(['name', 'createdAt', 'currentStreak', 'longestStreak']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const getCompletionsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50)
}).refine((data) => {
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (start > end) {
      throw new Error('Start date must be before end date');
    }
  }
  return true;
});

export const getCalendarQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2030),
  month: z.coerce.number().int().min(1).max(12)
});

export const getDateRangeQuerySchema = z.object({
  startDate: dateSchema,
  endDate: dateSchema,
  habitIds: z.array(z.string()).optional()
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  if (start > end) {
    throw new Error('Start date must be before end date');
  }
  
  // Limit date range to prevent performance issues
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > 365) {
    throw new Error('Date range cannot exceed 1 year');
  }
  
  return true;
});

// Parameter validation schemas
export const habitIdParamSchema = z.object({
  habitId: z.string().min(1, 'Habit ID is required')
});

export const completionIdParamSchema = z.object({
  completionId: z.string().min(1, 'Completion ID is required')
});

// User profile update schema
export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim().optional(),
  timezone: timezoneSchema
}).refine((data) => {
  return Object.keys(data).length > 0;
}, {
  message: 'At least one field must be provided for update'
});

// Password change schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Password confirmation is required')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

// Export type inference helpers
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;
export type CreateCompletionInput = z.infer<typeof createCompletionSchema>;
export type GetHabitsQuery = z.infer<typeof getHabitsQuerySchema>;
export type GetCompletionsQuery = z.infer<typeof getCompletionsQuerySchema>;
export type GetCalendarQuery = z.infer<typeof getCalendarQuerySchema>;
export type GetDateRangeQuery = z.infer<typeof getDateRangeQuerySchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// Custom error messages for better UX
export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_EXISTS: 'A user with this email already exists',
  HABIT_NOT_FOUND: 'Habit not found',
  COMPLETION_NOT_FOUND: 'Completion not found',
  DUPLICATE_COMPLETION: 'Habit already completed for this date',
  PAST_DATE_EDIT: 'Cannot edit completions from more than 30 days ago',
  RATE_LIMIT: 'Too many requests. Please try again later.',
  MAINTENANCE: 'Service is temporarily unavailable. Please try again later.',
  QUOTA_EXCEEDED: 'You have exceeded your quota. Please upgrade your plan.'
} as const;

// Validation helpers
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  errors: string[];
  score: number;
} => {
  const errors: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  else errors.push('Password must be at least 8 characters');

  if (/[A-Z]/.test(password)) score += 1;
  else errors.push('Password must contain at least one uppercase letter');

  if (/[a-z]/.test(password)) score += 1;
  else errors.push('Password must contain at least one lowercase letter');

  if (/[0-9]/.test(password)) score += 1;
  else errors.push('Password must contain at least one number');

  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else errors.push('Password must contain at least one special character');

  if (password.length >= 12) score += 1;

  return {
    isValid: errors.length === 0,
    errors,
    score
  };
};

export const validateEmailFormat = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};