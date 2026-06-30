"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreakService = void 0;
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
const HabitCompletion_1 = require("../models/HabitCompletion");
class StreakService {
    static async calculateStreak(habitId, goalType, targetCount, userTimezone, startDate) {
        const completions = await HabitCompletion_1.HabitCompletion.find({ habitId })
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
    static calculateDailyStreak(completions, targetCount, timezone, startDate) {
        const normalizedDates = completions.map(comp => this.normalizeDate(comp.date, timezone));
        const dateCounts = new Map();
        normalizedDates.forEach(date => {
            const dateStr = date.toISOString().split('T')[0];
            dateCounts.set(dateStr, (dateCounts.get(dateStr) || 0) + 1);
        });
        let completedDates = Array.from(dateCounts.entries())
            .filter(([_, count]) => count >= targetCount)
            .map(([dateStr]) => new Date(dateStr))
            .sort((a, b) => a.getTime() - b.getTime());
        if (startDate) {
            const normalizedStart = this.normalizeDate(startDate, timezone);
            completedDates = completedDates.filter(d => !(0, date_fns_1.isBefore)(d, normalizedStart));
        }
        return this.findConsecutiveStreaks(completedDates, timezone, startDate);
    }
    static calculateWeeklyStreak(completions, targetCount, timezone, startDate) {
        const weeklyCounts = new Map();
        completions.forEach(comp => {
            const zonedDate = (0, date_fns_tz_1.toZonedTime)(comp.date, timezone);
            const weekStart = (0, date_fns_1.startOfWeek)(zonedDate, { weekStartsOn: 1 });
            const weekKey = weekStart.toISOString().split('T')[0];
            weeklyCounts.set(weekKey, (weeklyCounts.get(weekKey) || 0) + 1);
        });
        let completedWeeks = Array.from(weeklyCounts.entries())
            .filter(([_, count]) => count >= targetCount)
            .map(([weekKey]) => new Date(weekKey))
            .sort((a, b) => a.getTime() - b.getTime());
        if (startDate) {
            const normalizedStart = this.normalizeDate(startDate, timezone);
            completedWeeks = completedWeeks.filter(d => !(0, date_fns_1.isBefore)(d, normalizedStart));
        }
        return this.findConsecutiveWeeklyStreaks(completedWeeks, timezone, startDate);
    }
    static calculateMonthlyStreak(completions, targetCount, timezone, startDate) {
        const monthlyCounts = new Map();
        completions.forEach(comp => {
            const zonedDate = (0, date_fns_tz_1.toZonedTime)(comp.date, timezone);
            const monthStart = (0, date_fns_1.startOfMonth)(zonedDate);
            const monthKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;
            monthlyCounts.set(monthKey, (monthlyCounts.get(monthKey) || 0) + 1);
        });
        let completedMonths = Array.from(monthlyCounts.entries())
            .filter(([_, count]) => count >= targetCount)
            .map(([monthKey]) => {
            const [year, month] = monthKey.split('-').map(Number);
            return new Date(year, month - 1, 1);
        })
            .sort((a, b) => a.getTime() - b.getTime());
        if (startDate) {
            const normalizedStart = this.normalizeDate(startDate, timezone);
            completedMonths = completedMonths.filter(d => !(0, date_fns_1.isBefore)(d, normalizedStart));
        }
        return this.findConsecutiveMonthlyStreaks(completedMonths, timezone, startDate);
    }
    static findConsecutiveStreaks(dates, timezone, startDate) {
        if (dates.length === 0) {
            return { currentStreak: 0, longestStreak: 0, streakBreaks: [] };
        }
        const streakBreaks = [];
        const today = this.normalizeDate(new Date(), timezone);
        const pastDates = dates.filter(date => !(0, date_fns_1.isAfter)(date, today));
        if (pastDates.length === 0) {
            return { currentStreak: 0, longestStreak: 0, streakBreaks: [] };
        }
        let longestStreak = 1;
        let tempCurrentStreak = 1;
        for (let i = 1; i < pastDates.length; i++) {
            const prevDate = pastDates[i - 1];
            const currentDate = pastDates[i];
            const dayDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
            if (dayDiff === 1) {
                tempCurrentStreak++;
            }
            else {
                longestStreak = Math.max(longestStreak, tempCurrentStreak);
                const breakDate = new Date(prevDate);
                breakDate.setDate(breakDate.getDate() + 1);
                streakBreaks.push(breakDate);
                tempCurrentStreak = 1;
            }
        }
        longestStreak = Math.max(longestStreak, tempCurrentStreak);
        const lastCompleted = pastDates[pastDates.length - 1];
        const currentStreak = this.isRecentStreak(lastCompleted, timezone) ? tempCurrentStreak : 0;
        return {
            currentStreak,
            longestStreak,
            lastCompletedDate: lastCompleted,
            streakBreaks
        };
    }
    static findConsecutiveWeeklyStreaks(weekStarts, timezone, startDate) {
        if (weekStarts.length === 0) {
            return { currentStreak: 0, longestStreak: 0, streakBreaks: [] };
        }
        let longestStreak = 1;
        let tempCurrentStreak = 1;
        for (let i = 1; i < weekStarts.length; i++) {
            const prevWeek = weekStarts[i - 1];
            const currentWeek = weekStarts[i];
            const weekDiff = Math.floor((currentWeek.getTime() - prevWeek.getTime()) / (1000 * 60 * 60 * 24 * 7));
            if (weekDiff === 1) {
                tempCurrentStreak++;
            }
            else {
                longestStreak = Math.max(longestStreak, tempCurrentStreak);
                tempCurrentStreak = 1;
            }
        }
        longestStreak = Math.max(longestStreak, tempCurrentStreak);
        const lastWeekStart = weekStarts[weekStarts.length - 1];
        const currentStreak = this.isRecentWeek(lastWeekStart, timezone) ? tempCurrentStreak : 0;
        return {
            currentStreak,
            longestStreak,
            lastCompletedDate: lastWeekStart,
            streakBreaks: []
        };
    }
    static findConsecutiveMonthlyStreaks(monthStarts, timezone, startDate) {
        if (monthStarts.length === 0) {
            return { currentStreak: 0, longestStreak: 0, streakBreaks: [] };
        }
        let longestStreak = 1;
        let tempCurrentStreak = 1;
        for (let i = 1; i < monthStarts.length; i++) {
            const prevMonth = monthStarts[i - 1];
            const currentMonth = monthStarts[i];
            const monthDiff = (currentMonth.getFullYear() - prevMonth.getFullYear()) * 12 +
                (currentMonth.getMonth() - prevMonth.getMonth());
            if (monthDiff === 1) {
                tempCurrentStreak++;
            }
            else {
                longestStreak = Math.max(longestStreak, tempCurrentStreak);
                tempCurrentStreak = 1;
            }
        }
        longestStreak = Math.max(longestStreak, tempCurrentStreak);
        const lastMonthStart = monthStarts[monthStarts.length - 1];
        const currentStreak = this.isRecentMonth(lastMonthStart, timezone) ? tempCurrentStreak : 0;
        return {
            currentStreak,
            longestStreak,
            lastCompletedDate: lastMonthStart,
            streakBreaks: []
        };
    }
    static normalizeDate(date, timezone) {
        const zonedDate = (0, date_fns_tz_1.toZonedTime)(date, timezone);
        return (0, date_fns_1.startOfDay)(zonedDate);
    }
    static isRecentStreak(lastDate, timezone) {
        const today = this.normalizeDate(new Date(), timezone);
        const yesterday = (0, date_fns_1.subDays)(today, 1);
        return (0, date_fns_1.isEqual)(lastDate, today) || (0, date_fns_1.isEqual)(lastDate, yesterday);
    }
    static isRecentWeek(weekStart, timezone) {
        const today = (0, date_fns_tz_1.toZonedTime)(new Date(), timezone);
        const currentWeekStart = (0, date_fns_1.startOfWeek)(today, { weekStartsOn: 1 });
        const lastWeekStart = (0, date_fns_1.subDays)(currentWeekStart, 7);
        return (0, date_fns_1.isEqual)(weekStart, currentWeekStart) || (0, date_fns_1.isEqual)(weekStart, lastWeekStart);
    }
    static isRecentMonth(monthStart, timezone) {
        const today = (0, date_fns_tz_1.toZonedTime)(new Date(), timezone);
        const currentMonthStart = (0, date_fns_1.startOfMonth)(today);
        const lastMonthStart = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - 1, 1);
        return (0, date_fns_1.isEqual)(monthStart, currentMonthStart) || (0, date_fns_1.isEqual)(monthStart, lastMonthStart);
    }
    static async checkStreakImpact(habitId, completionDate, goalType, targetCount, timezone) {
        const currentStreaks = await this.calculateStreak(habitId, goalType, targetCount, timezone);
        const existingCompletions = await HabitCompletion_1.HabitCompletion.find({
            habitId,
            date: { $lte: completionDate }
        }).sort({ date: 1 });
        const proposedCompletions = [...existingCompletions, { date: completionDate }];
        const streakWithCompletion = this.calculateStreakWithCompletions(proposedCompletions, goalType, targetCount, timezone);
        return {
            wouldExtendStreak: streakWithCompletion.currentStreak > currentStreaks.currentStreak,
            wouldStartNewStreak: currentStreaks.currentStreak === 0 && streakWithCompletion.currentStreak > 0,
            currentStreak: currentStreaks.currentStreak
        };
    }
    static calculateStreakWithCompletions(completions, goalType, targetCount, timezone) {
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
exports.StreakService = StreakService;
//# sourceMappingURL=streakService.js.map