import { Response } from 'express';
import { z } from 'zod';
import { Habit } from '../models/Habit';
import { StreakService } from '../services/streakService';
import { AuthRequest } from '../middleware/auth';
import { 
  createHabitSchema, 
  updateHabitSchema, 
  getHabitsSchema,
  getHabitByIdSchema,
  deleteHabitSchema 
} from '../utils/habitValidators';

export const createHabit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { name, description, goalType, targetCount, startDate } = createHabitSchema.parse(req.body);

    const habit = new Habit({
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
  } catch (error) {
    if (error instanceof z.ZodError) {
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
      active,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = getHabitsSchema.parse(req.query);

    // Build filter
    const filter: any = { userId: req.user.id };
    if (goalType) filter.goalType = goalType;
    if (active !== undefined) filter.active = active;

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [habits, total] = await Promise.all([
      Habit.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Habit.countDocuments(filter)
    ]);

    // Calculate streaks for each habit
    const habitsWithStreaks = await Promise.all(
      habits.map(async (habit: any) => {
        const streaks = await StreakService.calculateStreak(
          habit._id.toString(),
          habit.goalType,
          habit.targetCount,
          req.user!.timezone
        );

        return {
          ...habit,
          id: habit._id.toString(),
          currentStreak: streaks.currentStreak,
          longestStreak: streaks.longestStreak,
          lastCompletedDate: streaks.lastCompletedDate
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
        hasPrev: page > 1
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
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

export const getHabitById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { habitId } = req.params;

    const habit = await Habit.findOne({ _id: habitId, userId: req.user.id });
    if (!habit) {
      res.status(404).json({
        success: false,
        error: 'Habit not found'
      });
      return;
    }

    // Calculate streaks
    const streaks = await StreakService.calculateStreak(
      habitId,
      habit.goalType,
      habit.targetCount,
      req.user.timezone
    );

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
  } catch (error) {
    if (error instanceof z.ZodError) {
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
      res.status(404).json({
        success: false,
        error: 'Habit not found'
      });
      return;
    }

    // Update habit fields
    Object.assign(habit, updateData);
    await habit.save();

    // Calculate updated streaks
    const streaks = await StreakService.calculateStreak(
      habitId,
      habit.goalType,
      habit.targetCount,
      req.user.timezone
    );

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
  } catch (error) {
    if (error instanceof z.ZodError) {
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

export const deleteHabit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { habitId } = req.params;

    const habit = await Habit.findOne({ _id: habitId, userId: req.user.id });
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
  } catch (error) {
    if (error instanceof z.ZodError) {
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