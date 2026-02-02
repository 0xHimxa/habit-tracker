export type GoalType = 'daily' | 'weekly' | 'monthly';

export interface Habit {
  id: string;
  userId: string;
  name: string;
  description?: string;
  goalType: GoalType;
  targetCount: number;
  startDate: Date;
  active: boolean;
  currentStreak?: number;
  longestStreak?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHabitInput {
  name: string;
  description?: string;
  goalType: GoalType;
  targetCount: number;
  startDate?: Date;
}

export interface UpdateHabitInput {
  name?: string;
  description?: string;
  goalType?: GoalType;
  targetCount?: number;
  active?: boolean;
}

export interface HabitWithCompletions extends Habit {
  completions: HabitCompletion[];
  completionRate?: number;
}

export interface HabitCompletion {
  id: string;
  userId: string;
  habitId: string;
  completedAt: Date;
  date: Date;
  createdAt: Date;
}

export interface CreateCompletionInput {
  habitId: string;
  date?: Date;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate?: Date;
}

export interface HabitAnalytics {
  totalDays: number;
  completedDays: number;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  thisWeekCompletions: number;
  thisMonthCompletions: number;
}