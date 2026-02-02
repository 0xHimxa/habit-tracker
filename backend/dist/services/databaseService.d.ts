export declare class DatabaseService {
    private cache;
    constructor();
    getUserById(userId: string): Promise<any>;
    getUserHabits(userId: string, options?: {
        active?: boolean;
        goalType?: string;
        limit?: number;
        skip?: number;
        sortBy?: string;
        sortOrder?: 1 | -1;
    }): Promise<{
        habits: any[];
        total: number;
    }>;
    getCompletionsByDateRange(userId: string, startDate: Date, endDate: Date, habitIds?: string[]): Promise<any[]>;
    getCalendarData(userId: string, year: number, month: number): Promise<any>;
    getAnalyticsData(userId: string): Promise<any>;
    getStreakData(habitId: string): Promise<any[]>;
    createMultipleCompletions(completions: Array<{
        userId: string;
        habitId: string;
        date: Date;
        completedAt?: Date;
    }>): Promise<any[]>;
    invalidateUserCache(userId: string): void;
    invalidateHabitCache(habitId: string, userId: string): void;
    getDatabaseStats(): Promise<any>;
    private isToday;
    private isPast;
}
export declare const dbService: DatabaseService;
//# sourceMappingURL=databaseService.d.ts.map