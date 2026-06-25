"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCalendarData = exports.getCompletionsByDateRange = exports.deleteCompletion = exports.getCompletions = exports.createCompletion = void 0;
const zod_1 = require("zod");
const Habit_1 = require("../models/Habit");
const HabitCompletion_1 = require("../models/HabitCompletion");
const streakService_1 = require("../services/streakService");
const date_fns_tz_1 = require("date-fns-tz");
const date_fns_1 = require("date-fns");
const completionValidators_1 = require("../utils/completionValidators");
const createCompletion = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const { habitId, date: completionDate } = completionValidators_1.createCompletionSchema.parse(req.body);
        const habit = await Habit_1.Habit.findOne({ _id: habitId, userId: req.user.id, active: true });
        if (!habit) {
            res.status(404).json({
                success: false,
                error: 'Active habit not found'
            });
            return;
        }
        const dateToUse = completionDate ? new Date(completionDate) : new Date();
        const normalizedDate = (0, date_fns_1.startOfDay)((0, date_fns_tz_1.toZonedTime)(dateToUse, req.user.timezone));
        const existingCompletion = await HabitCompletion_1.HabitCompletion.findOne({
            habitId,
            userId: req.user.id,
            date: normalizedDate
        });
        if (existingCompletion) {
            res.status(409).json({
                success: false,
                error: 'Completion already exists for this date',
                code: 'DUPLICATE_COMPLETION'
            });
            return;
        }
        const today = (0, date_fns_1.startOfDay)((0, date_fns_tz_1.toZonedTime)(new Date(), req.user.timezone));
        if (normalizedDate > today) {
            res.status(400).json({
                success: false,
                error: 'Cannot create completions for future dates',
                code: 'FUTURE_DATE'
            });
            return;
        }
        const completion = new HabitCompletion_1.HabitCompletion({
            habitId,
            userId: req.user.id,
            date: normalizedDate,
            completedAt: new Date()
        });
        await completion.save();
        const streaks = await streakService_1.StreakService.calculateStreak(habitId, habit.goalType, habit.targetCount, req.user.timezone);
        res.status(201).json({
            success: true,
            data: {
                id: completion._id.toString(),
                habitId: completion.habitId.toString(),
                userId: completion.userId.toString(),
                date: completion.date,
                completedAt: completion.completedAt,
                createdAt: completion.createdAt,
                streaks: {
                    currentStreak: streaks.currentStreak,
                    longestStreak: streaks.longestStreak
                }
            }
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const validationErrors = error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message
            }));
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validationErrors
            });
            return;
        }
        res.status(500).json({
            success: false,
            error: 'Failed to create completion'
        });
    }
};
exports.createCompletion = createCompletion;
const getCompletions = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const { habitId } = req.params;
        const { startDate, endDate, page = 1, limit = 50 } = completionValidators_1.getCompletionsSchema.parse(req.query);
        const habit = await Habit_1.Habit.findOne({ _id: habitId, userId: req.user.id });
        if (!habit) {
            res.status(404).json({
                success: false,
                error: 'Habit not found'
            });
            return;
        }
        const filter = { habitId, userId: req.user.id };
        if (startDate && endDate) {
            filter.date = {
                $gte: (0, date_fns_1.startOfDay)(new Date(startDate)),
                $lte: (0, date_fns_1.endOfDay)(new Date(endDate))
            };
        }
        const skip = (page - 1) * limit;
        const [completions, total] = await Promise.all([
            HabitCompletion_1.HabitCompletion.find(filter)
                .sort({ date: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            HabitCompletion_1.HabitCompletion.countDocuments(filter)
        ]);
        const completionsData = completions.map(completion => ({
            ...completion,
            id: completion._id.toString(),
            habitId: completion.habitId.toString(),
            userId: completion.userId.toString()
        }));
        res.json({
            success: true,
            data: completionsData,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            }
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const validationErrors = error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message
            }));
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validationErrors
            });
            return;
        }
        res.status(500).json({
            success: false,
            error: 'Failed to fetch completions'
        });
    }
};
exports.getCompletions = getCompletions;
const deleteCompletion = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const { completionId } = req.params;
        const completion = await HabitCompletion_1.HabitCompletion.findOne({
            _id: completionId,
            userId: req.user.id
        });
        if (!completion) {
            res.status(404).json({
                success: false,
                error: 'Completion not found'
            });
            return;
        }
        const habit = await Habit_1.Habit.findById(completion.habitId);
        if (!habit) {
            res.status(404).json({
                success: false,
                error: 'Associated habit not found'
            });
            return;
        }
        await completion.deleteOne();
        const streaks = await streakService_1.StreakService.calculateStreak(completion.habitId.toString(), habit.goalType, habit.targetCount, req.user.timezone);
        res.json({
            success: true,
            message: 'Completion deleted successfully',
            data: {
                streaks: {
                    currentStreak: streaks.currentStreak,
                    longestStreak: streaks.longestStreak
                }
            }
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const validationErrors = error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message
            }));
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validationErrors
            });
            return;
        }
        res.status(500).json({
            success: false,
            error: 'Failed to delete completion'
        });
    }
};
exports.deleteCompletion = deleteCompletion;
const getCompletionsByDateRange = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const { startDate, endDate, habitIds } = completionValidators_1.getCompletionsByDateRangeSchema.parse(req.query);
        const filter = {
            userId: req.user.id,
            date: {
                $gte: (0, date_fns_1.startOfDay)(new Date(startDate)),
                $lte: (0, date_fns_1.endOfDay)(new Date(endDate))
            }
        };
        if (habitIds && habitIds.length > 0) {
            filter.habitId = { $in: habitIds };
        }
        const completions = await HabitCompletion_1.HabitCompletion.find(filter)
            .populate('habitId', 'name goalType targetCount')
            .sort({ date: -1 })
            .lean();
        const completionsData = completions.map((completion) => ({
            id: completion._id.toString(),
            habitId: completion.habitId._id.toString(),
            userId: completion.userId.toString(),
            date: completion.date,
            completedAt: completion.completedAt,
            habit: {
                name: completion.habitId.name,
                goalType: completion.habitId.goalType,
                targetCount: completion.habitId.targetCount
            }
        }));
        res.json({
            success: true,
            data: completionsData
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const validationErrors = error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message
            }));
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validationErrors
            });
            return;
        }
        res.status(500).json({
            success: false,
            error: 'Failed to fetch completions'
        });
    }
};
exports.getCompletionsByDateRange = getCompletionsByDateRange;
const getCalendarData = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const { year, month } = req.query;
        if (!year || !month) {
            res.status(400).json({
                success: false,
                error: 'Year and month parameters are required'
            });
            return;
        }
        const yearNum = parseInt(year);
        const monthNum = parseInt(month) - 1;
        if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 0 || monthNum > 11) {
            res.status(400).json({
                success: false,
                error: 'Invalid year or month'
            });
            return;
        }
        const habits = await Habit_1.Habit.find({
            userId: req.user.id,
            active: true
        }).select('_id name goalType targetCount').lean();
        if (habits.length === 0) {
            res.json({
                success: true,
                data: {
                    year: yearNum,
                    month: monthNum + 1,
                    days: []
                }
            });
            return;
        }
        const habitIds = habits.map(h => h._id);
        const monthStart = new Date(yearNum, monthNum, 1);
        const monthEnd = new Date(yearNum, monthNum + 1, 0);
        const completions = await HabitCompletion_1.HabitCompletion.find({
            userId: req.user.id,
            habitId: { $in: habitIds },
            date: {
                $gte: (0, date_fns_1.startOfDay)(monthStart),
                $lte: (0, date_fns_1.endOfDay)(monthEnd)
            }
        }).populate('habitId', 'name goalType targetCount')
            .sort({ date: 1 })
            .lean();
        const completionsByDate = new Map();
        completions.forEach((completion) => {
            const dateKey = completion.date.toISOString().split('T')[0];
            if (!completionsByDate.has(dateKey)) {
                completionsByDate.set(dateKey, []);
            }
            completionsByDate.get(dateKey).push({
                id: completion._id.toString(),
                habitId: completion.habitId._id.toString(),
                habitName: completion.habitId.name,
                goalType: completion.habitId.goalType,
                targetCount: completion.habitId.targetCount,
                completedAt: completion.completedAt
            });
        });
        const days = [];
        const daysInMonth = monthEnd.getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(yearNum, monthNum, day);
            const dateKey = date.toISOString().split('T')[0];
            const dayCompletions = completionsByDate.get(dateKey) || [];
            const habitStatuses = habits.map(habit => {
                const habitCompletions = dayCompletions.filter((c) => c.habitId === habit._id.toString());
                const isCompleted = habitCompletions.length >= habit.targetCount;
                const completionCount = habitCompletions.length;
                return {
                    habitId: habit._id.toString(),
                    habitName: habit.name,
                    goalType: habit.goalType,
                    targetCount: habit.targetCount,
                    isCompleted,
                    completionCount,
                    completions: habitCompletions
                };
            });
            days.push({
                date: dateKey,
                day,
                isToday: dateKey === new Date().toISOString().split('T')[0],
                isPast: date.toISOString().split('T')[0] < new Date().toISOString().split('T')[0],
                totalHabits: habits.length,
                completedHabits: habitStatuses.filter(h => h.isCompleted).length,
                habitStatuses
            });
        }
        res.json({
            success: true,
            data: {
                year: yearNum,
                month: monthNum + 1,
                habits: habits.map(h => ({
                    id: h._id.toString(),
                    name: h.name,
                    goalType: h.goalType,
                    targetCount: h.targetCount
                })),
                days
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch calendar data'
        });
    }
};
exports.getCalendarData = getCalendarData;
//# sourceMappingURL=completions.js.map