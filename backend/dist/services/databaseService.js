"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbService = exports.DatabaseService = void 0;
const Habit_1 = require("../models/Habit");
const HabitCompletion_1 = require("../models/HabitCompletion");
const User_1 = require("../models/User");
const date_fns_1 = require("date-fns");
const errorHandler_1 = require("../utils/errorHandler");
class MemoryCache {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = 5 * 60 * 1000;
    }
    set(key, data, ttl = this.defaultTTL) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    delete(key) {
        this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
    keys() {
        return this.cache.keys();
    }
    get size() {
        return this.cache.size;
    }
    cleanup() {
        const now = Date.now();
        const keysToDelete = [];
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.cache.delete(key));
    }
}
class DatabaseService {
    constructor() {
        this.cache = new MemoryCache();
        setInterval(() => this.cache.cleanup(), 10 * 60 * 1000);
    }
    async getUserById(userId) {
        const cacheKey = `user:${userId}`;
        const cached = this.cache.get(cacheKey);
        if (cached)
            return cached;
        try {
            const user = await User_1.User.findById(userId).lean();
            if (user) {
                this.cache.set(cacheKey, user, 10 * 60 * 1000);
            }
            return user;
        }
        catch (error) {
            throw new errorHandler_1.DatabaseError('Failed to fetch user');
        }
    }
    async getUserHabits(userId, options = {}) {
        const cacheKey = `habits:${userId}:${JSON.stringify(options)}`;
        const cached = this.cache.get(cacheKey);
        if (cached)
            return cached;
        try {
            const query = { userId };
            if (options.active !== undefined) {
                query.active = options.active;
            }
            if (options.goalType) {
                query.goalType = options.goalType;
            }
            const sort = {};
            if (options.sortBy) {
                sort[options.sortBy] = options.sortOrder || -1;
            }
            else {
                sort.createdAt = -1;
            }
            const [habits, total] = await Promise.all([
                Habit_1.Habit.find(query)
                    .sort(sort)
                    .limit(options.limit || 20)
                    .skip(options.skip || 0)
                    .lean(),
                Habit_1.Habit.countDocuments(query)
            ]);
            const result = { habits, total };
            this.cache.set(cacheKey, result, 2 * 60 * 1000);
            return result;
        }
        catch (error) {
            throw new errorHandler_1.DatabaseError('Failed to fetch habits');
        }
    }
    async getCompletionsByDateRange(userId, startDate, endDate, habitIds) {
        const cacheKey = `completions:${userId}:${startDate.toISOString()}:${endDate.toISOString()}:${habitIds?.join(',') || 'all'}`;
        const cached = this.cache.get(cacheKey);
        if (cached)
            return cached;
        try {
            const query = {
                userId,
                date: {
                    $gte: (0, date_fns_1.startOfDay)(startDate),
                    $lte: (0, date_fns_1.endOfDay)(endDate)
                }
            };
            if (habitIds && habitIds.length > 0) {
                query.habitId = { $in: habitIds };
            }
            const completions = await HabitCompletion_1.HabitCompletion.find(query)
                .sort({ date: -1, completedAt: -1 })
                .lean();
            this.cache.set(cacheKey, completions, 3 * 60 * 1000);
            return completions;
        }
        catch (error) {
            throw new errorHandler_1.DatabaseError('Failed to fetch completions');
        }
    }
    async getCalendarData(userId, year, month) {
        const cacheKey = `calendar:${userId}:${year}:${month}`;
        const cached = this.cache.get(cacheKey);
        if (cached)
            return cached;
        try {
            const monthStart = new Date(year, month - 1, 1);
            const monthEnd = new Date(year, month, 0);
            const habits = await Habit_1.Habit.find({ userId, active: true })
                .select('_id name goalType targetCount')
                .lean();
            if (habits.length === 0) {
                return { habits: [], days: [], year, month };
            }
            const completions = await HabitCompletion_1.HabitCompletion.find({
                userId,
                habitId: { $in: habits.map(h => h._id) },
                date: { $gte: monthStart, $lte: monthEnd }
            })
                .lean();
            const completionMap = new Map();
            completions.forEach(completion => {
                const dateKey = completion.date.toISOString().split('T')[0];
                if (!completionMap.has(dateKey)) {
                    completionMap.set(dateKey, new Map());
                }
                const habitMap = completionMap.get(dateKey);
                const habitId = completion.habitId.toString();
                if (!habitMap.has(habitId)) {
                    habitMap.set(habitId, []);
                }
                habitMap.get(habitId).push(completion);
            });
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
            this.cache.set(cacheKey, result, 5 * 60 * 1000);
            return result;
        }
        catch (error) {
            throw new errorHandler_1.DatabaseError('Failed to fetch calendar data');
        }
    }
    async getAnalyticsData(userId) {
        const cacheKey = `analytics:${userId}`;
        const cached = this.cache.get(cacheKey);
        if (cached)
            return cached;
        try {
            const today = new Date();
            const weekStart = (0, date_fns_1.startOfWeek)(today, { weekStartsOn: 1 });
            const weekEnd = (0, date_fns_1.endOfWeek)(today, { weekStartsOn: 1 });
            const monthStart = (0, date_fns_1.startOfMonth)(today);
            const monthEnd = (0, date_fns_1.endOfMonth)(today);
            const [habits, weekCompletions, monthCompletions] = await Promise.all([
                Habit_1.Habit.find({ userId, active: true }).lean(),
                HabitCompletion_1.HabitCompletion.find({
                    userId,
                    date: { $gte: weekStart, $lte: weekEnd }
                }).lean(),
                HabitCompletion_1.HabitCompletion.find({
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
            this.cache.set(cacheKey, result, 10 * 60 * 1000);
            return result;
        }
        catch (error) {
            throw new errorHandler_1.DatabaseError('Failed to fetch analytics data');
        }
    }
    async getStreakData(habitId) {
        const cacheKey = `streak:${habitId}`;
        const cached = this.cache.get(cacheKey);
        if (cached)
            return cached;
        try {
            const completions = await HabitCompletion_1.HabitCompletion.find({ habitId })
                .sort({ date: 1 })
                .select('date completedAt')
                .lean();
            this.cache.set(cacheKey, completions, 15 * 60 * 1000);
            return completions;
        }
        catch (error) {
            throw new errorHandler_1.DatabaseError('Failed to fetch streak data');
        }
    }
    async createMultipleCompletions(completions) {
        try {
            const docs = completions.map(c => ({
                ...c,
                completedAt: c.completedAt || new Date(),
                date: (0, date_fns_1.startOfDay)(c.date)
            }));
            const result = await HabitCompletion_1.HabitCompletion.insertMany(docs, { ordered: false });
            completions.forEach(c => {
                this.cache.delete(`calendar:${c.userId}:${new Date(c.date).getFullYear()}:${new Date(c.date).getMonth() + 1}`);
                this.cache.delete(`analytics:${c.userId}`);
            });
            return result;
        }
        catch (error) {
            throw new errorHandler_1.DatabaseError('Failed to create completions');
        }
    }
    invalidateUserCache(userId) {
        const keysToDelete = [];
        for (const key of this.cache.keys()) {
            if (key.includes(userId)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.cache.delete(key));
    }
    invalidateHabitCache(habitId, userId) {
        this.cache.delete(`streak:${habitId}`);
        this.cache.delete(`analytics:${userId}`);
    }
    async getDatabaseStats() {
        try {
            const [userCount, habitCount, completionCount] = await Promise.all([
                User_1.User.countDocuments(),
                Habit_1.Habit.countDocuments(),
                HabitCompletion_1.HabitCompletion.countDocuments()
            ]);
            return {
                users: userCount,
                habits: habitCount,
                completions: completionCount,
                cacheSize: this.cache.size
            };
        }
        catch (error) {
            throw new errorHandler_1.DatabaseError('Failed to fetch database stats');
        }
    }
    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }
    isPast(date) {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return date < today;
    }
}
exports.DatabaseService = DatabaseService;
exports.dbService = new DatabaseService();
//# sourceMappingURL=databaseService.js.map