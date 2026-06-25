import { Response } from 'express';
import { z } from 'zod';
import { Habit } from '../models/Habit';
import { HabitCompletion } from '../models/HabitCompletion';
import { StreakService } from '../services/streakService';
import { toZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay } from 'date-fns';
import { AuthRequest } from '../middleware/auth';
import { 
  createCompletionSchema, 
  getCompletionsSchema, 
  deleteCompletionSchema,
  getCompletionsByDateRangeSchema 
} from '../utils/completionValidators';

export const createCompletion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { habitId, date: completionDate } = createCompletionSchema.parse(req.body);

    // Verify habit exists and belongs to user
    const habit = await Habit.findOne({ _id: habitId, userId: req.user.id, active: true });
    if (!habit) {
      res.status(404).json({
        success: false,
        error: 'Active habit not found'
      });
      return;
    }

    // Normalize date to start of day in user's timezone
    const dateToUse = completionDate ? new Date(completionDate) : new Date();
    const normalizedDate = startOfDay(toZonedTime(dateToUse, req.user.timezone));

    // Check if completion already exists for this date
    const existingCompletion = await HabitCompletion.findOne({
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

    // Don't allow completions for future dates
    const today = startOfDay(toZonedTime(new Date(), req.user.timezone));
    if (normalizedDate > today) {
      res.status(400).json({
        success: false,
        error: 'Cannot create completions for future dates',
        code: 'FUTURE_DATE'
      });
      return;
    }

    // Create completion
    const completion = new HabitCompletion({
      habitId,
      userId: req.user.id,
      date: normalizedDate,
      completedAt: new Date()
    });

    await completion.save();

    // Calculate updated streaks
    const streaks = await StreakService.calculateStreak(
      habitId,
      habit.goalType,
      habit.targetCount,
      req.user.timezone
    );

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
      error: 'Failed to create completion'
    });
  }
};

export const getCompletions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { habitId } = req.params;
    const {
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = getCompletionsSchema.parse(req.query);

    // Verify habit belongs to user
    const habit = await Habit.findOne({ _id: habitId, userId: req.user.id });
    if (!habit) {
      res.status(404).json({
        success: false,
        error: 'Habit not found'
      });
      return;
    }

    // Build filter
    const filter: any = { habitId, userId: req.user.id };
    
    if (startDate && endDate) {
      filter.date = {
        $gte: startOfDay(new Date(startDate)),
        $lte: endOfDay(new Date(endDate))
      };
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [completions, total] = await Promise.all([
      HabitCompletion.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      HabitCompletion.countDocuments(filter)
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
      error: 'Failed to fetch completions'
    });
  }
};

export const deleteCompletion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { completionId } = req.params;

    const completion = await HabitCompletion.findOne({ 
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

    // Get habit before deleting completion for streak recalculation
    const habit = await Habit.findById(completion.habitId);
    if (!habit) {
      res.status(404).json({
        success: false,
        error: 'Associated habit not found'
      });
      return;
    }

    await completion.deleteOne();

    // Calculate updated streaks
    const streaks = await StreakService.calculateStreak(
      completion.habitId.toString(),
      habit.goalType,
      habit.targetCount,
      req.user.timezone
    );

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
      error: 'Failed to delete completion'
    });
  }
};

export const getCompletionsByDateRange = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { startDate, endDate, habitIds } = getCompletionsByDateRangeSchema.parse(req.query);

    // Build filter
    const filter: any = {
      userId: req.user.id,
      date: {
        $gte: startOfDay(new Date(startDate)),
        $lte: endOfDay(new Date(endDate))
      }
    };

    if (habitIds && habitIds.length > 0) {
      filter.habitId = { $in: habitIds };
    }

    // Get completions with habit data
    const completions = await HabitCompletion.find(filter)
      .populate('habitId', 'name goalType targetCount')
      .sort({ date: -1 })
      .lean();

    const completionsData = completions.map((completion: any) => ({
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
      error: 'Failed to fetch completions'
    });
  }
};

export const getCalendarData = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const yearNum = parseInt(year as string);
    const monthNum = parseInt(month as string) - 1; // JavaScript months are 0-indexed

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 0 || monthNum > 11) {
      res.status(400).json({
        success: false,
        error: 'Invalid year or month'
      });
      return;
    }

    // Get user's active habits
    const habits = await Habit.find({ 
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

    // Get start and end of month in user's timezone
    const monthStart = new Date(yearNum, monthNum, 1);
    const monthEnd = new Date(yearNum, monthNum + 1, 0); // Last day of month

    // Get completions for the month
    const completions = await HabitCompletion.find({
      userId: req.user.id,
      habitId: { $in: habitIds },
      date: {
        $gte: startOfDay(monthStart),
        $lte: endOfDay(monthEnd)
      }
    }).populate('habitId', 'name goalType targetCount')
      .sort({ date: 1 })
      .lean();

    // Group completions by date
    const completionsByDate = new Map();
    completions.forEach((completion: any) => {
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

    // Build calendar days
    const days = [];
    const daysInMonth = monthEnd.getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(yearNum, monthNum, day);
      const dateKey = date.toISOString().split('T')[0];
      const dayCompletions = completionsByDate.get(dateKey) || [];

      // Calculate completion status for each habit
      const habitStatuses = habits.map(habit => {
        const habitCompletions = dayCompletions.filter((c: any) => c.habitId === habit._id.toString());
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
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calendar data'
    });
  }
};