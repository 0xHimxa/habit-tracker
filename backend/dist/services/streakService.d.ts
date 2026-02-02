import { GoalType } from '../models/Habit';
export interface StreakResult {
    currentStreak: number;
    longestStreak: number;
    lastCompletedDate?: Date;
    streakBreaks: Date[];
}
export declare class StreakService {
    static calculateStreak(habitId: string, goalType: GoalType, targetCount: number, userTimezone: string, startDate?: Date): Promise<StreakResult>;
    private static calculateDailyStreak;
    private static calculateWeeklyStreak;
    private static calculateMonthlyStreak;
    private static findConsecutiveStreaks;
    private static findConsecutiveWeeklyStreaks;
    private static findConsecutiveMonthlyStreaks;
    private static normalizeDate;
    private static isRecentStreak;
    private static isRecentWeek;
    private static isRecentMonth;
    static checkStreakImpact(habitId: string, completionDate: Date, goalType: GoalType, targetCount: number, timezone: string): Promise<{
        wouldExtendStreak: boolean;
        wouldStartNewStreak: boolean;
        currentStreak: number;
    }>;
    private static calculateStreakWithCompletions;
}
//# sourceMappingURL=streakService.d.ts.map