import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const signupSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    name: z.ZodEffects<z.ZodString, string, string>;
    timezone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    password: string;
    timezone?: string | undefined;
}, {
    name: string;
    email: string;
    password: string;
    timezone?: string | undefined;
}>;
export declare const refreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
export declare const createHabitSchema: z.ZodObject<{
    name: z.ZodEffects<z.ZodString, string, string>;
    description: z.ZodOptional<z.ZodString>;
    goalType: z.ZodEnum<["daily", "weekly", "monthly"]>;
    targetCount: z.ZodNumber;
    startDate: z.ZodEffects<z.ZodOptional<z.ZodString>, Date, string | undefined>;
}, "strip", z.ZodTypeAny, {
    name: string;
    goalType: "daily" | "weekly" | "monthly";
    targetCount: number;
    startDate: Date;
    description?: string | undefined;
}, {
    name: string;
    goalType: "daily" | "weekly" | "monthly";
    targetCount: number;
    description?: string | undefined;
    startDate?: string | undefined;
}>;
export declare const updateHabitSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    goalType: z.ZodOptional<z.ZodEnum<["daily", "weekly", "monthly"]>>;
    targetCount: z.ZodOptional<z.ZodNumber>;
    active: z.ZodOptional<z.ZodBoolean>;
    startDate: z.ZodEffects<z.ZodOptional<z.ZodString>, Date | undefined, string | undefined>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    goalType?: "daily" | "weekly" | "monthly" | undefined;
    targetCount?: number | undefined;
    startDate?: Date | undefined;
    active?: boolean | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    goalType?: "daily" | "weekly" | "monthly" | undefined;
    targetCount?: number | undefined;
    startDate?: string | undefined;
    active?: boolean | undefined;
}>, {
    name?: string | undefined;
    description?: string | undefined;
    goalType?: "daily" | "weekly" | "monthly" | undefined;
    targetCount?: number | undefined;
    startDate?: Date | undefined;
    active?: boolean | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    goalType?: "daily" | "weekly" | "monthly" | undefined;
    targetCount?: number | undefined;
    startDate?: string | undefined;
    active?: boolean | undefined;
}>;
export declare const createCompletionSchema: z.ZodObject<{
    habitId: z.ZodString;
    date: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>>;
}, "strip", z.ZodTypeAny, {
    date: string;
    habitId: string;
}, {
    habitId: string;
    date?: string | undefined;
}>;
export declare const deleteCompletionSchema: z.ZodObject<{
    completionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    completionId: string;
}, {
    completionId: string;
}>;
export declare const getHabitsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    goalType: z.ZodOptional<z.ZodEnum<["daily", "weekly", "monthly"]>>;
    active: z.ZodOptional<z.ZodBoolean>;
    sortBy: z.ZodDefault<z.ZodEnum<["name", "createdAt", "currentStreak", "longestStreak"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    sortBy: "name" | "createdAt" | "currentStreak" | "longestStreak";
    sortOrder: "asc" | "desc";
    goalType?: "daily" | "weekly" | "monthly" | undefined;
    active?: boolean | undefined;
}, {
    goalType?: "daily" | "weekly" | "monthly" | undefined;
    active?: boolean | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    sortBy?: "name" | "createdAt" | "currentStreak" | "longestStreak" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare const getCompletionsQuerySchema: z.ZodEffects<z.ZodObject<{
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    startDate?: string | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    endDate?: string | undefined;
}>, {
    limit: number;
    page: number;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    startDate?: string | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    endDate?: string | undefined;
}>;
export declare const getCalendarQuerySchema: z.ZodObject<{
    year: z.ZodNumber;
    month: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    year: number;
    month: number;
}, {
    year: number;
    month: number;
}>;
export declare const getDateRangeQuerySchema: z.ZodEffects<z.ZodObject<{
    startDate: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    endDate: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    habitIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    startDate: string;
    endDate: string;
    habitIds?: string[] | undefined;
}, {
    startDate: string;
    endDate: string;
    habitIds?: string[] | undefined;
}>, {
    startDate: string;
    endDate: string;
    habitIds?: string[] | undefined;
}, {
    startDate: string;
    endDate: string;
    habitIds?: string[] | undefined;
}>;
export declare const habitIdParamSchema: z.ZodObject<{
    habitId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    habitId: string;
}, {
    habitId: string;
}>;
export declare const completionIdParamSchema: z.ZodObject<{
    completionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    completionId: string;
}, {
    completionId: string;
}>;
export declare const updateProfileSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    timezone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    timezone?: string | undefined;
}, {
    name?: string | undefined;
    timezone?: string | undefined;
}>, {
    name?: string | undefined;
    timezone?: string | undefined;
}, {
    name?: string | undefined;
    timezone?: string | undefined;
}>;
export declare const changePasswordSchema: z.ZodEffects<z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
    confirmPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}, {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}>, {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}, {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}>;
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
export declare const ERROR_MESSAGES: {
    readonly INVALID_CREDENTIALS: "Invalid email or password";
    readonly EMAIL_EXISTS: "A user with this email already exists";
    readonly HABIT_NOT_FOUND: "Habit not found";
    readonly COMPLETION_NOT_FOUND: "Completion not found";
    readonly DUPLICATE_COMPLETION: "Habit already completed for this date";
    readonly PAST_DATE_EDIT: "Cannot edit completions from more than 30 days ago";
    readonly RATE_LIMIT: "Too many requests. Please try again later.";
    readonly MAINTENANCE: "Service is temporarily unavailable. Please try again later.";
    readonly QUOTA_EXCEEDED: "You have exceeded your quota. Please upgrade your plan.";
};
export declare const validatePasswordStrength: (password: string) => {
    isValid: boolean;
    errors: string[];
    score: number;
};
export declare const validateEmailFormat: (email: string) => boolean;
//# sourceMappingURL=validationSchemas.d.ts.map