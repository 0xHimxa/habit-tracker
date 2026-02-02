"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteHabit = exports.updateHabit = exports.getHabitById = exports.getHabits = exports.createHabit = void 0;
const zod_1 = require("zod");
const Habit_1 = require("../models/Habit");
const streakService_1 = require("../services/streakService");
const habitValidators_1 = require("../utils/habitValidators");
const createHabit = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const { name, description, goalType, targetCount, startDate } = habitValidators_1.createHabitSchema.parse(req.body);
        const habit = new Habit_1.Habit({
            userId: req.user.id,
            name,
            description,
            goalType,
            targetCount,
            startDate: startDate ? new Date(startDate) : new Date()
        });
        await habit.save();
        res.status(201).json({
            success: true,
            data: {
                id: habit._id.toString(),
                userId: habit.userId.toString(),
                name: habit.name,
                description: habit.description,
                goalType: habit.goalType,
                targetCount: habit.targetCount,
                startDate: habit.startDate,
                active: habit.active,
                createdAt: habit.createdAt,
                updatedAt: habit.updatedAt
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
            error: 'Failed to create habit'
        });
    }
};
exports.createHabit = createHabit;
const getHabits = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const { page = 1, limit = 20, goalType, active, sortBy = 'createdAt', sortOrder = 'desc' } = habitValidators_1.getHabitsSchema.parse(req.query);
        const filter = { userId: req.user.id };
        if (goalType)
            filter.goalType = goalType;
        if (active !== undefined)
            filter.active = active;
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        const skip = (page - 1) * limit;
        const [habits, total] = await Promise.all([
            Habit_1.Habit.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Habit_1.Habit.countDocuments(filter)
        ]);
        const habitsWithStreaks = await Promise.all(habits.map(async (habit) => {
            const streaks = await streakService_1.StreakService.calculateStreak(habit._id.toString(), habit.goalType, habit.targetCount, req.user.timezone);
            return {
                ...habit,
                id: habit._id.toString(),
                currentStreak: streaks.currentStreak,
                longestStreak: streaks.longestStreak,
                lastCompletedDate: streaks.lastCompletedDate
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
            error: 'Failed to fetch habits'
        });
    }
};
exports.getHabits = getHabits;
const getHabitById = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const { habitId } = req.params;
        const habit = await Habit_1.Habit.findOne({ _id: habitId, userId: req.user.id });
        if (!habit) {
            res.status(404).json({
                success: false,
                error: 'Habit not found'
            });
            return;
        }
        const streaks = await streakService_1.StreakService.calculateStreak(habitId, habit.goalType, habit.targetCount, req.user.timezone);
        res.json({
            success: true,
            data: {
                id: habit._id.toString(),
                userId: habit.userId.toString(),
                name: habit.name,
                description: habit.description,
                goalType: habit.goalType,
                targetCount: habit.targetCount,
                startDate: habit.startDate,
                active: habit.active,
                currentStreak: streaks.currentStreak,
                longestStreak: streaks.longestStreak,
                lastCompletedDate: streaks.lastCompletedDate,
                createdAt: habit.createdAt,
                updatedAt: habit.updatedAt
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
            error: 'Failed to fetch habit'
        });
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
            res.status(404).json({
                success: false,
                error: 'Habit not found'
            });
            return;
        }
        Object.assign(habit, updateData);
        await habit.save();
        const streaks = await streakService_1.StreakService.calculateStreak(habitId, habit.goalType, habit.targetCount, req.user.timezone);
        res.json({
            success: true,
            data: {
                id: habit._id.toString(),
                userId: habit.userId.toString(),
                name: habit.name,
                description: habit.description,
                goalType: habit.goalType,
                targetCount: habit.targetCount,
                startDate: habit.startDate,
                active: habit.active,
                currentStreak: streaks.currentStreak,
                longestStreak: streaks.longestStreak,
                lastCompletedDate: streaks.lastCompletedDate,
                createdAt: habit.createdAt,
                updatedAt: habit.updatedAt
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
            error: 'Failed to update habit'
        });
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
            res.status(404).json({
                success: false,
                error: 'Habit not found'
            });
            return;
        }
        await habit.deleteOne();
        res.json({
            success: true,
            message: 'Habit deleted successfully'
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
            error: 'Failed to delete habit'
        });
    }
};
exports.deleteHabit = deleteHabit;
//# sourceMappingURL=habits.js.map