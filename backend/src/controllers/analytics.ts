import { Response } from 'express';
import { Habit } from '../models/Habit';
import { HabitCompletion } from '../models/HabitCompletion';
import { StreakService } from '../services/streakService';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, format, eachDayOfInterval } from 'date-fns';
import { AuthRequest } from '../middleware/auth';

export const getAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const userId = req.user.id;
    const timezone = req.user.timezone || 'UTC';
    const today = new Date();

    // Get all active habits
    const habits = await Habit.find({ userId, active: true }).lean();

    // Get completions for the current week
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    
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

    // Calculate weekly progress (last 7 days)
    const last7Days = eachDayOfInterval({
      start: subDays(today, 6),
      end: today
    });

    const weeklyProgress = last7Days.map(day => {
      const dayStart = new Date(day.setHours(0, 0, 0, 0));
      const dayEnd = new Date(day.setHours(23, 59, 59, 999));
      
      const dayCompletions = weeklyCompletions.filter(c => {
        const completionDate = new Date(c.date);
        return completionDate >= dayStart && completionDate <= dayEnd;
      });

      return {
        day: format(day, 'EEE'),
        date: format(day, 'yyyy-MM-dd'),
        completed: dayCompletions.length,
        total: habits.filter(h => h.goalType === 'daily').length
      };
    });

    // Calculate habit performance with streaks
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

        const daysInMonth = monthEnd.getDate();
        let expectedCompletions = 0;
        
        if (habit.goalType === 'daily') {
          expectedCompletions = daysInMonth * habit.targetCount;
        } else if (habit.goalType === 'weekly') {
          expectedCompletions = 4 * habit.targetCount; // ~4 weeks per month
        } else {
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

    // Monthly trend (by week)
    const weeks = [1, 2, 3, 4].map(weekNum => {
      const weekStartDate = new Date(monthStart);
      weekStartDate.setDate(weekStartDate.getDate() + (weekNum - 1) * 7);
      
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      
      // Clamp to month boundaries
      const clampedStart = weekStartDate < monthStart ? monthStart : weekStartDate;
      const clampedEnd = weekEndDate > monthEnd ? monthEnd : weekEndDate;
      
      const weekCompletions = monthlyCompletions.filter(c => {
        const date = new Date(c.date);
        return date >= clampedStart && date <= clampedEnd;
      });

      const dailyHabits = habits.filter(h => h.goalType === 'daily');
      const daysInWeek = Math.min(7, (clampedEnd.getTime() - clampedStart.getTime()) / (1000 * 60 * 60 * 24) + 1);
      const expectedCompletions = dailyHabits.reduce((sum, h) => sum + h.targetCount * daysInWeek, 0);
      
      const completionRate = expectedCompletions > 0 
        ? Math.round((weekCompletions.length / expectedCompletions) * 100) 
        : 0;

      return {
        week: `Week ${weekNum}`,
        completion: Math.min(completionRate, 100)
      };
    });

    // Top streaks (sorted by current streak)
    const topStreaks = habitPerformance
      .sort((a, b) => b.currentStreak - a.currentStreak)
      .slice(0, 5)
      .map(h => ({
        name: h.name,
        streak: h.currentStreak
      }));

    // Summary stats
    const totalCompletionsToday = weeklyCompletions.filter(c => {
      const cDate = format(new Date(c.date), 'yyyy-MM-dd');
      const tDate = format(today, 'yyyy-MM-dd');
      return cDate === tDate;
    }).length;

    const habitsOnStreak = habitPerformance.filter(h => h.currentStreak > 0).length;
    const habitsAtRisk = habitPerformance.filter(h => h.currentStreak === 0 && h.completion < 0.5).length;

    res.json({
      success: true,
      data: {
        weeklyProgress,
        habitPerformance,
        goalTypeDistribution,
        monthlyTrend: weeks,
        topStreaks,
        summary: {
          totalHabits: habits.length,
          activeHabits: habits.filter(h => h.active).length,
          habitsOnStreak,
          habitsAtRisk,
          todayCompletions: totalCompletionsToday,
          weeklyCompletionRate: weeklyProgress.length > 0
            ? Math.round(weeklyProgress.reduce((sum, d) => sum + (d.total > 0 ? d.completed / d.total : 0), 0) / weeklyProgress.length * 100)
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
