"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteHabitSchema = exports.getHabitByIdSchema = exports.getHabitsSchema = exports.updateHabitSchema = exports.createHabitSchema = void 0;
const zod_1 = require("zod");
exports.createHabitSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required').max(100, 'Name too long'),
    description: zod_1.z.string().max(500, 'Description too long').optional(),
    goalType: zod_1.z.enum(['daily', 'weekly', 'monthly']),
    targetCount: zod_1.z.number().min(1, 'Target must be at least 1').max(1000, 'Target too high'),
    startDate: zod_1.z.string().datetime().optional()
});
exports.updateHabitSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
    description: zod_1.z.string().max(500, 'Description too long').optional(),
    goalType: zod_1.z.enum(['daily', 'weekly', 'monthly']).optional(),
    targetCount: zod_1.z.number().min(1, 'Target must be at least 1').max(1000, 'Target too high').optional(),
    active: zod_1.z.boolean().optional()
});
exports.getHabitsSchema = zod_1.z.object({
    page: zod_1.z.string().transform(Number).refine(n => n > 0, 'Page must be positive').optional(),
    limit: zod_1.z.string().transform(Number).refine(n => n > 0 && n <= 100, 'Limit must be between 1-100').optional(),
    goalType: zod_1.z.enum(['daily', 'weekly', 'monthly']).optional(),
    active: zod_1.z.enum(['true', 'false']).transform(val => val === 'true').optional(),
    sortBy: zod_1.z.enum(['name', 'createdAt', 'updatedAt']).optional().default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc')
});
exports.getHabitByIdSchema = zod_1.z.object({
    habitId: zod_1.z.string().min(1, 'Habit ID is required')
});
exports.deleteHabitSchema = zod_1.z.object({
    habitId: zod_1.z.string().min(1, 'Habit ID is required')
});
//# sourceMappingURL=habitValidators.js.map