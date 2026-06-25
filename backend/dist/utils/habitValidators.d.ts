import { z } from 'zod';
export declare const createHabitSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    goalType: z.ZodEnum<["daily", "weekly", "monthly"]>;
    targetCount: z.ZodNumber;
    startDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    goalType: "daily" | "weekly" | "monthly";
    targetCount: number;
    description?: string | undefined;
    startDate?: string | undefined;
}, {
    name: string;
    goalType: "daily" | "weekly" | "monthly";
    targetCount: number;
    description?: string | undefined;
    startDate?: string | undefined;
}>;
export declare const updateHabitSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    goalType: z.ZodOptional<z.ZodEnum<["daily", "weekly", "monthly"]>>;
    targetCount: z.ZodOptional<z.ZodNumber>;
    active: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    goalType?: "daily" | "weekly" | "monthly" | undefined;
    targetCount?: number | undefined;
    active?: boolean | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    goalType?: "daily" | "weekly" | "monthly" | undefined;
    targetCount?: number | undefined;
    active?: boolean | undefined;
}>;
export declare const getHabitsSchema: z.ZodObject<{
    page: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>;
    limit: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>;
    goalType: z.ZodOptional<z.ZodEnum<["daily", "weekly", "monthly"]>>;
    active: z.ZodOptional<z.ZodEffects<z.ZodEnum<["true", "false"]>, boolean, "true" | "false">>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["name", "createdAt", "updatedAt"]>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    sortBy: "name" | "createdAt" | "updatedAt";
    sortOrder: "asc" | "desc";
    goalType?: "daily" | "weekly" | "monthly" | undefined;
    active?: boolean | undefined;
    limit?: number | undefined;
    page?: number | undefined;
}, {
    goalType?: "daily" | "weekly" | "monthly" | undefined;
    active?: "true" | "false" | undefined;
    limit?: string | undefined;
    page?: string | undefined;
    sortBy?: "name" | "createdAt" | "updatedAt" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare const getHabitByIdSchema: z.ZodObject<{
    habitId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    habitId: string;
}, {
    habitId: string;
}>;
export declare const deleteHabitSchema: z.ZodObject<{
    habitId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    habitId: string;
}, {
    habitId: string;
}>;
//# sourceMappingURL=habitValidators.d.ts.map