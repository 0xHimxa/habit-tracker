export type GoalType = 'daily' | 'weekly' | 'monthly';
export type GoalLevel = 'standalone' | 'month' | 'week' | 'day';

export interface GoalPeriod {
  year?: number;
  month?: number;       // 1–12
  weekOfMonth?: number; // 1–6
  daysOfWeek?: number[]; // 0=Sun … 6=Sat
  date?: string | Date;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  timezone: string;
  createdAt: Date;
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  description?: string;
  goalType: GoalType;
  targetCount: number;
  startDate: Date;
  active: boolean;
  // Hierarchy
  level: GoalLevel;
  parentId?: string | null;
  period?: GoalPeriod | null;
  // Streaks (populated by API)
  currentStreak?: number;
  longestStreak?: number;
  lastCompletedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** A Habit node with its children attached (returned by /goals and /tree) */
export interface GoalNode extends Habit {
  children: GoalNode[];
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  userId: string;
  date: Date;
  completedAt: Date;
  createdAt: Date;
  habit?: {
    name: string;
    goalType: GoalType;
    targetCount: number;
  };
}

export interface CalendarDay {
  date: string;
  day: number;
  isToday: boolean;
  isPast: boolean;
  totalHabits: number;
  completedHabits: number;
  habitStatuses: HabitStatus[];
}

export interface HabitStatus {
  habitId: string;
  habitName: string;
  goalType: GoalType;
  targetCount: number;
  isCompleted: boolean;
  completionCount: number;
  completions: HabitCompletion[];
}

export interface CalendarData {
  year: number;
  month: number;
  habits: Array<{
    id: string;
    name: string;
    goalType: GoalType;
    targetCount: number;
  }>;
  days: CalendarDay[];
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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CreateHabitInput {
  name: string;
  description?: string;
  goalType: GoalType;
  targetCount: number;
  startDate?: string;
  // Hierarchy
  level?: GoalLevel;
  parentId?: string;
  period?: Omit<GoalPeriod, 'dateRange'>;
}

export interface AutoBreakdownInput {
  weeks: number;
  dailyTarget: number;
  daysOfWeek: number[];
}

export interface ManualDayInput {
  name: string;
  description?: string;
  daysOfWeek: number[];
  dailyTarget: number;
  date?: string;
}

export interface ManualWeekInput {
  name: string;
  description?: string;
  weekOfMonth: number;
  weeklyTarget?: number;
  dateRange?: { start: string; end: string };
  days: ManualDayInput[];
}

export interface ManualBreakdownInput {
  weeks: ManualWeekInput[];
}

export interface GoalCompletionCounts {
  counts: Record<string, number>;
  streaks: Record<string, { currentStreak: number; longestStreak: number }>;
}


export interface UpdateHabitInput {
  name?: string;
  description?: string;
  goalType?: GoalType;
  targetCount?: number;
  active?: boolean;
  period?: Omit<GoalPeriod, 'dateRange'>;
}

export interface CreateCompletionInput {
  habitId: string;
  date?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  email: string;
  password: string;
  name: string;
  timezone?: string;
}
