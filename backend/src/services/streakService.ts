import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isAfter, isBefore, isEqual } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { GoalType } from '../models/Habit';
import { HabitCompletion } from '../models/HabitCompletion';

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate?: Date;
  streakBreaks: Date[];
}

export class StreakService {
  /**
   * Calculate streaks for a habit based on its goal type
   */
  static async calculateStreak(
    habitId: string,
    goalType: GoalType,
    targetCount: number,
    userTimezone: string,
    startDate?: Date
  ): Promise<StreakResult> {
    const completions = await HabitCompletion.find({ habitId })
      .sort({ date: 1 })
      .lean();

    switch (goalType) {
      case 'daily':
        return this.calculateDailyStreak(completions, targetCount, userTimezone, startDate);
      case 'weekly':
        return this.calculateWeeklyStreak(completions, targetCount, userTimezone, startDate);
      case 'monthly':
        return this.calculateMonthlyStreak(completions, targetCount, userTimezone, startDate);
      default:
        throw new Error(`Unsupported goal type: ${goalType}`);
    }
  }

  /**
   * Daily Streak Logic
   * Consecutive days where user completed the habit
   */
  private static calculateDailyStreak(
    completions: any[],
    targetCount: number,
    timezone: string,
    startDate?: Date
  ): StreakResult {
    const normalizedDates = completions.map(comp => 
      this.normalizeDate(comp.date, timezone)
    );

    const dateCounts = new Map<string, number>();
    normalizedDates.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      dateCounts.set(dateStr, (dateCounts.get(dateStr) || 0) + 1);
    });

    const completedDates = Array.from(dateCounts.entries())
      .filter(([_, count]) => count >= targetCount)
      .map(([dateStr]) => new Date(dateStr))
      .sort((a, b) => a.getTime() - b.getTime());

    return this.findConsecutiveStreaks(completedDates, timezone, startDate);
  }

  /**
   * Weekly Streak Logic
   * Consecutive weeks where user met target count
   */
  private static calculateWeeklyStreak(
    completions: any[],
    targetCount: number,
    timezone: string,
    startDate?: Date
  ): StreakResult {
    const weeklyCounts = new Map<string, number>();

    completions.forEach(comp => {
      const zonedDate = utcToZonedTime(comp.date, timezone);
      const weekStart = startOfWeek(zonedDate, { weekStartsOn: 1 }); // Monday
      const weekKey = weekStart.toISOString().split('T')[0];
      
      weeklyCounts.set(weekKey, (weeklyCounts.get(weekKey) || 0) + 1);
    });

    const completedWeeks = Array.from(weeklyCounts.entries())
      .filter(([_, count]) => count >= targetCount)
      .map(([weekKey]) => new Date(weekKey))
      .sort((a, b) => a.getTime() - b.getTime());

    return this.findConsecutiveWeeklyStreaks(completedWeeks, timezone, startDate);
  }

  /**
   * Monthly Streak Logic
   * Consecutive months where user met target count
   */
  private static calculateMonthlyStreak(
    completions: any[],
    targetCount: number,
    timezone: string,
    startDate?: Date
  ): StreakResult {
    const monthlyCounts = new Map<string, number>();

    completions.forEach(comp => {
      const zonedDate = utcToZonedTime(comp.date, timezone);
      const monthStart = startOfMonth(zonedDate);
      const monthKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;
      
      monthlyCounts.set(monthKey, (monthlyCounts.get(monthKey) || 0) + 1);
    });

    const completedMonths = Array.from(monthlyCounts.entries())
      .filter(([_, count]) => count >= targetCount)
      .map(([monthKey]) => {
        const [year, month] = monthKey.split('-').map(Number);
        return new Date(year, month - 1, 1);
      })
      .sort((a, b) => a.getTime() - b.getTime());

    return this.findConsecutiveMonthlyStreaks(completedMonths, timezone, startDate);
  }

  /**
   * Find consecutive daily streaks
   */
  private static findConsecutiveStreaks(
    dates: Date[],
    timezone: string,
    startDate?: Date
  ): StreakResult {
    if (dates.length === 0) {
      return { currentStreak: 0, longestStreak: 0, streakBreaks: [] };
    }

    let currentStreak = 1;
    let longestStreak = 1;
    let tempCurrentStreak = 1;

    const streakBreaks: Date[] = [];
    const today = this.normalizeDate(new Date(), timezone);

    // Filter out future dates
    const pastDates = dates.filter(date => !isAfter(date, today));

    for (let i = 1; i < pastDates.length; i++) {
      const prevDate = pastDates[i - 1];
      const currentDate = pastDates[i];

      // Check if dates are consecutive
      const dayDiff = Math.floor(
        (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (dayDiff === 1) {
        tempCurrentStreak++;
        if (i === pastDates.length - 1 && this.isRecentStreak(prevDate, timezone)) {
          currentStreak = tempCurrentStreak;
        }
      } else {
        longestStreak = Math.max(longestStreak, tempCurrentStreak);
        
        // Record streak break
        const breakDate = new Date(prevDate);
        breakDate.setDate(breakDate.getDate() + 1);
        streakBreaks.push(breakDate);

        // Reset current streak if break is recent
        if (this.isRecentStreak(prevDate, timezone)) {
          currentStreak = tempCurrentStreak;
        } else {
          tempCurrentStreak = 1;
        }
      }
    }

    longestStreak = Math.max(longestStreak, tempCurrentStreak);

    // Check if last completion was recent enough to maintain streak
    const lastCompleted = pastDates[pastDates.length - 1];
    if (!this.isRecentStreak(lastCompleted, timezone)) {
      currentStreak = 0;
    }

    return {
      currentStreak,
      longestStreak,
      lastCompletedDate: lastCompleted,
      streakBreaks
    };
  }

  /**
   * Find consecutive weekly streaks
   */
  private static findConsecutiveWeeklyStreaks(
    weekStarts: Date[],
    timezone: string,
    startDate?: Date
  ): StreakResult {
    if (weekStarts.length === 0) {
      return { currentStreak: 0, longestStreak: 0, streakBreaks: [] };
    }

    let currentStreak = 1;
    let longestStreak = 1;
    let tempCurrentStreak = 1;

    for (let i = 1; i < weekStarts.length; i++) {
      const prevWeek = weekStarts[i - 1];
      const currentWeek = weekStarts[i];

      // Check if weeks are consecutive (7 days apart)
      const weekDiff = Math.floor(
        (currentWeek.getTime() - prevWeek.getTime()) / (1000 * 60 * 60 * 24 * 7)
      );

      if (weekDiff === 1) {
        tempCurrentStreak++;
        if (i === weekStarts.length - 1 && this.isRecentWeek(currentWeek, timezone)) {
          currentStreak = tempCurrentStreak;
        }
      } else {
        longestStreak = Math.max(longestStreak, tempCurrentStreak);
        
        if (this.isRecentWeek(prevWeek, timezone)) {
          currentStreak = tempCurrentStreak;
        } else {
          tempCurrentStreak = 1;
        }
      }
    }

    longestStreak = Math.max(longestStreak, tempCurrentStreak);

    const lastWeekStart = weekStarts[weekStarts.length - 1];
    if (!this.isRecentWeek(lastWeekStart, timezone)) {
      currentStreak = 0;
    }

    return {
      currentStreak,
      longestStreak,
      lastCompletedDate: lastWeekStart,
      streakBreaks: []
    };
  }

  /**
   * Find consecutive monthly streaks
   */
  private static findConsecutiveMonthlyStreaks(
    monthStarts: Date[],
    timezone: string,
    startDate?: Date
  ): StreakResult {
    if (monthStarts.length === 0) {
      return { currentStreak: 0, longestStreak: 0, streakBreaks: [] };
    }

    let currentStreak = 1;
    let longestStreak = 1;
    let tempCurrentStreak = 1;

    for (let i = 1; i < monthStarts.length; i++) {
      const prevMonth = monthStarts[i - 1];
      const currentMonth = monthStarts[i];

      // Check if months are consecutive
      const monthDiff = (currentMonth.getFullYear() - prevMonth.getFullYear()) * 12 +
                       (currentMonth.getMonth() - prevMonth.getMonth());

      if (monthDiff === 1) {
        tempCurrentStreak++;
        if (i === monthStarts.length - 1 && this.isRecentMonth(currentMonth, timezone)) {
          currentStreak = tempCurrentStreak;
        }
      } else {
        longestStreak = Math.max(longestStreak, tempCurrentStreak);
        
        if (this.isRecentMonth(prevMonth, timezone)) {
          currentStreak = tempCurrentStreak;
        } else {
          tempCurrentStreak = 1;
        }
      }
    }

    longestStreak = Math.max(longestStreak, tempCurrentStreak);

    const lastMonthStart = monthStarts[monthStarts.length - 1];
    if (!this.isRecentMonth(lastMonthStart, timezone)) {
      currentStreak = 0;
    }

    return {
      currentStreak,
      longestStreak,
      lastCompletedDate: lastMonthStart,
      streakBreaks: []
    };
  }

  /**
   * Helper: Normalize date to start of day in user's timezone
   */
  private static normalizeDate(date: Date, timezone: string): Date {
    const zonedDate = utcToZonedTime(date, timezone);
    return startOfDay(zonedDate);
  }

  /**
   * Helper: Check if streak is recent enough to be considered current
   */
  private static isRecentStreak(lastDate: Date, timezone: string): boolean {
    const today = this.normalizeDate(new Date(), timezone);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    return isEqual(lastDate, today) || isEqual(lastDate, yesterday);
  }

  /**
   * Helper: Check if week is recent
   */
  private static isRecentWeek(weekStart: Date, timezone: string): boolean {
    const today = utcToZonedTime(new Date(), timezone);
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const lastWeekStart = new Date(currentWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    return isEqual(weekStart, currentWeekStart) || isEqual(weekStart, lastWeekStart);
  }

  /**
   * Helper: Check if month is recent
   */
  private static isRecentMonth(monthStart: Date, timezone: string): boolean {
    const today = utcToZonedTime(new Date(), timezone);
    const currentMonthStart = startOfMonth(today);
    const lastMonthStart = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - 1, 1);

    return isEqual(monthStart, currentMonthStart) || isEqual(monthStart, lastMonthStart);
  }

  /**
   * Check if completing on a specific date would extend the current streak
   */
  static async checkStreakImpact(
    habitId: string,
    completionDate: Date,
    goalType: GoalType,
    targetCount: number,
    timezone: string
  ): Promise<{
    wouldExtendStreak: boolean;
    wouldStartNewStreak: boolean;
    currentStreak: number;
  }> {
    const currentStreaks = await this.calculateStreak(habitId, goalType, targetCount, timezone);
    
    // Get existing completions including the proposed one
    const existingCompletions = await HabitCompletion.find({
      habitId,
      date: { $lte: completionDate }
    }).sort({ date: 1 });

    // Temporarily add the proposed completion
    const proposedCompletions = [...existingCompletions, { date: completionDate }];
    
    // Calculate new streak
    const streakWithCompletion = this.calculateStreakWithCompletions(
      proposedCompletions,
      goalType,
      targetCount,
      timezone
    );

    return {
      wouldExtendStreak: streakWithCompletion.currentStreak > currentStreaks.currentStreak,
      wouldStartNewStreak: currentStreaks.currentStreak === 0 && streakWithCompletion.currentStreak > 0,
      currentStreak: currentStreaks.currentStreak
    };
  }

  private static calculateStreakWithCompletions(
    completions: any[],
    goalType: GoalType,
    targetCount: number,
    timezone: string
  ): StreakResult {
    switch (goalType) {
      case 'daily':
        return this.calculateDailyStreak(completions, targetCount, timezone);
      case 'weekly':
        return this.calculateWeeklyStreak(completions, targetCount, timezone);
      case 'monthly':
        return this.calculateMonthlyStreak(completions, targetCount, timezone);
      default:
        return { currentStreak: 0, longestStreak: 0, streakBreaks: [] };
    }
  }
}