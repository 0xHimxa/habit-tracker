"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompletionsByDateRangeSchema = exports.deleteCompletionSchema = exports.getCompletionsSchema = exports.createCompletionSchema = void 0;
const zod_1 = require("zod");
exports.createCompletionSchema = zod_1.z.object({
    habitId: zod_1.z.string().min(1, 'Habit ID is required'),
    date: zod_1.z.string().datetime().optional()
});
exports.getCompletionsSchema = zod_1.z.object({
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    page: zod_1.z.string().transform(Number).refine(n => n > 0, 'Page must be positive').optional(),
    limit: zod_1.z.string().transform(Number).refine(n => n > 0 && n <= 100, 'Limit must be between 1-100').optional()
});
exports.deleteCompletionSchema = zod_1.z.object({
    completionId: zod_1.z.string().min(1, 'Completion ID is required')
});
exports.getCompletionsByDateRangeSchema = zod_1.z.object({
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime(),
    habitIds: zod_1.z.string().optional().transform(val => val ? val.split(',') : undefined)
});
//# sourceMappingURL=completionValidators.js.map