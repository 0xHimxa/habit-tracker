import { Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Habit, IGoalPeriod } from '../models/Habit';
import { HabitCompletion } from '../models/HabitCompletion';
import { StreakService } from '../services/streakService';
import { AuthRequest } from '../middleware/auth';
import {
  createHabitSchema,
  updateHabitSchema,
  getHabitsSchema,
  getHabitByIdSchema,
  deleteHabitSchema,
  autoBreakdownSchema,
  manualBreakdownSchema,
} from '../utils/habitValidators';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Given a year, 1-based month, and 1-based weekOfMonth, returns the Monday
 * and Sunday bounding that week-slot within the month.
 */
function computeWeekDateRange(
  year: number,
  month: number,
  weekOfMonth: number
): { start: Date; end: Date } {
  // First day of the month
  const firstOfMonth = new Date(year, month - 1, 1);
  // Day-of-week offset (0=Sun…6=Sat) — we anchor weeks on Monday
  const firstDayDow = firstOfMonth.getDay(); // 0=Sun
  const offsetToMonday = firstDayDow === 0 ? 1 : 8 - firstDayDow; // days until first Monday

  // Week 1 starts on the first Monday (or day 1 if month starts on Mon)
  const week1Monday =
    firstDayDow === 1
      ? firstOfMonth
      : new Date(year, month - 1, 1 + ((8 - firstDayDow) % 7));

  const weekStart = new Date(week1Monday);
  weekStart.setDate(week1Monday.getDate() + (weekOfMonth - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { start: weekStart, end: weekEnd };
}

function computeMonthDateRange(
  year: number,
  month: number
): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

function serializeHabit(habit: any) {
  return {
    id: habit._id.toString(),
    userId: habit.userId.toString(),
    name: habit.name,
    description: habit.description,
    goalType: habit.goalType,
    targetCount: habit.targetCount,
    startDate: habit.startDate,
    active: habit.active,
    level: habit.level ?? 'standalone',
    parentId: habit.parentId?.toString() ?? null,
    period: habit.period ?? null,
    createdAt: habit.createdAt,
    updatedAt: habit.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Create Habit / Goal
// ---------------------------------------------------------------------------

export const createHabit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const {
      name,
      description,
      goalType,
      targetCount,
      startDate,
      level,
      parentId,
      period,
    } = createHabitSchema.parse(req.body);

    // If parentId provided, verify it belongs to the user
    if (parentId) {
      const parent = await Habit.findOne({ _id: parentId, userId: req.user.id });
      if (!parent) {
        res.status(404).json({ success: false, error: 'Parent goal not found' });
        return;
      }
    }

    // Compute dateRange from period fields
    let resolvedPeriod: IGoalPeriod | undefined = period ? ({ ...period } as IGoalPeriod) : undefined;
    if (resolvedPeriod?.date) {
      resolvedPeriod.date = new Date(resolvedPeriod.date);
    }
    if (resolvedPeriod?.dateRange) {
      resolvedPeriod.dateRange = {
        start: new Date(resolvedPeriod.dateRange.start),
        end: new Date(resolvedPeriod.dateRange.end),
      };
      resolvedPeriod.year = resolvedPeriod.year ?? resolvedPeriod.dateRange.start.getFullYear();
      resolvedPeriod.month = resolvedPeriod.month ?? (resolvedPeriod.dateRange.start.getMonth() + 1);
    }
    if (resolvedPeriod?.year && resolvedPeriod?.month) {
      if (resolvedPeriod.weekOfMonth && !resolvedPeriod.dateRange) {
        resolvedPeriod.dateRange = computeWeekDateRange(
          resolvedPeriod.year,
          resolvedPeriod.month,
          resolvedPeriod.weekOfMonth
        );
      } else {
        resolvedPeriod.dateRange = computeMonthDateRange(
          resolvedPeriod.year,
          resolvedPeriod.month
        );
      }
    }

    const habit = new Habit({
      userId: req.user.id,
      name,
      description,
      goalType,
      targetCount,
      startDate: startDate ? new Date(startDate) : new Date(),
      level: level ?? 'standalone',
      parentId: parentId ? new mongoose.Types.ObjectId(parentId) : null,
      period: resolvedPeriod ?? null,
    });

    await habit.save();

    res.status(201).json({
      success: true,
      data: serializeHabit(habit),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to create habit' });
  }
};

// ---------------------------------------------------------------------------
// Get all Habits / Goals (flat list, filterable by level)
// ---------------------------------------------------------------------------

export const getHabits = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const {
      page = 1,
      limit = 20,
      goalType,
      level,
      active,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = getHabitsSchema.parse(req.query);

    const filter: any = { userId: req.user.id };
    if (goalType) filter.goalType = goalType;
    if (level) filter.level = level;
    else filter.level = { $in: ['standalone', null] }; // default: only top-level
    if (active !== undefined) filter.active = active;

    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;
    const [habits, total] = await Promise.all([
      Habit.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Habit.countDocuments(filter),
    ]);

    const habitsWithStreaks = await Promise.all(
      habits.map(async (habit: any) => {
        const streaks = await StreakService.calculateStreak(
          habit._id.toString(),
          habit.goalType,
          habit.targetCount,
          req.user!.timezone
        );
        return {
          ...serializeHabit(habit),
          currentStreak: streaks.currentStreak,
          longestStreak: streaks.longestStreak,
          lastCompletedDate: streaks.lastCompletedDate,
        };
      })
    );

    res.json({
      success: true,
      data: habitsWithStreaks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map((err) => ({ field: err.path.join('.'), message: err.message })),
      });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to fetch habits' });
  }
};

// ---------------------------------------------------------------------------
// Get all top-level month goals (with children pre-fetched)
// ---------------------------------------------------------------------------

export const getGoals = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    // Fetch all habits for this user in one query (we'll assemble tree in JS)
    const all = await Habit.find({ userId: req.user.id, active: true })
      .sort({ createdAt: 1 })
      .lean();

    const byId = new Map(all.map((h: any) => [h._id.toString(), h]));

    // Build children map
    const childrenOf = new Map<string, any[]>();
    for (const h of all) {
      if ((h as any).parentId) {
        const pid = (h as any).parentId.toString();
        if (!childrenOf.has(pid)) childrenOf.set(pid, []);
        childrenOf.get(pid)!.push(h);
      }
    }

    const monthGoals = all.filter((h: any) => h.level === 'month');

    const buildTree = (habit: any): any => {
      const children = (childrenOf.get(habit._id.toString()) || []).map(buildTree);
      return { ...serializeHabit(habit), children };
    };

    const trees = monthGoals.map(buildTree);

    res.json({ success: true, data: trees });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch goals' });
  }
};

// ---------------------------------------------------------------------------
// Get full goal tree for a single month goal
// ---------------------------------------------------------------------------

export const getGoalTree = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { habitId } = req.params;
    const root = await Habit.findOne({ _id: habitId, userId: req.user.id });
    if (!root) {
      res.status(404).json({ success: false, error: 'Goal not found' });
      return;
    }

    // Fetch the entire subtree: all habits with parentId == root, or whose parent's parent == root
    const allDescendants = await Habit.find({
      userId: req.user.id,
      $or: [
        { parentId: root._id },
        {
          parentId: {
            $in: await Habit.find({ parentId: root._id }).distinct('_id'),
          },
        },
      ],
    }).lean();

    const childrenOf = new Map<string, any[]>();
    for (const h of allDescendants) {
      const pid = (h as any).parentId.toString();
      if (!childrenOf.has(pid)) childrenOf.set(pid, []);
      childrenOf.get(pid)!.push(h);
    }

    const buildTree = (habit: any): any => {
      const children = (childrenOf.get(habit._id.toString()) || []).map(buildTree);
      return { ...serializeHabit(habit), children };
    };

    const tree = buildTree(root);
    res.json({ success: true, data: tree });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch goal tree' });
  }
};

// ---------------------------------------------------------------------------
// Auto-breakdown: create week + day sub-goals under a month goal
// ---------------------------------------------------------------------------

export const autoBreakdown = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { habitId } = req.params;
    const { weeks, dailyTarget, daysOfWeek } = autoBreakdownSchema.parse(req.body);

    const monthGoal = await Habit.findOne({
      _id: habitId,
      userId: req.user.id,
      level: 'month',
    });
    if (!monthGoal) {
      res.status(404).json({ success: false, error: 'Month goal not found' });
      return;
    }

    const { year, month } = monthGoal.period || {};
    if (!year || !month) {
      res.status(400).json({ success: false, error: 'Month goal is missing period.year/month' });
      return;
    }

    // Delete existing children first (clean re-breakdown)
    const existingWeeks = await Habit.find({ parentId: monthGoal._id });
    const weekIds = existingWeeks.map((w) => w._id);
    await Habit.deleteMany({ parentId: { $in: weekIds } }); // day children
    await Habit.deleteMany({ parentId: monthGoal._id }); // week children

    const created: any[] = [];

    for (let w = 1; w <= weeks; w++) {
      const weekRange = computeWeekDateRange(year, month, w);
      const weekTargetCount = dailyTarget * daysOfWeek.length;

      // Create week sub-goal
      const weekGoal = new Habit({
        userId: req.user.id,
        name: `${monthGoal.name} — Week ${w}`,
        description: `Week ${w} breakdown of "${monthGoal.name}"`,
        goalType: 'weekly',
        targetCount: weekTargetCount,
        startDate: weekRange.start,
        active: true,
        level: 'week',
        parentId: monthGoal._id,
        period: {
          year,
          month,
          weekOfMonth: w,
          dateRange: weekRange,
        },
      });
      await weekGoal.save();

      // Create day-level tasks under this week
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (const dow of daysOfWeek) {
        const dayTask = new Habit({
          userId: req.user.id,
          name: `${monthGoal.name} — ${dayNames[dow]}`,
          goalType: 'daily',
          targetCount: dailyTarget,
          startDate: weekRange.start,
          active: true,
          level: 'day',
          parentId: weekGoal._id,
          period: {
            year,
            month,
            weekOfMonth: w,
            daysOfWeek: [dow],
            dateRange: weekRange,
          },
        });
        await dayTask.save();
        created.push(dayTask);
      }
      created.unshift(weekGoal);
    }

    res.status(201).json({
      success: true,
      message: `Created ${weeks} week goals and ${created.length - weeks} day tasks`,
      data: created.map(serializeHabit),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to generate breakdown' });
  }
};

// ---------------------------------------------------------------------------
// Manual breakdown: user-defined week names and day tasks
// ---------------------------------------------------------------------------

export const manualBreakdown = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { habitId } = req.params;
    const { weeks: weekDrafts } = manualBreakdownSchema.parse(req.body);

    const monthGoal = await Habit.findOne({
      _id: habitId,
      userId: req.user.id,
      level: 'month',
    });
    if (!monthGoal) {
      res.status(404).json({ success: false, error: 'Month goal not found' });
      return;
    }

    const { year, month } = monthGoal.period || {};
    if (!year || !month) {
      res.status(400).json({ success: false, error: 'Month goal is missing period.year/month' });
      return;
    }

    // Delete existing children (clean re-breakdown)
    const existingWeeks = await Habit.find({ parentId: monthGoal._id });
    const weekIds = existingWeeks.map((w) => w._id);
    await Habit.deleteMany({ parentId: { $in: weekIds } });
    await Habit.deleteMany({ parentId: monthGoal._id });

    const created: any[] = [];

    for (const weekDraft of weekDrafts) {
      const weekRange = weekDraft.dateRange
        ? { start: new Date(weekDraft.dateRange.start), end: new Date(weekDraft.dateRange.end) }
        : computeWeekDateRange(year, month, weekDraft.weekOfMonth);
      const derivedWeeklyTarget =
        weekDraft.weeklyTarget ??
        (weekDraft.days.reduce((s, d) => s + d.dailyTarget * d.daysOfWeek.length, 0) || 1);


      const weekGoal = new Habit({
        userId: req.user.id,
        name: weekDraft.name,
        description: weekDraft.description,
        goalType: 'weekly',
        targetCount: derivedWeeklyTarget,
        startDate: weekRange.start,
        active: true,
        level: 'week',
        parentId: monthGoal._id,
        period: {
          year,
          month,
          weekOfMonth: weekDraft.weekOfMonth,
          dateRange: weekRange,
        },
      });
      await weekGoal.save();
      created.push(weekGoal);

      for (const dayDraft of weekDraft.days) {
        const dayTask = new Habit({
          userId: req.user.id,
          name: dayDraft.name,
          description: dayDraft.description,
          goalType: 'daily',
          targetCount: dayDraft.dailyTarget,
          startDate: weekRange.start,
          active: true,
          level: 'day',
          parentId: weekGoal._id,
          period: {
            year,
            month,
            weekOfMonth: weekDraft.weekOfMonth,
            daysOfWeek: dayDraft.daysOfWeek,
            date: dayDraft.date ? new Date(dayDraft.date) : undefined,
            dateRange: weekRange,
          },
        });
        await dayTask.save();
        created.push(dayTask);
      }
    }

    const totalWeeks = weekDrafts.length;
    const totalDays = created.length - totalWeeks;
    res.status(201).json({
      success: true,
      message: `Created ${totalWeeks} week goals and ${totalDays} day tasks`,
      data: created.map(serializeHabit),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to generate manual breakdown' });
  }
};

// ---------------------------------------------------------------------------
// Get completion counts for an entire goal subtree (month → weeks → days)
// Returns a flat map: { [habitId]: completionCount }
// ---------------------------------------------------------------------------

export const getGoalCompletionCounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { habitId } = req.params;
    const root = await Habit.findOne({ _id: habitId, userId: req.user.id });
    if (!root) {
      res.status(404).json({ success: false, error: 'Goal not found' });
      return;
    }

    // Fetch all descendants
    const weekChildren = await Habit.find({ parentId: root._id }).lean();
    const weekIds = weekChildren.map((w: any) => w._id);
    const dayChildren = await Habit.find({ parentId: { $in: weekIds } }).lean();

    const allIds = [
      root._id,
      ...weekChildren.map((w: any) => w._id),
      ...dayChildren.map((d: any) => d._id),
    ];

    // Get all completions for these habits
    const completions = await HabitCompletion.find({
      habitId: { $in: allIds },
      userId: req.user.id,
    }).lean();

    // Count per habit
    const counts: Record<string, number> = {};
    for (const c of completions) {
      const key = c.habitId.toString();
      counts[key] = (counts[key] ?? 0) + 1;
    }

    // Roll up day completions → week, week completions → month
    for (const day of dayChildren) {
      const pid = (day as any).parentId.toString();
      counts[pid] = (counts[pid] ?? 0) + (counts[(day as any)._id.toString()] ?? 0);
    }
    const monthTotal = weekChildren.reduce((s, w) => s + (counts[(w as any)._id.toString()] ?? 0), 0);
    counts[root._id.toString()] = monthTotal;

    // Build streak data for day tasks
    const streaks: Record<string, { currentStreak: number; longestStreak: number }> = {};
    await Promise.all(
      dayChildren.map(async (day: any) => {
        const s = await StreakService.calculateStreak(
          day._id.toString(),
          day.goalType,
          day.targetCount,
          req.user!.timezone
        );
        streaks[day._id.toString()] = {
          currentStreak: s.currentStreak,
          longestStreak: s.longestStreak,
        };
      })
    );

    res.json({ success: true, data: { counts, streaks } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch completion counts' });
  }
};

// ---------------------------------------------------------------------------
// Get habit by ID
// ---------------------------------------------------------------------------

export const getHabitById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { habitId } = req.params;
    const habit = await Habit.findOne({ _id: habitId, userId: req.user.id });
    if (!habit) {
      res.status(404).json({ success: false, error: 'Habit not found' });
      return;
    }

    const streaks = await StreakService.calculateStreak(
      habitId,
      habit.goalType,
      habit.targetCount,
      req.user.timezone
    );

    res.json({
      success: true,
      data: {
        ...serializeHabit(habit),
        currentStreak: streaks.currentStreak,
        longestStreak: streaks.longestStreak,
        lastCompletedDate: streaks.lastCompletedDate,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch habit' });
  }
};

// ---------------------------------------------------------------------------
// Update Habit
// ---------------------------------------------------------------------------

export const updateHabit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { habitId } = req.params;
    const updateData = updateHabitSchema.parse(req.body);

    const habit = await Habit.findOne({ _id: habitId, userId: req.user.id });
    if (!habit) {
      res.status(404).json({ success: false, error: 'Habit not found' });
      return;
    }

    Object.assign(habit, updateData);
    await habit.save();

    const streaks = await StreakService.calculateStreak(
      habitId,
      habit.goalType,
      habit.targetCount,
      req.user.timezone
    );

    res.json({
      success: true,
      data: {
        ...serializeHabit(habit),
        currentStreak: streaks.currentStreak,
        longestStreak: streaks.longestStreak,
        lastCompletedDate: streaks.lastCompletedDate,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to update habit' });
  }
};

// ---------------------------------------------------------------------------
// Delete Habit
// ---------------------------------------------------------------------------

export const deleteHabit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { habitId } = req.params;
    const habit = await Habit.findOne({ _id: habitId, userId: req.user.id });
    if (!habit) {
      res.status(404).json({ success: false, error: 'Habit not found' });
      return;
    }

    // Cascade delete: remove all children (weeks → days)
    const weekChildren = await Habit.find({ parentId: habit._id });
    const weekIds = weekChildren.map((w) => w._id);
    await Habit.deleteMany({ parentId: { $in: weekIds } }); // day tasks
    await Habit.deleteMany({ parentId: habit._id }); // week goals
    await habit.deleteOne();

    res.json({ success: true, message: 'Goal and all sub-goals deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete habit' });
  }
};
