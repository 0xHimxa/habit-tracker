"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteHabit = exports.updateHabit = exports.getHabitById = exports.getGoalCompletionCounts = exports.manualBreakdown = exports.autoBreakdown = exports.getGoalTree = exports.getGoals = exports.getHabits = exports.createHabit = void 0;
const zod_1 = require("zod");
const mongoose_1 = __importDefault(require("mongoose"));
const Habit_1 = require("../models/Habit");
const HabitCompletion_1 = require("../models/HabitCompletion");
const streakService_1 = require("../services/streakService");
const habitValidators_1 = require("../utils/habitValidators");
function computeWeekDateRange(year, month, weekOfMonth) {
    const firstOfMonth = new Date(year, month - 1, 1);
    const firstDayDow = firstOfMonth.getDay();
    const offsetToMonday = firstDayDow === 0 ? 1 : 8 - firstDayDow;
    const week1Monday = firstDayDow === 1
        ? firstOfMonth
        : new Date(year, month - 1, 1 + ((8 - firstDayDow) % 7));
    const weekStart = new Date(week1Monday);
    weekStart.setDate(week1Monday.getDate() + (weekOfMonth - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return { start: weekStart, end: weekEnd };
}
function computeMonthDateRange(year, month) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    return { start, end };
}
function serializeHabit(habit) {
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
const createHabit = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const { name, description, goalType, targetCount, startDate, level, parentId, period, } = habitValidators_1.createHabitSchema.parse(req.body);
        if (parentId) {
            const parent = await Habit_1.Habit.findOne({ _id: parentId, userId: req.user.id });
            if (!parent) {
                res.status(404).json({ success: false, error: 'Parent goal not found' });
                return;
            }
        }
        let resolvedPeriod = period ? { ...period } : undefined;
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
                resolvedPeriod.dateRange = computeWeekDateRange(resolvedPeriod.year, resolvedPeriod.month, resolvedPeriod.weekOfMonth);
            }
            else {
                resolvedPeriod.dateRange = computeMonthDateRange(resolvedPeriod.year, resolvedPeriod.month);
            }
        }
        const habit = new Habit_1.Habit({
            userId: req.user.id,
            name,
            description,
            goalType,
            targetCount,
            startDate: startDate ? new Date(startDate) : new Date(),
            level: level ?? 'standalone',
            parentId: parentId ? new mongoose_1.default.Types.ObjectId(parentId) : null,
            period: resolvedPeriod ?? null,
        });
        await habit.save();
        res.status(201).json({
            success: true,
            data: serializeHabit(habit),
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
exports.createHabit = createHabit;
const getHabits = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const { page = 1, limit = 20, goalType, level, active, sortBy = 'createdAt', sortOrder = 'desc', } = habitValidators_1.getHabitsSchema.parse(req.query);
        const filter = { userId: req.user.id };
        if (goalType)
            filter.goalType = goalType;
        if (level)
            filter.level = level;
        else
            filter.level = { $in: ['standalone', null] };
        if (active !== undefined)
            filter.active = active;
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        const skip = (page - 1) * limit;
        const [habits, total] = await Promise.all([
            Habit_1.Habit.find(filter).sort(sort).skip(skip).limit(limit).lean(),
            Habit_1.Habit.countDocuments(filter),
        ]);
        const habitsWithStreaks = await Promise.all(habits.map(async (habit) => {
            const streaks = await streakService_1.StreakService.calculateStreak(habit._id.toString(), habit.goalType, habit.targetCount, req.user.timezone);
            return {
                ...serializeHabit(habit),
                currentStreak: streaks.currentStreak,
                longestStreak: streaks.longestStreak,
                lastCompletedDate: streaks.lastCompletedDate,
            };
        }));
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
exports.getHabits = getHabits;
const getGoals = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const all = await Habit_1.Habit.find({ userId: req.user.id, active: true })
            .sort({ createdAt: 1 })
            .lean();
        const byId = new Map(all.map((h) => [h._id.toString(), h]));
        const childrenOf = new Map();
        for (const h of all) {
            if (h.parentId) {
                const pid = h.parentId.toString();
                if (!childrenOf.has(pid))
                    childrenOf.set(pid, []);
                childrenOf.get(pid).push(h);
            }
        }
        const monthGoals = all.filter((h) => h.level === 'month');
        const buildTree = (habit) => {
            const children = (childrenOf.get(habit._id.toString()) || []).map(buildTree);
            return { ...serializeHabit(habit), children };
        };
        const trees = monthGoals.map(buildTree);
        res.json({ success: true, data: trees });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch goals' });
    }
};
exports.getGoals = getGoals;
const getGoalTree = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const { habitId } = req.params;
        const root = await Habit_1.Habit.findOne({ _id: habitId, userId: req.user.id });
        if (!root) {
            res.status(404).json({ success: false, error: 'Goal not found' });
            return;
        }
        const allDescendants = await Habit_1.Habit.find({
            userId: req.user.id,
            $or: [
                { parentId: root._id },
                {
                    parentId: {
                        $in: await Habit_1.Habit.find({ parentId: root._id }).distinct('_id'),
                    },
                },
            ],
        }).lean();
        const childrenOf = new Map();
        for (const h of allDescendants) {
            const pid = h.parentId.toString();
            if (!childrenOf.has(pid))
                childrenOf.set(pid, []);
            childrenOf.get(pid).push(h);
        }
        const buildTree = (habit) => {
            const children = (childrenOf.get(habit._id.toString()) || []).map(buildTree);
            return { ...serializeHabit(habit), children };
        };
        const tree = buildTree(root);
        res.json({ success: true, data: tree });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch goal tree' });
    }
};
exports.getGoalTree = getGoalTree;
const autoBreakdown = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const { habitId } = req.params;
        const { weeks, dailyTarget, daysOfWeek } = habitValidators_1.autoBreakdownSchema.parse(req.body);
        const monthGoal = await Habit_1.Habit.findOne({
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
        const existingWeeks = await Habit_1.Habit.find({ parentId: monthGoal._id });
        const weekIds = existingWeeks.map((w) => w._id);
        await Habit_1.Habit.deleteMany({ parentId: { $in: weekIds } });
        await Habit_1.Habit.deleteMany({ parentId: monthGoal._id });
        const created = [];
        for (let w = 1; w <= weeks; w++) {
            const weekRange = computeWeekDateRange(year, month, w);
            const weekTargetCount = dailyTarget * daysOfWeek.length;
            const weekGoal = new Habit_1.Habit({
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
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            for (const dow of daysOfWeek) {
                const dayTask = new Habit_1.Habit({
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
exports.autoBreakdown = autoBreakdown;
const manualBreakdown = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const { habitId } = req.params;
        const { weeks: weekDrafts } = habitValidators_1.manualBreakdownSchema.parse(req.body);
        const monthGoal = await Habit_1.Habit.findOne({
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
        const existingWeeks = await Habit_1.Habit.find({ parentId: monthGoal._id });
        const weekIds = existingWeeks.map((w) => w._id);
        await Habit_1.Habit.deleteMany({ parentId: { $in: weekIds } });
        await Habit_1.Habit.deleteMany({ parentId: monthGoal._id });
        const created = [];
        for (const weekDraft of weekDrafts) {
            const weekRange = weekDraft.dateRange
                ? { start: new Date(weekDraft.dateRange.start), end: new Date(weekDraft.dateRange.end) }
                : computeWeekDateRange(year, month, weekDraft.weekOfMonth);
            const derivedWeeklyTarget = weekDraft.weeklyTarget ??
                (weekDraft.days.reduce((s, d) => s + d.dailyTarget * d.daysOfWeek.length, 0) || 1);
            const weekGoal = new Habit_1.Habit({
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
                const dayTask = new Habit_1.Habit({
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
exports.manualBreakdown = manualBreakdown;
const getGoalCompletionCounts = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const { habitId } = req.params;
        const root = await Habit_1.Habit.findOne({ _id: habitId, userId: req.user.id });
        if (!root) {
            res.status(404).json({ success: false, error: 'Goal not found' });
            return;
        }
        const weekChildren = await Habit_1.Habit.find({ parentId: root._id }).lean();
        const weekIds = weekChildren.map((w) => w._id);
        const dayChildren = await Habit_1.Habit.find({ parentId: { $in: weekIds } }).lean();
        const allIds = [
            root._id,
            ...weekChildren.map((w) => w._id),
            ...dayChildren.map((d) => d._id),
        ];
        const completions = await HabitCompletion_1.HabitCompletion.find({
            habitId: { $in: allIds },
            userId: req.user.id,
        }).lean();
        const counts = {};
        for (const c of completions) {
            const key = c.habitId.toString();
            counts[key] = (counts[key] ?? 0) + 1;
        }
        for (const day of dayChildren) {
            const pid = day.parentId.toString();
            counts[pid] = (counts[pid] ?? 0) + (counts[day._id.toString()] ?? 0);
        }
        const monthTotal = weekChildren.reduce((s, w) => s + (counts[w._id.toString()] ?? 0), 0);
        counts[root._id.toString()] = monthTotal;
        const streaks = {};
        await Promise.all(dayChildren.map(async (day) => {
            const s = await streakService_1.StreakService.calculateStreak(day._id.toString(), day.goalType, day.targetCount, req.user.timezone);
            streaks[day._id.toString()] = {
                currentStreak: s.currentStreak,
                longestStreak: s.longestStreak,
            };
        }));
        res.json({ success: true, data: { counts, streaks } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch completion counts' });
    }
};
exports.getGoalCompletionCounts = getGoalCompletionCounts;
const getHabitById = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const { habitId } = req.params;
        const habit = await Habit_1.Habit.findOne({ _id: habitId, userId: req.user.id });
        if (!habit) {
            res.status(404).json({ success: false, error: 'Habit not found' });
            return;
        }
        const streaks = await streakService_1.StreakService.calculateStreak(habitId, habit.goalType, habit.targetCount, req.user.timezone);
        res.json({
            success: true,
            data: {
                ...serializeHabit(habit),
                currentStreak: streaks.currentStreak,
                longestStreak: streaks.longestStreak,
                lastCompletedDate: streaks.lastCompletedDate,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch habit' });
    }
};
exports.getHabitById = getHabitById;
const updateHabit = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const { habitId } = req.params;
        const updateData = habitValidators_1.updateHabitSchema.parse(req.body);
        const habit = await Habit_1.Habit.findOne({ _id: habitId, userId: req.user.id });
        if (!habit) {
            res.status(404).json({ success: false, error: 'Habit not found' });
            return;
        }
        Object.assign(habit, updateData);
        await habit.save();
        const streaks = await streakService_1.StreakService.calculateStreak(habitId, habit.goalType, habit.targetCount, req.user.timezone);
        res.json({
            success: true,
            data: {
                ...serializeHabit(habit),
                currentStreak: streaks.currentStreak,
                longestStreak: streaks.longestStreak,
                lastCompletedDate: streaks.lastCompletedDate,
            },
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
exports.updateHabit = updateHabit;
const deleteHabit = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const { habitId } = req.params;
        const habit = await Habit_1.Habit.findOne({ _id: habitId, userId: req.user.id });
        if (!habit) {
            res.status(404).json({ success: false, error: 'Habit not found' });
            return;
        }
        const weekChildren = await Habit_1.Habit.find({ parentId: habit._id });
        const weekIds = weekChildren.map((w) => w._id);
        await Habit_1.Habit.deleteMany({ parentId: { $in: weekIds } });
        await Habit_1.Habit.deleteMany({ parentId: habit._id });
        await habit.deleteOne();
        res.json({ success: true, message: 'Goal and all sub-goals deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete habit' });
    }
};
exports.deleteHabit = deleteHabit;
//# sourceMappingURL=habits.js.map