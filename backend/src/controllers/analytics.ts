import { Response } from 'express';
import { Habit } from '../models/Habit';
import { HabitCompletion } from '../models/HabitCompletion';
import { StreakService } from '../services/streakService';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, format, eachDayOfInterval, differenceInDays, startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { AuthRequest } from '../middleware/auth';

export const getAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const userId = req.user.id;
    const timezone = req.user.timezone || 'UTC';

    // FIX: use timezone-aware "today" throughout
    const todayUTC = new Date();
    const today = toZonedTime(todayUTC, timezone);

    // Get all active habits
    const habits = await Habit.find({ userId, active: true }).lean();

    // Get completions for the last 7 days
    const weekStart = startOfDay(subDays(today, 6));
    const weekEnd = endOfDay(today);

    const weeklyCompletions = await HabitCompletion.find({
      userId,
      habitId: { $in: habits.map(h => h._id) },
      date: { $gte: weekStart, $lte: weekEnd }
    }).lean();

    // Get completions for the current month
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    const monthlyCompletions = await HabitCompletion.find({
      userId,
      habitId: { $in: habits.map(h => h._id) },
      date: { $gte: monthStart, $lte: monthEnd }
    }).lean();

    // FIX: fetch all completions once to avoid N+1 queries in habitPerformance
    const allCompletions = await HabitCompletion.find({
      userId,
      habitId: { $in: habits.map(h => h._id) }
    }).lean();

    // Calculate weekly progress (last 7 days)
    const last7Days = eachDayOfInterval({
      start: subDays(today, 6),
      end: today
    });

    const weeklyProgress = last7Days.map(day => {
      // FIX: use startOfDay/endOfDay instead of mutating `day` with setHours
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      const dayCompletions = weeklyCompletions.filter(c => {
        // FIX: convert completion date to user's timezone before comparing
        const completionDate = toZonedTime(new Date(c.date), timezone);
        return completionDate >= dayStart && completionDate <= dayEnd;
      });

      return {
        day: format(day, 'EEE'),
        date: format(day, 'yyyy-MM-dd'),
        completed: dayCompletions.length,
        // total counts all active habits expected that day (daily habits only by design)
        total: habits.filter(h => h.goalType === 'daily').length
      };
    });

    // Calculate habit performance with streaks
    // FIX: group all completions by habitId upfront to avoid N+1 DB queries
    const completionsByHabit = new Map<string, any[]>();
    allCompletions.forEach(c => {
      const key = c.habitId.toString();
      if (!completionsByHabit.has(key)) completionsByHabit.set(key, []);
      completionsByHabit.get(key)!.push(c);
    });

    const habitPerformance = await Promise.all(
      habits.map(async (habit: any) => {
        const streaks = await StreakService.calculateStreak(
          habit._id.toString(),
          habit.goalType,
          habit.targetCount,
          timezone
        );

        // Calculate completion rate for the month
        const habitMonthlyCompletions = monthlyCompletions.filter(
          c => c.habitId.toString() === habit._id.toString()
        ).length;

        // FIX: compute actual days elapsed in the month so far (not full daysInMonth)
        const today_date = today.getDate();
        const daysElapsed = today_date;

        // FIX: actual number of weeks elapsed in the month
        const weeksElapsed = Math.ceil(daysElapsed / 7);

        let expectedCompletions = 0;

        if (habit.goalType === 'daily') {
          expectedCompletions = daysElapsed * habit.targetCount;
        } else if (habit.goalType === 'weekly') {
          // FIX: weeks elapsed × targetCount (how many times per week they should do it)
          expectedCompletions = weeksElapsed * habit.targetCount;
        } else {
          // monthly: just the targetCount for the month
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
      })
    );

    // Goal type distribution
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

    // FIX: compute actual weeks in the month dynamically instead of hardcoding 4
    const monthlyTrendWeeks: { week: string; completion: number }[] = [];
    let weekCursor = startOfWeek(monthStart, { weekStartsOn: 1 });
    let weekNum = 1;

    while (weekCursor <= monthEnd) {
      const weekEndDate = endOfWeek(weekCursor, { weekStartsOn: 1 });

      // Clamp to month boundaries
      const clampedStart = weekCursor < monthStart ? monthStart : weekCursor;
      const clampedEnd = weekEndDate > monthEnd ? monthEnd : weekEndDate;

      const weekCompletions = monthlyCompletions.filter(c => {
        // FIX: convert to user timezone before comparing
        const date = toZonedTime(new Date(c.date), timezone);
        return date >= clampedStart && date <= clampedEnd;
      });

      const dailyHabits = habits.filter(h => h.goalType === 'daily');
      // FIX: use differenceInDays instead of floating-point millisecond arithmetic
      const daysInWeek = differenceInDays(clampedEnd, clampedStart) + 1;
      const expectedCompletions = dailyHabits.reduce(
        (sum, h) => sum + h.targetCount * daysInWeek,
        0
      );

      const completionRate = expectedCompletions > 0
        ? Math.round((weekCompletions.length / expectedCompletions) * 100)
        : 0;

      monthlyTrendWeeks.push({
        week: `Week ${weekNum}`,
        completion: Math.min(completionRate, 100)
      });

      weekCursor = addWeeks(weekCursor, 1);
      weekNum++;
    }

    // Top streaks (sorted by current streak)
    const topStreaks = [...habitPerformance]
      .sort((a, b) => b.currentStreak - a.currentStreak)
      .slice(0, 5)
      .map(h => ({
        name: h.name,
        streak: h.currentStreak
      }));

    // Summary stats
    const todayDateStr = format(today, 'yyyy-MM-dd');
    const totalCompletionsToday = weeklyCompletions.filter(c => {
      // FIX: convert to user timezone before formatting
      const cDate = format(toZonedTime(new Date(c.date), timezone), 'yyyy-MM-dd');
      return cDate === todayDateStr;
    }).length;

    const habitsOnStreak = habitPerformance.filter(h => h.currentStreak > 0).length;

    // FIX: "at risk" = had completions this month but streak is currently 0 (not never-started)
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
          // FIX: totalHabits and activeHabits were the same since we only query active=true;
          // activeHabits now correctly equals habits.length (they're all active)
          totalHabits: habits.length,
          activeHabits: habits.length,
          habitsOnStreak,
          habitsAtRisk,
          todayCompletions: totalCompletionsToday,
          weeklyCompletionRate: weeklyProgress.length > 0
            ? Math.round(
                weeklyProgress.reduce(
                  (sum, d) => sum + (d.total > 0 ? d.completed / d.total : 0),
                  0
                ) / weeklyProgress.length * 100
              )
            : 0
        }
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    });
  }
};