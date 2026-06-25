import { Habit } from '../models/Habit';
import { HabitCompletion } from '../models/HabitCompletion';
import { User } from '../models/User';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { DatabaseError } from '../utils/errorHandler';

// Cache for frequently accessed data
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  keys(): IterableIterator<string> {
    return this.cache.keys();
  }

  get size(): number {
    return this.cache.size;
  }

  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

export class DatabaseService {
  private cache = new MemoryCache();

  constructor() {
    // Cleanup cache every 10 minutes
    setInterval(() => this.cache.cleanup(), 10 * 60 * 1000);
  }

  // User operations with caching
  async getUserById(userId: string): Promise<any> {
    const cacheKey = `user:${userId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) return cached;

    try {
      const user = await User.findById(userId).lean();
      if (user) {
        this.cache.set(cacheKey, user, 10 * 60 * 1000); // 10 minutes
      }
      return user;
    } catch (error) {
      throw new DatabaseError('Failed to fetch user');
    }
  }

  // Habit operations with optimized queries
  async getUserHabits(userId: string, options: {
    active?: boolean;
    goalType?: string;
    limit?: number;
    skip?: number;
    sortBy?: string;
    sortOrder?: 1 | -1;
  } = {}): Promise<{ habits: any[]; total: number }> {
    const cacheKey = `habits:${userId}:${JSON.stringify(options)}`;
    const cached = this.cache.get<{ habits: any[]; total: number }>(cacheKey);
    
    if (cached) return cached;

    try {
      const query: any = { userId };
      
      if (options.active !== undefined) {
        query.active = options.active;
      }
      
      if (options.goalType) {
        query.goalType = options.goalType;
      }

      const sort: any = {};
      if (options.sortBy) {
        sort[options.sortBy] = options.sortOrder || -1;
      } else {
        sort.createdAt = -1;
      }

      const [habits, total] = await Promise.all([
        Habit.find(query)
          .sort(sort)
          .limit(options.limit || 20)
          .skip(options.skip || 0)
          .lean(),
        Habit.countDocuments(query)
      ]);

      const result = { habits, total };
      this.cache.set(cacheKey, result, 2 * 60 * 1000); // 2 minutes
      return result;
    } catch (error) {
      throw new DatabaseError('Failed to fetch habits');
    }
  }

  // Completion operations with date optimization
  async getCompletionsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
    habitIds?: string[]
  ): Promise<any[]> {
    const cacheKey = `completions:${userId}:${startDate.toISOString()}:${endDate.toISOString()}:${habitIds?.join(',') || 'all'}`;
    const cached = this.cache.get<any[]>(cacheKey);
    
    if (cached) return cached;

    try {
      const query: any = {
        userId,
        date: {
          $gte: startOfDay(startDate),
          $lte: endOfDay(endDate)
        }
      };

      if (habitIds && habitIds.length > 0) {
        query.habitId = { $in: habitIds };
      }

      const completions = await HabitCompletion.find(query)
        .sort({ date: -1, completedAt: -1 })
        .lean();

      this.cache.set(cacheKey, completions, 3 * 60 * 1000); // 3 minutes
      return completions;
    } catch (error) {
      throw new DatabaseError('Failed to fetch completions');
    }
  }

  // Calendar data optimized for a single month
  async getCalendarData(userId: string, year: number, month: number): Promise<any> {
    const cacheKey = `calendar:${userId}:${year}:${month}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) return cached;

    try {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0); // Last day of month

      // Get user's active habits
      const habits = await Habit.find({ userId, active: true })
        .select('_id name goalType targetCount')
        .lean();

      if (habits.length === 0) {
        return { habits: [], days: [], year, month };
      }

      // Get all completions for the month
      const completions = await HabitCompletion.find({
        userId,
        habitId: { $in: habits.map(h => h._id) },
        date: { $gte: monthStart, $lte: monthEnd }
      })
      .lean();

      // Group completions by date and habit
      const completionMap = new Map<string, Map<string, any[]>>();
      
      completions.forEach(completion => {
        const dateKey = completion.date.toISOString().split('T')[0];
        if (!completionMap.has(dateKey)) {
          completionMap.set(dateKey, new Map());
        }
        
        const habitMap = completionMap.get(dateKey)!;
        const habitId = completion.habitId.toString();
        if (!habitMap.has(habitId)) {
          habitMap.set(habitId, []);
        }
        
        habitMap.get(habitId)!.push(completion);
      });

      // Build calendar days
      const days = [];
      const currentDate = new Date(monthStart);
      
      while (currentDate <= monthEnd) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const dayCompletions = completionMap.get(dateKey) || new Map();
        
        const habitStatuses = habits.map(habit => {
          const habitCompletions = dayCompletions.get(habit._id.toString()) || [];
          const completionCount = habitCompletions.length;
          
          return {
            habitId: habit._id.toString(),
            habitName: habit.name,
            goalType: habit.goalType,
            targetCount: habit.targetCount,
            isCompleted: completionCount >= habit.targetCount,
            completionCount,
            completions: habitCompletions
          };
        });

        days.push({
          date: dateKey,
          day: currentDate.getDate(),
          isToday: this.isToday(currentDate),
          isPast: this.isPast(currentDate),
          totalHabits: habits.length,
          completedHabits: habitStatuses.filter(h => h.isCompleted).length,
          habitStatuses
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      const result = {
        year,
        month,
        habits: habits.map(h => ({
          id: h._id.toString(),
          name: h.name,
          goalType: h.goalType,
          targetCount: h.targetCount
        })),
        days
      };

      this.cache.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes
      return result;
    } catch (error) {
      throw new DatabaseError('Failed to fetch calendar data');
    }
  }

  // Analytics data with smart caching
  async getAnalyticsData(userId: string): Promise<any> {
    const cacheKey = `analytics:${userId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) return cached;

    try {
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);

      // Parallel queries for better performance
      const [
        habits,
        weekCompletions,
        monthCompletions
      ] = await Promise.all([
        Habit.find({ userId, active: true }).lean(),
        HabitCompletion.find({
          userId,
          date: { $gte: weekStart, $lte: weekEnd }
        }).lean(),
        HabitCompletion.find({
          userId,
          date: { $gte: monthStart, $lte: monthEnd }
        }).lean()
      ]);

      const result = {
        habits,
        weekCompletions,
        monthCompletions,
        weekStart,
        weekEnd,
        monthStart,
        monthEnd
      };

      this.cache.set(cacheKey, result, 10 * 60 * 1000); // 10 minutes
      return result;
    } catch (error) {
      throw new DatabaseError('Failed to fetch analytics data');
    }
  }

  // Streak calculation with optimized data fetching
  async getStreakData(habitId: string): Promise<any[]> {
    const cacheKey = `streak:${habitId}`;
    const cached = this.cache.get<any[]>(cacheKey);
    
    if (cached) return cached;

    try {
      const completions = await HabitCompletion.find({ habitId })
        .sort({ date: 1 }) // Oldest first for streak calculation
        .select('date completedAt')
        .lean();

      this.cache.set(cacheKey, completions, 15 * 60 * 1000); // 15 minutes
      return completions;
    } catch (error) {
      throw new DatabaseError('Failed to fetch streak data');
    }
  }

  // Bulk operations for better performance
  async createMultipleCompletions(completions: Array<{
    userId: string;
    habitId: string;
    date: Date;
    completedAt?: Date;
  }>): Promise<any[]> {
    try {
      const docs = completions.map(c => ({
        ...c,
        completedAt: c.completedAt || new Date(),
        date: startOfDay(c.date)
      }));

      const result = await HabitCompletion.insertMany(docs, { ordered: false });
      
      // Invalidate relevant caches
      completions.forEach(c => {
        this.cache.delete(`calendar:${c.userId}:${new Date(c.date).getFullYear()}:${new Date(c.date).getMonth() + 1}`);
        this.cache.delete(`analytics:${c.userId}`);
      });
      
      return result;
    } catch (error) {
      throw new DatabaseError('Failed to create completions');
    }
  }

  // Cache invalidation helpers
  invalidateUserCache(userId: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  invalidateHabitCache(habitId: string, userId: string): void {
    this.cache.delete(`streak:${habitId}`);
    this.cache.delete(`analytics:${userId}`);
    // Calendar cache will be invalidated when completions are created
  }

  // Performance monitoring
  async getDatabaseStats(): Promise<any> {
    try {
      const [userCount, habitCount, completionCount] = await Promise.all([
        User.countDocuments(),
        Habit.countDocuments(),
        HabitCompletion.countDocuments()
      ]);

      return {
        users: userCount,
        habits: habitCount,
        completions: completionCount,
        cacheSize: this.cache.size
      };
    } catch (error) {
      throw new DatabaseError('Failed to fetch database stats');
    }
  }

  // Helper methods
  private isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  private isPast(date: Date): boolean {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date < today;
  }
}

export const dbService = new DatabaseService();