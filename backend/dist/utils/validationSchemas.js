"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEmailFormat = exports.validatePasswordStrength = exports.ERROR_MESSAGES = exports.changePasswordSchema = exports.updateProfileSchema = exports.completionIdParamSchema = exports.habitIdParamSchema = exports.getDateRangeQuerySchema = exports.getCalendarQuerySchema = exports.getCompletionsQuerySchema = exports.getHabitsQuerySchema = exports.deleteCompletionSchema = exports.createCompletionSchema = exports.updateHabitSchema = exports.createHabitSchema = exports.refreshTokenSchema = exports.signupSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
const passwordSchema = zod_1.z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');
const emailSchema = zod_1.z
    .string()
    .email('Invalid email address')
    .max(254, 'Email address too long');
const dateSchema = zod_1.z
    .string()
    .refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
}, 'Invalid date format')
    .refine((date) => {
    const parsed = new Date(date);
    return parsed <= new Date();
}, 'Date cannot be in the future');
const habitNameSchema = zod_1.z
    .string()
    .min(1, 'Habit name is required')
    .max(100, 'Habit name must be less than 100 characters')
    .trim()
    .refine((name) => name.length > 0, 'Habit name cannot be empty');
const habitDescriptionSchema = zod_1.z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional();
const goalTypeSchema = zod_1.z.enum(['daily', 'weekly', 'monthly'], {
    errorMap: () => ({ message: 'Goal type must be daily, weekly, or monthly' })
});
const targetCountSchema = zod_1.z
    .number()
    .int('Target count must be an integer')
    .min(1, 'Target count must be at least 1')
    .max(1000, 'Target count must be less than 1000');
const timezoneSchema = zod_1.z
    .string()
    .min(1, 'Timezone is required')
    .optional();
exports.loginSchema = zod_1.z.object({
    email: emailSchema,
    password: zod_1.z.string().min(1, 'Password is required')
});
exports.signupSchema = zod_1.z.object({
    email: emailSchema,
    password: passwordSchema,
    name: zod_1.z
        .string()
        .min(1, 'Name is required')
        .max(100, 'Name must be less than 100 characters')
        .trim()
        .refine((name) => name.length > 0, 'Name cannot be empty'),
    timezone: timezoneSchema
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required')
});
exports.createHabitSchema = zod_1.z.object({
    name: habitNameSchema,
    description: habitDescriptionSchema,
    goalType: goalTypeSchema,
    targetCount: targetCountSchema,
    startDate: zod_1.z.string().optional().transform(val => val ? new Date(val) : new Date())
});
exports.updateHabitSchema = zod_1.z.object({
    name: habitNameSchema.optional(),
    description: habitDescriptionSchema.optional(),
    goalType: goalTypeSchema.optional(),
    targetCount: targetCountSchema.optional(),
    active: zod_1.z.boolean().optional(),
    startDate: zod_1.z.string().optional().transform(val => val ? new Date(val) : undefined)
}).refine((data) => {
    return Object.keys(data).length > 0;
}, {
    message: 'At least one field must be provided for update'
});
exports.createCompletionSchema = zod_1.z.object({
    habitId: zod_1.z.string().min(1, 'Habit ID is required'),
    date: dateSchema.optional().default(() => new Date().toISOString().split('T')[0])
});
exports.deleteCompletionSchema = zod_1.z.object({
    completionId: zod_1.z.string().min(1, 'Completion ID is required')
});
exports.getHabitsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    goalType: goalTypeSchema.optional(),
    active: zod_1.z.coerce.boolean().optional(),
    sortBy: zod_1.z.enum(['name', 'createdAt', 'currentStreak', 'longestStreak']).default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc')
});
exports.getCompletionsQuerySchema = zod_1.z.object({
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50)
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
exports.getCalendarQuerySchema = zod_1.z.object({
    year: zod_1.z.coerce.number().int().min(2020).max(2030),
    month: zod_1.z.coerce.number().int().min(1).max(12)
});
exports.getDateRangeQuerySchema = zod_1.z.object({
    startDate: dateSchema,
    endDate: dateSchema,
    habitIds: zod_1.z.array(zod_1.z.string()).optional()
}).refine((data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (start > end) {
        throw new Error('Start date must be before end date');
    }
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
        throw new Error('Date range cannot exceed 1 year');
    }
    return true;
});
exports.habitIdParamSchema = zod_1.z.object({
    habitId: zod_1.z.string().min(1, 'Habit ID is required')
});
exports.completionIdParamSchema = zod_1.z.object({
    completionId: zod_1.z.string().min(1, 'Completion ID is required')
});
exports.updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required').max(100).trim().optional(),
    timezone: timezoneSchema
}).refine((data) => {
    return Object.keys(data).length > 0;
}, {
    message: 'At least one field must be provided for update'
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: zod_1.z.string().min(1, 'Password confirmation is required')
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
});
exports.ERROR_MESSAGES = {
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_EXISTS: 'A user with this email already exists',
    HABIT_NOT_FOUND: 'Habit not found',
    COMPLETION_NOT_FOUND: 'Completion not found',
    DUPLICATE_COMPLETION: 'Habit already completed for this date',
    PAST_DATE_EDIT: 'Cannot edit completions from more than 30 days ago',
    RATE_LIMIT: 'Too many requests. Please try again later.',
    MAINTENANCE: 'Service is temporarily unavailable. Please try again later.',
    QUOTA_EXCEEDED: 'You have exceeded your quota. Please upgrade your plan.'
};
const validatePasswordStrength = (password) => {
    const errors = [];
    let score = 0;
    if (password.length >= 8)
        score += 1;
    else
        errors.push('Password must be at least 8 characters');
    if (/[A-Z]/.test(password))
        score += 1;
    else
        errors.push('Password must contain at least one uppercase letter');
    if (/[a-z]/.test(password))
        score += 1;
    else
        errors.push('Password must contain at least one lowercase letter');
    if (/[0-9]/.test(password))
        score += 1;
    else
        errors.push('Password must contain at least one number');
    if (/[^A-Za-z0-9]/.test(password))
        score += 1;
    else
        errors.push('Password must contain at least one special character');
    if (password.length >= 12)
        score += 1;
    return {
        isValid: errors.length === 0,
        errors,
        score
    };
};
exports.validatePasswordStrength = validatePasswordStrength;
const validateEmailFormat = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
};
exports.validateEmailFormat = validateEmailFormat;
//# sourceMappingURL=validationSchemas.js.map