import { z } from 'zod';
export declare const createCompletionSchema: z.ZodObject<{
    habitId: z.ZodString;
    date: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    habitId: string;
    date?: string | undefined;
}, {
    habitId: string;
    date?: string | undefined;
}>;
export declare const getCompletionsSchema: z.ZodObject<{
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    page: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>;
    limit: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>;
}, "strip", z.ZodTypeAny, {
    limit?: number | undefined;
    startDate?: string | undefined;
    page?: number | undefined;
    endDate?: string | undefined;
}, {
    limit?: string | undefined;
    startDate?: string | undefined;
    page?: string | undefined;
    endDate?: string | undefined;
}>;
export declare const deleteCompletionSchema: z.ZodObject<{
    completionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    completionId: string;
}, {
    completionId: string;
}>;
export declare const getCompletionsByDateRangeSchema: z.ZodObject<{
    startDate: z.ZodString;
    endDate: z.ZodString;
    habitIds: z.ZodEffects<z.ZodOptional<z.ZodString>, string[] | undefined, string | undefined>;
}, "strip", z.ZodTypeAny, {
    startDate: string;
    endDate: string;
    habitIds?: string[] | undefined;
}, {
    startDate: string;
    endDate: string;
    habitIds?: string | undefined;
}>;
//# sourceMappingURL=completionValidators.d.ts.map