import { z } from 'zod';
export declare const createHabitSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    goalType: z.ZodEnum<["daily", "weekly", "monthly"]>;
    targetCount: z.ZodNumber;
    startDate: z.ZodOptional<z.ZodString>;
    level: z.ZodDefault<z.ZodEnum<["standalone", "month", "week", "day"]>>;
    parentId: z.ZodOptional<z.ZodString>;
    period: z.ZodOptional<z.ZodObject<{
        year: z.ZodOptional<z.ZodNumber>;
        month: z.ZodOptional<z.ZodNumber>;
        weekOfMonth: z.ZodOptional<z.ZodNumber>;
        daysOfWeek: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        date: z.ZodOptional<z.ZodString>;
        dateRange: z.ZodOptional<z.ZodObject<{
            start: z.ZodString;
            end: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            start: string;
            end: string;
        }, {
            start: string;
            end: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        month?: number | undefined;
        year?: number | undefined;
        weekOfMonth?: number | undefined;
        daysOfWeek?: number[] | undefined;
        date?: string | undefined;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
    }, {
        month?: number | undefined;
        year?: number | undefined;
        weekOfMonth?: number | undefined;
        daysOfWeek?: number[] | undefined;
        date?: string | undefined;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    goalType: "daily" | "weekly" | "monthly";
    targetCount: number;
    level: "standalone" | "month" | "week" | "day";
    description?: string | undefined;
    startDate?: string | undefined;
    parentId?: string | undefined;
    period?: {
        month?: number | undefined;
        year?: number | undefined;
        weekOfMonth?: number | undefined;
        daysOfWeek?: number[] | undefined;
        date?: string | undefined;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
    } | undefined;
}, {
    name: string;
    goalType: "daily" | "weekly" | "monthly";
    targetCount: number;
    description?: string | undefined;
    startDate?: string | undefined;
    level?: "standalone" | "month" | "week" | "day" | undefined;
    parentId?: string | undefined;
    period?: {
        month?: number | undefined;
        year?: number | undefined;
        weekOfMonth?: number | undefined;
        daysOfWeek?: number[] | undefined;
        date?: string | undefined;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
    } | undefined;
}>, {
    name: string;
    goalType: "daily" | "weekly" | "monthly";
    targetCount: number;
    level: "standalone" | "month" | "week" | "day";
    description?: string | undefined;
    startDate?: string | undefined;
    parentId?: string | undefined;
    period?: {
        month?: number | undefined;
        year?: number | undefined;
        weekOfMonth?: number | undefined;
        daysOfWeek?: number[] | undefined;
        date?: string | undefined;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
    } | undefined;
}, {
    name: string;
    goalType: "daily" | "weekly" | "monthly";
    targetCount: number;
    description?: string | undefined;
    startDate?: string | undefined;
    level?: "standalone" | "month" | "week" | "day" | undefined;
    parentId?: string | undefined;
    period?: {
        month?: number | undefined;
        year?: number | undefined;
        weekOfMonth?: number | undefined;
        daysOfWeek?: number[] | undefined;
        date?: string | undefined;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
    } | undefined;
}>;
export declare const updateHabitSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    goalType: z.ZodOptional<z.ZodEnum<["daily", "weekly", "monthly"]>>;
    targetCount: z.ZodOptional<z.ZodNumber>;
    active: z.ZodOptional<z.ZodBoolean>;
    period: z.ZodOptional<z.ZodObject<{
        year: z.ZodOptional<z.ZodNumber>;
        month: z.ZodOptional<z.ZodNumber>;
        weekOfMonth: z.ZodOptional<z.ZodNumber>;
        daysOfWeek: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        date: z.ZodOptional<z.ZodString>;
        dateRange: z.ZodOptional<z.ZodObject<{
            start: z.ZodString;
            end: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            start: string;
            end: string;
        }, {
            start: string;
            end: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        month?: number | undefined;
        year?: number | undefined;
        weekOfMonth?: number | undefined;
        daysOfWeek?: number[] | undefined;
        date?: string | undefined;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
    }, {
        month?: number | undefined;
        year?: number | undefined;
        weekOfMonth?: number | undefined;
        daysOfWeek?: number[] | undefined;
        date?: string | undefined;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    goalType?: "daily" | "weekly" | "monthly" | undefined;
    targetCount?: number | undefined;
    active?: boolean | undefined;
    period?: {
        month?: number | undefined;
        year?: number | undefined;
        weekOfMonth?: number | undefined;
        daysOfWeek?: number[] | undefined;
        date?: string | undefined;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
    } | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    goalType?: "daily" | "weekly" | "monthly" | undefined;
    targetCount?: number | undefined;
    active?: boolean | undefined;
    period?: {
        month?: number | undefined;
        year?: number | undefined;
        weekOfMonth?: number | undefined;
        daysOfWeek?: number[] | undefined;
        date?: string | undefined;
        dateRange?: {
            start: string;
            end: string;
        } | undefined;
    } | undefined;
}>;
export declare const autoBreakdownSchema: z.ZodObject<{
    weeks: z.ZodNumber;
    dailyTarget: z.ZodNumber;
    daysOfWeek: z.ZodArray<z.ZodNumber, "many">;
}, "strip", z.ZodTypeAny, {
    daysOfWeek: number[];
    weeks: number;
    dailyTarget: number;
}, {
    daysOfWeek: number[];
    weeks: number;
    dailyTarget: number;
}>;
export declare const manualBreakdownSchema: z.ZodObject<{
    weeks: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        weekOfMonth: z.ZodNumber;
        weeklyTarget: z.ZodOptional<z.ZodNumber>;
        days: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            daysOfWeek: z.ZodArray<z.ZodNumber, "many">;
            dailyTarget: z.ZodDefault<z.ZodNumber>;
            date: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            daysOfWeek: number[];
            name: string;
            dailyTarget: number;
            date?: string | undefined;
            description?: string | undefined;
        }, {
            daysOfWeek: number[];
            name: string;
            date?: string | undefined;
            description?: string | undefined;
            dailyTarget?: number | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        weekOfMonth: number;
        name: string;
        days: {
            daysOfWeek: number[];
            name: string;
            dailyTarget: number;
            date?: string | undefined;
            description?: string | undefined;
        }[];
        description?: string | undefined;
        weeklyTarget?: number | undefined;
    }, {
        weekOfMonth: number;
        name: string;
        days: {
            daysOfWeek: number[];
            name: string;
            date?: string | undefined;
            description?: string | undefined;
            dailyTarget?: number | undefined;
        }[];
        description?: string | undefined;
        weeklyTarget?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    weeks: {
        weekOfMonth: number;
        name: string;
        days: {
            daysOfWeek: number[];
            name: string;
            dailyTarget: number;
            date?: string | undefined;
            description?: string | undefined;
        }[];
        description?: string | undefined;
        weeklyTarget?: number | undefined;
    }[];
}, {
    weeks: {
        weekOfMonth: number;
        name: string;
        days: {
            daysOfWeek: number[];
            name: string;
            date?: string | undefined;
            description?: string | undefined;
            dailyTarget?: number | undefined;
        }[];
        description?: string | undefined;
        weeklyTarget?: number | undefined;
    }[];
}>;
export declare const getHabitsSchema: z.ZodObject<{
    page: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>;
    limit: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>;
    goalType: z.ZodOptional<z.ZodEnum<["daily", "weekly", "monthly"]>>;
    level: z.ZodOptional<z.ZodEnum<["standalone", "month", "week", "day"]>>;
    active: z.ZodOptional<z.ZodEffects<z.ZodEnum<["true", "false"]>, boolean, "true" | "false">>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["name", "createdAt", "updatedAt"]>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    sortBy: "name" | "createdAt" | "updatedAt";
    sortOrder: "asc" | "desc";
    limit?: number | undefined;
    goalType?: "daily" | "weekly" | "monthly" | undefined;
    active?: boolean | undefined;
    level?: "standalone" | "month" | "week" | "day" | undefined;
    page?: number | undefined;
}, {
    limit?: string | undefined;
    goalType?: "daily" | "weekly" | "monthly" | undefined;
    active?: "true" | "false" | undefined;
    level?: "standalone" | "month" | "week" | "day" | undefined;
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