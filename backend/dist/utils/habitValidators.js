"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteHabitSchema = exports.getHabitByIdSchema = exports.getHabitsSchema = exports.autoBreakdownSchema = exports.updateHabitSchema = exports.createHabitSchema = void 0;
const zod_1 = require("zod");
const goalPeriodSchema = zod_1.z
    .object({
    year: zod_1.z.number().int().min(2000).max(2100).optional(),
    month: zod_1.z.number().int().min(1).max(12).optional(),
    weekOfMonth: zod_1.z.number().int().min(1).max(5).optional(),
    daysOfWeek: zod_1.z
        .array(zod_1.z.number().int().min(0).max(6))
        .max(7)
        .optional(),
})
    .optional();
exports.createHabitSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1, 'Name is required').max(100, 'Name too long'),
    description: zod_1.z.string().max(500, 'Description too long').optional(),
    goalType: zod_1.z.enum(['daily', 'weekly', 'monthly']),
    targetCount: zod_1.z
        .number()
        .min(1, 'Target must be at least 1')
        .max(1000, 'Target too high'),
    startDate: zod_1.z.string().datetime().optional(),
    level: zod_1.z
        .enum(['standalone', 'month', 'week', 'day'])
        .default('standalone'),
    parentId: zod_1.z.string().optional(),
    period: goalPeriodSchema,
})
    .superRefine((data, ctx) => {
    if (data.level === 'month' || data.level === 'week' || data.level === 'day') {
        if (!data.period?.year) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: 'period.year is required for month/week/day level goals',
                path: ['period', 'year'],
            });
        }
        if (!data.period?.month) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: 'period.month is required for month/week/day level goals',
                path: ['period', 'month'],
            });
        }
    }
    if (data.level === 'week' || data.level === 'day') {
        if (!data.period?.weekOfMonth) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: 'period.weekOfMonth is required for week/day level goals',
                path: ['period', 'weekOfMonth'],
            });
        }
    }
});
exports.updateHabitSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
    description: zod_1.z.string().max(500, 'Description too long').optional(),
    goalType: zod_1.z.enum(['daily', 'weekly', 'monthly']).optional(),
    targetCount: zod_1.z
        .number()
        .min(1, 'Target must be at least 1')
        .max(1000, 'Target too high')
        .optional(),
    active: zod_1.z.boolean().optional(),
    period: goalPeriodSchema,
});
exports.autoBreakdownSchema = zod_1.z.object({
    weeks: zod_1.z.number().int().min(1).max(5),
    dailyTarget: zod_1.z.number().int().min(1).max(100),
    daysOfWeek: zod_1.z.array(zod_1.z.number().int().min(0).max(6)).min(1).max(7),
});
exports.getHabitsSchema = zod_1.z.object({
    page: zod_1.z
        .string()
        .transform(Number)
        .refine((n) => n > 0, 'Page must be positive')
        .optional(),
    limit: zod_1.z
        .string()
        .transform(Number)
        .refine((n) => n > 0 && n <= 100, 'Limit must be between 1-100')
        .optional(),
    goalType: zod_1.z.enum(['daily', 'weekly', 'monthly']).optional(),
    level: zod_1.z
        .enum(['standalone', 'month', 'week', 'day'])
        .optional(),
    active: zod_1.z
        .enum(['true', 'false'])
        .transform((val) => val === 'true')
        .optional(),
    sortBy: zod_1.z
        .enum(['name', 'createdAt', 'updatedAt'])
        .optional()
        .default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
});
exports.getHabitByIdSchema = zod_1.z.object({
    habitId: zod_1.z.string().min(1, 'Habit ID is required'),
});
exports.deleteHabitSchema = zod_1.z.object({
    habitId: zod_1.z.string().min(1, 'Habit ID is required'),
});
//# sourceMappingURL=habitValidators.js.map