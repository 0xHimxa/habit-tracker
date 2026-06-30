"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalytics = void 0;
const Habit_1 = require("../models/Habit");
const HabitCompletion_1 = require("../models/HabitCompletion");
const streakService_1 = require("../services/streakService");
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
const getAnalytics = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const userId = req.user.id;
        const timezone = req.user.timezone || 'UTC';
        const todayUTC = new Date();
        const today = (0, date_fns_tz_1.toZonedTime)(todayUTC, timezone);
        const habits = await Habit_1.Habit.find({ userId, active: true }).lean();
        const weekStart = (0, date_fns_1.startOfDay)((0, date_fns_1.subDays)(today, 6));
        const weekEnd = (0, date_fns_1.endOfDay)(today);
        const weeklyCompletions = await HabitCompletion_1.HabitCompletion.find({
            userId,
            habitId: { $in: habits.map(h => h._id) },
            date: { $gte: weekStart, $lte: weekEnd }
        }).lean();
        const monthStart = (0, date_fns_1.startOfMonth)(today);
        const monthEnd = (0, date_fns_1.endOfMonth)(today);
        const monthlyCompletions = await HabitCompletion_1.HabitCompletion.find({
            userId,
            habitId: { $in: habits.map(h => h._id) },
            date: { $gte: monthStart, $lte: monthEnd }
        }).lean();
        const allCompletions = await HabitCompletion_1.HabitCompletion.find({
            userId,
            habitId: { $in: habits.map(h => h._id) }
        }).lean();
        const last7Days = (0, date_fns_1.eachDayOfInterval)({
            start: (0, date_fns_1.subDays)(today, 6),
            end: today
        });
        const weeklyProgress = last7Days.map(day => {
            const dayStart = (0, date_fns_1.startOfDay)(day);
            const dayEnd = (0, date_fns_1.endOfDay)(day);
            const dayCompletions = weeklyCompletions.filter(c => {
                const completionDate = (0, date_fns_tz_1.toZonedTime)(new Date(c.date), timezone);
                return completionDate >= dayStart && completionDate <= dayEnd;
            });
            return {
                day: (0, date_fns_1.format)(day, 'EEE'),
                date: (0, date_fns_1.format)(day, 'yyyy-MM-dd'),
                completed: dayCompletions.length,
                total: habits.filter(h => h.goalType === 'daily').length
            };
        });
        const completionsByHabit = new Map();
        allCompletions.forEach(c => {
            const key = c.habitId.toString();
            if (!completionsByHabit.has(key))
                completionsByHabit.set(key, []);
            completionsByHabit.get(key).push(c);
        });
        const habitPerformance = await Promise.all(habits.map(async (habit) => {
            const streaks = await streakService_1.StreakService.calculateStreak(habit._id.toString(), habit.goalType, habit.targetCount, timezone);
            const habitMonthlyCompletions = monthlyCompletions.filter(c => c.habitId.toString() === habit._id.toString()).length;
            const today_date = today.getDate();
            const daysElapsed = today_date;
            const weeksElapsed = Math.ceil(daysElapsed / 7);
            let expectedCompletions = 0;
            if (habit.goalType === 'daily') {
                expectedCompletions = daysElapsed * habit.targetCount;
            }
            else if (habit.goalType === 'weekly') {
                expectedCompletions = weeksElapsed * habit.targetCount;
            }
            else {
                expectedCompletions = habit.targetCount;
            }
            const completionRate = expectedCompletions > 0
                ? Math.min(habitMonthlyCompletions / expectedCompletions, 1)
                : 0;
            return {
                id: habit._id.toString(),
                name: habit.name,
                goalType: habit.goalType,
                completion: completionRate,
                currentStreak: streaks.currentStreak,
                longestStreak: streaks.longestStreak
            };
        }));
        const goalTypeDistribution = [
            {
                type: 'Daily',
                count: habits.filter(h => h.goalType === 'daily').length,
                color: '#8B5CF6'
            },
            {
                type: 'Weekly',
                count: habits.filter(h => h.goalType === 'weekly').length,
                color: '#06B6D4'
            },
            {
                type: 'Monthly',
                count: habits.filter(h => h.goalType === 'monthly').length,
                color: '#F59E0B'
            },
        ].filter(item => item.count > 0);
        const monthlyTrendWeeks = [];
        let weekCursor = (0, date_fns_1.startOfWeek)(monthStart, { weekStartsOn: 1 });
        let weekNum = 1;
        while (weekCursor <= monthEnd) {
            const weekEndDate = (0, date_fns_1.endOfWeek)(weekCursor, { weekStartsOn: 1 });
            const clampedStart = weekCursor < monthStart ? monthStart : weekCursor;
            const clampedEnd = weekEndDate > monthEnd ? monthEnd : weekEndDate;
            const weekCompletions = monthlyCompletions.filter(c => {
                const date = (0, date_fns_tz_1.toZonedTime)(new Date(c.date), timezone);
                return date >= clampedStart && date <= clampedEnd;
            });
            const dailyHabits = habits.filter(h => h.goalType === 'daily');
            const daysInWeek = (0, date_fns_1.differenceInDays)(clampedEnd, clampedStart) + 1;
            const expectedCompletions = dailyHabits.reduce((sum, h) => sum + h.targetCount * daysInWeek, 0);
            const completionRate = expectedCompletions > 0
                ? Math.round((weekCompletions.length / expectedCompletions) * 100)
                : 0;
            monthlyTrendWeeks.push({
                week: `Week ${weekNum}`,
                completion: Math.min(completionRate, 100)
            });
            weekCursor = (0, date_fns_1.addWeeks)(weekCursor, 1);
            weekNum++;
        }
        const topStreaks = [...habitPerformance]
            .sort((a, b) => b.currentStreak - a.currentStreak)
            .slice(0, 5)
            .map(h => ({
            name: h.name,
            streak: h.currentStreak
        }));
        const todayDateStr = (0, date_fns_1.format)(today, 'yyyy-MM-dd');
        const totalCompletionsToday = weeklyCompletions.filter(c => {
            const cDate = (0, date_fns_1.format)((0, date_fns_tz_1.toZonedTime)(new Date(c.date), timezone), 'yyyy-MM-dd');
            return cDate === todayDateStr;
        }).length;
        const habitsOnStreak = habitPerformance.filter(h => h.currentStreak > 0).length;
        const habitsAtRisk = habitPerformance.filter(h => {
            return h.currentStreak === 0 && h.completion > 0;
        }).length;
        res.json({
            success: true,
            data: {
                weeklyProgress,
                habitPerformance,
                goalTypeDistribution,
                monthlyTrend: monthlyTrendWeeks,
                topStreaks,
                summary: {
                    totalHabits: habits.length,
                    activeHabits: habits.length,
                    habitsOnStreak,
                    habitsAtRisk,
                    todayCompletions: totalCompletionsToday,
                    weeklyCompletionRate: weeklyProgress.length > 0
                        ? Math.round(weeklyProgress.reduce((sum, d) => sum + (d.total > 0 ? d.completed / d.total : 0), 0) / weeklyProgress.length * 100)
                        : 0
                }
            }
        });
    }
    catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch analytics'
        });
    }
};
exports.getAnalytics = getAnalytics;
//# sourceMappingURL=analytics.js.map